#!/usr/bin/env node
import http from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { messageText, recentMessages, normalizeSuggestion, predictNextPrompt, detectLanguage, detectConversationLanguage, buildSystem } from '../lib/predict.mjs';
import { apply } from '../lib/index.js';
import { makeT, normalizeLang, listSeparator, MESSAGES } from '../lib/messages.mjs';

// 设置写入走 DSH_HOME，测试必须隔离到临时目录，避免污染真实配置。
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-prompt-predict-test-'));

const results = [];
function check(name, ok, evidence = '') {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${evidence ? `: ${evidence}` : ''}`);
}

const mixed = {
  role: 'assistant',
  content: [
    { type: 'text', text: '第一段' },
    { type: 'tool-call', name: 'x' },
    { type: 'text', text: '第二段' },
  ],
};
check('只抽取文本块', messageText(mixed) === '第一段\n第二段', messageText(mixed));

const recent = recentMessages([
  { role: 'system', content: [{ type: 'text', text: '系统' }] },
  { role: 'user', content: [{ type: 'text', text: '问题一' }] },
  { role: 'tool', content: [{ type: 'text', text: '工具' }] },
  { role: 'assistant', content: [{ type: 'text', text: '回答一' }] },
  { role: 'user', content: [{ type: 'text', text: '问题二' }] },
], { maxMessages: 2, maxChars: 100 });
check('只保留最近 user/assistant', JSON.stringify(recent) === JSON.stringify([{ role: 'assistant', text: '回答一' }, { role: 'user', text: '问题二' }]), JSON.stringify(recent));

check('清理建议包装', normalizeSuggestion('```text\n建议：继续完成安装并跑测试\n```') === '继续完成安装并跑测试', normalizeSuggestion('```text\n建议：继续完成安装并跑测试\n```'));

let captured;
let streamCalls = [];
let failWhenEffort = false;
let variant = 0;
let finishKind = 'stop';   // 模拟 finish.reason.kind：'stop' | 'max-tokens'
let truncateNext = false;  // 让下一次调用返回「被输出上限截断」的半句
const fakeSession = {
  id: 'session-test',
  requestHeader: () => ({ config: { provider: 'provider-current', model: 'model-current' } }),
  deriveMessages: () => [
    { role: 'user', content: [{ type: 'text', text: '帮我写插件' }] },
    { role: 'assistant', content: [{ type: 'text', text: '技术验证通过，可以开始实现。' }] },
  ],
};
// 第二个会话专门用来测「去重 / reroll」：它们依赖「上一条建议」的记忆，用独立会话避免污染主流程
const fakeSession2 = { ...fakeSession, id: 'session-dedupe' };
// 干净会话：专门测「截断后放宽重试」，避免被「上一条建议」的去重记忆干扰
const fakeSession3 = { ...fakeSession, id: 'session-widen' };
const fakeCtx = {
  agentDefaultModel: { currentSelection: () => ({ provider: 'provider-default', model: 'model-default' }) },
  llm: {
    async *stream(options) {
      captured = options;
      streamCalls.push(options);
      // 模拟「档位不被模型支持」：带 reasoningEffort 就失败，用于验证降级重试
      if (failWhenEffort && options.reasoningEffort) {
        throw new Error('reasoning effort not supported by this model');
      }
      const prompt = options.messages?.[0]?.content?.[0]?.text ?? '';
      // 带「必须换一条」提示（去重 / reroll）时换一条（两个变体轮换，模拟「换了个说法」），
      // 否则固定返回同一条 —— 用来制造「复读」以验证去重
      let text = '"继续，直接实现并安装插件"';
      if (/Give a DIFFERENT suggestion/.test(prompt)) {
        variant += 1;
        text = variant % 2 ? '"换个思路：先补测试再实现"' : '"先把边界情况列个清单"';
      }
      yield { type: 'block-start', block: { type: 'text' } };
      if (truncateNext) {
        truncateNext = false;
        yield { type: 'text-delta', text: '"继续，直接实现' };
        yield { type: 'finish', reason: { kind: 'max-tokens' } };
        return;
      }
      yield { type: 'text-delta', text };
      yield { type: 'finish', reason: { kind: finishKind } };
    },
    listProviders() {
      return [
        { id: 'provider-a', name: 'Provider A' },
        { id: 'provider-effort', name: 'Provider Effort' },
        { id: 'broken', name: 'Broken' },
      ];
    },
    async listModels(provider) {
      if (provider === 'provider-a') return [{ id: 'model-a' }, { id: 'model-b' }];
      if (provider === 'provider-effort') return [{ id: 'model-r' }];
      if (provider === 'broken') throw new Error('provider unavailable');
      return [];
    },
    async resolveModelInfo(provider) {
      if (provider === 'provider-effort') return { reasoning: { efforts: [{ id: 'off' }, { id: 'high' }] } };
      return {};
    },
  },
};
// issue #1：提示词必须用英文写，并明确点名「对话语言」，否则非中文对话也会返回中文
check('语言识别：俄语/中文/英文/空值',
  ['Привет, помоги с плагином', '帮我改一下这个插件', 'help me fix this plugin', '']
    .map((text) => detectLanguage(text)).join(',') === 'Russian,Chinese,English,English',
  ['Привет, помоги с плагином', '帮我改一下这个插件', 'help me fix this plugin', '']
    .map((text) => detectLanguage(text)).join(','));
// 整段对话按「逐条用户消息多数票」判定：粘一段英文日志不该把俄语对话判成英文
check('混合上下文按多数票判定语言',
  detectConversationLanguage([
    { role: 'user', text: 'Привет, помоги разобраться' },
    { role: 'assistant', text: 'Sure, what is wrong?' },
    { role: 'user', text: 'Вот лог: Error: ENOENT no such file' },
    { role: 'user', text: 'Что делать?' },
  ]) === 'Russian',
  detectConversationLanguage([
    { role: 'user', text: 'Привет, помоги разобраться' },
    { role: 'user', text: 'Вот лог: Error: ENOENT no such file' },
    { role: 'user', text: 'Что делать?' },
  ]));

check('默认系统提示不含中文', !/[\u4e00-\u9fff]/.test(buildSystem('Russian')), buildSystem('Russian').slice(0, 60));
check('系统提示明确点名语言', /in Russian/.test(buildSystem('Russian')) && /in Chinese/.test(buildSystem('Chinese')));

const predicted = await predictNextPrompt(fakeCtx, fakeSession, { maxTokens: 48 });
check('生成并归一化建议', predicted.suggestion === '继续，直接实现并安装插件', predicted.suggestion);
check('继承当前会话模型路由', captured.provider === 'provider-current' && captured.model === 'model-current', `${captured.provider}/${captured.model}`);
check('限制输出 token', captured.maxTokens === 48, String(captured.maxTokens));
// 中文会话：识别为 Chinese，system 与 framing 都不该是「因为提示词是中文」而让模型写中文
check('中文会话识别为 Chinese', predicted.language === 'Chinese', String(predicted.language));
check('请求里的 system 点名 Chinese', /in Chinese/.test(captured.system ?? ''), (captured.system ?? '').slice(0, 60));
check('framing 用英文并点名语言', /Predict the user's next message in Chinese/.test(captured.messages?.[0]?.content?.[0]?.text ?? ''), '');
check('标记辅助调用用途', captured.purpose === 'prompt-prediction' && captured.sessionId === 'session-test', `${captured.purpose}/${captured.sessionId}`);
// 输出上限截断（finish.reason.kind === 'max-tokens'）与默认上限：新增调用会覆盖 captured，测完还原
const optionsBeforeExtras = captured;
finishKind = 'max-tokens';
const cutRun = await predictNextPrompt(fakeCtx, fakeSession, { maxTokens: 16 });
finishKind = 'stop';
const defaultRun = await predictNextPrompt(fakeCtx, fakeSession);
const defaultCap = captured.maxTokens;
captured = optionsBeforeExtras;
// i18n：模型用其它语言写的前缀也要剥掉（否则 ghost 里会带着「Suggestion:」）
check('剥掉六种语言的「建议：」前缀',
  ['建议：先补测试', 'Suggestion: add a test', 'Prédiction : écrire un test',
   'Предложение: напиши тест', 'Predicción: escribe un test', 'الاقتراح: اكتب اختبارًا']
    .map((text) => normalizeSuggestion(text)).join('|') === '先补测试|add a test|écrire un test|напиши тест|escribe un test|اكتب اختبارًا',
  ['建议：先补测试', 'Suggestion: add a test', 'Prédiction : écrire un test',
   'Предложение: напиши тест', 'Predicción: escribe un test', 'الاقتراح: اكتب اختبارًا']
    .map((text) => normalizeSuggestion(text)).join('|'));

check('正常结束时 truncated=false', predicted.truncated === false, `truncated=${predicted.truncated}`);
check('finish=max-tokens 时标记 truncated', cutRun.truncated === true && defaultRun.truncated === false,
  `截断=${cutRun.truncated} 正常=${defaultRun.truncated}`);
check('默认输出上限为 256 token', defaultCap === 256, `默认=${defaultCap}`);

// Host 路由端到端（本地 HTTP）
let route;
let cleaned = false;
const cleanups = [];
const ctx = {
  sessions: { get: (id) => (id === 'session-test' ? fakeSession : id === 'session-dedupe' ? fakeSession2 : id === 'session-widen' ? fakeSession3 : undefined) },
  llm: fakeCtx.llm,
  agentDefaultModel: fakeCtx.agentDefaultModel,
  connection: { requestRejection: () => undefined },
  webServer: { register: (value) => { route = value; return () => { cleaned = true; }; } },
  effect(fn) { const cleanup = fn(); if (typeof cleanup === 'function') cleanups.push(cleanup); },
};
apply(ctx, { timeoutMs: 3000 });
check('注册 Host 前缀路由', route?.kind === 'prefix' && route.path === '/dsh-prompt-predict', `${route?.kind} ${route?.path}`);
check('登记 effect 清理函数', cleanups.length === 1, String(cleanups.length));

const server = http.createServer((req, res) => route.handler(req, res));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
function request(path, method = 'GET', body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = Object.assign({}, extraHeaders);
    if (payload) { headers['content-type'] = 'application/json'; headers['content-length'] = Buffer.byteLength(payload); }
    const r = http.request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}
const status = await request('/dsh-prompt-predict/status');
check('状态接口返回结构', status.status === 200
  && status.json.current?.model === 'model-default'
  && status.json.effective?.provider === 'auto'
  && status.json.effective?.enabled === true, JSON.stringify(status.json.effective ?? status.json));
const suggestion = await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
check('建议接口返回预测', suggestion.status === 200 && suggestion.json.suggestion === '继续，直接实现并安装插件', JSON.stringify(suggestion.json));
check('建议响应带上会话标识', suggestion.json.sessionId === 'session-test', String(suggestion.json.sessionId));
check('默认跟随当前会话模型', captured.provider === 'provider-current' && captured.model === 'model-current', `${captured.provider}/${captured.model}`);
// 输出上限截断时，路由要自动放宽上限重问一次，最终返回完整建议而不是半句
const callsBeforeWiden = streamCalls.length;
truncateNext = true;
const widened = await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-widen' });
check('截断时自动放宽上限重试',
  widened.json.ok === true
  && /直接实现并安装插件/.test(String(widened.json.suggestion))
  && widened.json.truncated === false
  && streamCalls.length - callsBeforeWiden >= 2,
  `suggestion=${widened.json.suggestion} truncated=${widened.json.truncated} 调用=${streamCalls.length - callsBeforeWiden}`);

const bad = await request('/dsh-prompt-predict/suggest', 'POST', {});
check('缺 sessionId → 400', bad.status === 400, `${bad.status}`);

// 设置页：模型选择、校验与思考深度
const catalog = await request('/dsh-prompt-predict/catalog');
check('模型目录接口返回分组', catalog.status === 200 && Array.isArray(catalog.json.groups)
  && catalog.json.groups.some((g) => g.id === 'provider-a' && g.models.length === 2), JSON.stringify((catalog.json.groups ?? []).map((g) => g.id)));

const switchModel = await request('/dsh-prompt-predict/settings', 'POST', { provider: 'provider-a', model: 'model-b' });
check('切换模型并保存', switchModel.status === 200 && switchModel.json.ok === true
  && switchModel.json.effective.provider === 'provider-a' && switchModel.json.effective.model === 'model-b'
  && switchModel.json.saved.model === 'model-b', JSON.stringify(switchModel.json.effective));

const suggestionWithSaved = await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
check('预测使用页面保存的模型', captured.provider === 'provider-a' && captured.model === 'model-b', `${captured.provider}/${captured.model}`);

const unknownModel = await request('/dsh-prompt-predict/settings', 'POST', { provider: 'provider-a', model: 'nope' });
check('模型不存在时拒绝保存', unknownModel.json.ok === false && /没有模型/.test(unknownModel.json.reason ?? ''), String(unknownModel.json.reason));

const brokenProvider = await request('/dsh-prompt-predict/settings', 'POST', { provider: 'broken', model: 'x' });
check('provider 不可用时拒绝保存', brokenProvider.json.ok === false, String(brokenProvider.json.reason));

const goodEffort = await request('/dsh-prompt-predict/settings', 'POST', { provider: 'provider-effort', model: 'model-r', reasoningEffort: 'high' });
check('保存模型支持的思考深度', goodEffort.json.ok === true && goodEffort.json.effective.reasoningEffort === 'high', String(goodEffort.json.effective?.reasoningEffort));
const effortPassedThrough = await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
check('思考深度传入模型调用', captured.reasoningEffort === 'high', String(captured.reasoningEffort));

const badEffort = await request('/dsh-prompt-predict/settings', 'POST', { provider: 'provider-effort', model: 'model-r', reasoningEffort: 'low' });
check('模型不支持的思考深度被拒绝', badEffort.json.ok === false && /不支持思考深度/.test(badEffort.json.reason ?? ''), String(badEffort.json.reason));

const autoEffort = await request('/dsh-prompt-predict/settings', 'POST', { reasoningEffort: 'auto' });
check('「跟随模型默认」保存为 auto', autoEffort.json.ok === true && autoEffort.json.effective.reasoningEffort === 'auto', String(autoEffort.json.effective?.reasoningEffort));
await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
check('auto 不向模型传思考深度', captured.reasoningEffort === undefined, String(captured.reasoningEffort));

const autoRoute = await request('/dsh-prompt-predict/settings', 'POST', { provider: 'auto', model: 'auto' });
check('切回「跟随当前会话模型」', autoRoute.json.ok === true
  && autoRoute.json.effective.provider === 'auto' && autoRoute.json.effective.model === 'auto', JSON.stringify(autoRoute.json.effective));
await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
check('auto 路由继承当前会话模型', captured.provider === 'provider-current' && captured.model === 'model-current', `${captured.provider}/${captured.model}`);

const effortOnAuto = await request('/dsh-prompt-predict/settings', 'POST', { reasoningEffort: 'off' });
check('跟随会话模型时不按固定模型拦思考深度', effortOnAuto.json.ok === true && effortOnAuto.json.effective.reasoningEffort === 'off', String(effortOnAuto.json.reason ?? effortOnAuto.json.effective?.reasoningEffort));

// 记录条数（客户端历史列表的上限）：默认 10，可调 1–50
const historyDefault = await request('/dsh-prompt-predict/status');
check('记录条数默认 10', historyDefault.json.effective?.historySize === 10, String(historyDefault.json.effective?.historySize));
const historySet = await request('/dsh-prompt-predict/settings', 'POST', { historySize: 5 });
check('记录条数可调整', historySet.json.ok === true && historySet.json.effective.historySize === 5, String(historySet.json.effective?.historySize));
const historyBad = await request('/dsh-prompt-predict/settings', 'POST', { historySize: 0 });
check('记录条数越界被拒', historyBad.json.ok === false && /1–50|1-50/.test(String(historyBad.json.reason)), String(historyBad.json.reason));
await request('/dsh-prompt-predict/settings', 'POST', { historySize: 10 });

// 建议语言：默认 auto（跟随对话），可以固定成某种语言
const langDefault = await request('/dsh-prompt-predict/status');
check('status 返回语言候选清单', Array.isArray(langDefault.json.languages) && langDefault.json.languages.includes('ru') && langDefault.json.languages.length >= 40,
  String((langDefault.json.languages || []).length));
check('建议语言默认 auto', langDefault.json.effective?.suggestionLanguage === 'auto',
  String(langDefault.json.effective?.suggestionLanguage));
const langSet = await request('/dsh-prompt-predict/settings', 'POST', { suggestionLanguage: 'ru' });
check('建议语言可固定为 ru', langSet.json.ok === true && langSet.json.effective.suggestionLanguage === 'ru',
  String(langSet.json.reason ?? langSet.json.effective?.suggestionLanguage));
await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
check('固定语言后提示词按该语言书写（不看对话内容）',
  /in Russian/.test(captured.system ?? '') && /in Russian/.test(captured.messages?.[0]?.content?.[0]?.text ?? ''),
  (captured.system ?? '').slice(0, 40));
// 清单之外的合法代码（乌克兰语）同样要能用：不限定固定几种
const langExtra = await request('/dsh-prompt-predict/settings', 'POST', { suggestionLanguage: 'uk' });
check('清单外的合法语言（uk）也能固定', langExtra.json.ok === true && langExtra.json.effective.suggestionLanguage === 'uk',
  String(langExtra.json.reason ?? langExtra.json.effective?.suggestionLanguage));
await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
check('uk 的提示词语言名正确', /in Ukrainian/.test(captured.system ?? ''), (captured.system ?? '').slice(0, 40));
// 繁体中文要明确到地区，否则模型会随机挑字形
for (const [code, needle] of [
  ['zh', 'Simplified Chinese'],
  ['zh-CN', 'Simplified Chinese (Mainland China)'],
  ['zh-SG', 'Simplified Chinese (Singapore)'],
  ['zh-MY', 'Simplified Chinese (Malaysia)'],
  ['zh-Hant', 'Traditional Chinese'],
  ['zh-TW', 'Traditional Chinese (Taiwan; 繁體中文'],
  ['zh-HK', 'Traditional Chinese (Hong Kong; 繁體中文'],
  ['en-US', 'American English'],
  ['en-GB', 'British English'],
  ['pt-BR', 'Brazilian Portuguese'],
  ['pt-PT', 'European Portuguese'],
  ['es-419', 'Latin American Spanish'],
  ['fr-CA', 'Canadian French'],
  ['de-CH', 'Swiss High German'],
  ['nl-BE', 'Flemish'],
]) {
  const saved = await request('/dsh-prompt-predict/settings', 'POST', { suggestionLanguage: code });
  await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
  check(`${code} 的提示词写明字形/地区`,
    saved.json.ok === true && String(captured.system ?? '').includes(needle),
    `${saved.json.ok} ${(captured.system ?? '').slice(0, 50)}`);
}
const langBad = await request('/dsh-prompt-predict/settings', 'POST', { suggestionLanguage: 'xx' });
check('不支持的语言被拒绝', langBad.json.ok === false && /语言/.test(langBad.json.reason ?? ''), String(langBad.json.reason));
await request('/dsh-prompt-predict/settings', 'POST', { suggestionLanguage: 'auto' });

const disabled = await request('/dsh-prompt-predict/settings', 'POST', { enabled: false });
check('关闭联想后生效', disabled.json.ok === true && disabled.json.effective.enabled === false, String(disabled.json.effective?.enabled));
const blocked = await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
check('关闭后拒绝预测', blocked.json.ok === false && blocked.json.disabled === true, String(blocked.json.reason));

const badTimeout = await request('/dsh-prompt-predict/settings', 'POST', { timeoutMs: 500 });
check('超时越界被拒绝', badTimeout.json.ok === false && /超时/.test(badTimeout.json.reason ?? ''), String(badTimeout.json.reason));

const reset = await request('/dsh-prompt-predict/settings', 'POST', { reset: true });
check('恢复默认清空保存项', reset.json.ok === true && Object.keys(reset.json.saved ?? {}).length === 0
  && reset.json.effective.provider === 'auto' && reset.json.effective.model === 'auto'
  && reset.json.effective.enabled === true, JSON.stringify(reset.json.effective));

// ================= 会话模型 / 新设置项 / 降级重试 / 去重 / reroll =================

const statusWithSession = await request('/dsh-prompt-predict/status?sessionId=session-test');
check('status 带 sessionId 回传会话实际模型',
  statusWithSession.json.sessionModel?.provider === 'provider-current'
  && statusWithSession.json.sessionModel?.model === 'model-current',
  JSON.stringify(statusWithSession.json.sessionModel));
check('status 仍保留全局默认 current',
  statusWithSession.json.current?.model === 'model-default', JSON.stringify(statusWithSession.json.current));

const statusNoSession = await request('/dsh-prompt-predict/status');
check('status 不带 sessionId 时 sessionModel 为 null',
  statusNoSession.json.sessionModel === null, String(statusNoSession.json.sessionModel));

const budget = await request('/dsh-prompt-predict/settings', 'POST', { maxChars: 8000, maxTokens: 128 });
check('保存上下文预算与输出上限', budget.json.ok === true
  && budget.json.effective.maxChars === 8000 && budget.json.effective.maxTokens === 128,
  JSON.stringify({ maxChars: budget.json.effective?.maxChars, maxTokens: budget.json.effective?.maxTokens }));

const badChars = await request('/dsh-prompt-predict/settings', 'POST', { maxChars: 10 });
check('上下文预算越界被拒绝', badChars.json.ok === false && /上下文预算/.test(badChars.json.reason ?? ''), String(badChars.json.reason));

const badTokens = await request('/dsh-prompt-predict/settings', 'POST', { maxTokens: 9999 });
check('输出上限越界被拒绝', badTokens.json.ok === false && /输出上限/.test(badTokens.json.reason ?? ''), String(badTokens.json.reason));
const maxTokens = await request('/dsh-prompt-predict/settings', 'POST', { maxTokens: 1024 });
check('输出上限可以调到 1024', maxTokens.json.ok === true && maxTokens.json.effective.maxTokens === 1024,
  String(maxTokens.json.reason ?? maxTokens.json.effective?.maxTokens));
const overTokens = await request('/dsh-prompt-predict/settings', 'POST', { maxTokens: 1025 });
check('输出上限 1025 被拒绝', overTokens.json.ok === false && /1024/.test(overTokens.json.reason ?? ''), String(overTokens.json.reason));
await request('/dsh-prompt-predict/settings', 'POST', { maxTokens: 256 });

// 降级重试：档位不被真实模型支持时自动丢掉档位再试，否则用户只会看到「永远没有建议」
await request('/dsh-prompt-predict/settings', 'POST', { provider: 'provider-effort', model: 'model-r', reasoningEffort: 'high' });
streamCalls = [];
failWhenEffort = true;
const degraded = await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-test' });
failWhenEffort = false;
check('档位不被支持时降级重试成功',
  degraded.json.ok === true && degraded.json.effortDropped === true
  && streamCalls[0]?.reasoningEffort === 'high' && streamCalls[1]?.reasoningEffort === undefined,
  JSON.stringify({ ok: degraded.json.ok, dropped: degraded.json.effortDropped, calls: streamCalls.length }));

// 去重：同一会话连续两轮拿到同一条时，要求模型换一条
streamCalls = [];
const dedupeFirst = await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-dedupe' });
const dedupeSecond = await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'session-dedupe' });
check('连续同一条建议触发去重重试',
  dedupeFirst.json.suggestion === '继续，直接实现并安装插件'
  && dedupeSecond.json.dedupRetry === true
  && dedupeSecond.json.suggestion !== dedupeFirst.json.suggestion,
  JSON.stringify({ first: dedupeFirst.json.suggestion, second: dedupeSecond.json.suggestion, dedup: dedupeSecond.json.dedupRetry }));
check('去重提示确实进入模型请求',
  streamCalls.some((c) => /Give a DIFFERENT suggestion/.test(c.messages?.[0]?.content?.[0]?.text ?? '')), '');

// reroll：用户点「换一条」时首轮就带 avoid，必须给出不同的
streamCalls = [];
const rerolled = await request('/dsh-prompt-predict/suggest', 'POST', {
  sessionId: 'session-dedupe', reroll: true, avoid: '换个思路：先补测试再实现',
});
check('reroll 首轮即要求换一条',
  rerolled.json.ok === true
  && rerolled.json.suggestion !== '换个思路：先补测试再实现'      // 最终结果与传入的 avoid 不同
  && /Give a DIFFERENT suggestion/.test(streamCalls[0]?.messages?.[0]?.content?.[0]?.text ?? ''),  // 且是**首轮**就带了提示
  JSON.stringify({ suggestion: rerolled.json.suggestion }));

check('建议响应带耗时字段', typeof dedupeSecond.json.ms === 'number' && dedupeSecond.json.ms >= 0, String(dedupeSecond.json.ms));

// ================= Host 端错误原因的双语 =================
check('normalizeLang 归一化',
  normalizeLang('en-US') === 'en' && normalizeLang('zh-CN') === 'zh'
  && normalizeLang(['en-GB']) === 'en' && normalizeLang('') === 'zh'
  && normalizeLang('fr') === 'zh' && normalizeLang('de-DE') === 'zh',   // 只支持 DSH 界面语言，其它回落中文
  [normalizeLang('en-US'), normalizeLang('zh-CN'), normalizeLang('fr'), normalizeLang('de-DE')].join('/'));
check('listSeparator 跟着语言走', listSeparator('zh') === '、' && listSeparator('en') === ', ', '');
check('makeT 插值', makeT('en')('err.modelUnknown', { provider: 'p', model: 'm' }) === 'Provider "p" has no model "m"',
  makeT('en')('err.modelUnknown', { provider: 'p', model: 'm' }));

const zhRange = await request('/dsh-prompt-predict/settings', 'POST', { maxChars: 10 }, { 'x-dsh-locale': 'zh' });
const enRange = await request('/dsh-prompt-predict/settings', 'POST', { maxChars: 10 }, { 'x-dsh-locale': 'en' });
check('校验错误按请求语言返回',
  /上下文预算/.test(zhRange.json.reason ?? '') && /Context budget/.test(enRange.json.reason ?? ''),
  `${zhRange.json.reason} | ${enRange.json.reason}`);

const enTimeout = await request('/dsh-prompt-predict/settings', 'POST', { timeoutMs: 1 }, { 'x-dsh-locale': 'en' });
check('超时越界错误英文化', /Timeout must be between/.test(enTimeout.json.reason ?? ''), String(enTimeout.json.reason));

const enMissing = await request('/dsh-prompt-predict/suggest', 'POST', {}, { 'x-dsh-locale': 'en' });
check('缺少 sessionId 英文化', /Missing sessionId/.test(enMissing.json.reason ?? ''), String(enMissing.json.reason));

const enNotFound = await request('/dsh-prompt-predict/suggest', 'POST', { sessionId: 'nope' }, { 'x-dsh-locale': 'en' });
check('Session 不存在英文化', /Session not found/.test(enNotFound.json.reason ?? ''), String(enNotFound.json.reason));

// 预测内部的失败原因也要跟着语言走（这里用「没有会话文本」这条路径）
const emptySession = { id: 'session-empty', deriveMessages: () => [] };
const ctxEn = { ...fakeCtx, sessions: { get: () => emptySession } };
let enPredictErr = '';
try { await predictNextPrompt(ctxEn, emptySession, { t: makeT('en') }); } catch (e) { enPredictErr = String(e.message); }
let zhPredictErr = '';
try { await predictNextPrompt(ctxEn, emptySession, { t: makeT('zh') }); } catch (e) { zhPredictErr = String(e.message); }
check('预测内部失败原因双语',
  /No conversation text/.test(enPredictErr) && /没有可用于预测/.test(zhPredictErr),
  `${zhPredictErr} | ${enPredictErr}`);

const noHeader = await request('/dsh-prompt-predict/settings', 'POST', { maxChars: 10 });
check('x-dsh-locale: en 时错误文案用英语',
  (await request('/dsh-prompt-predict/settings', 'POST', { maxTokens: 9999 }, { 'x-dsh-locale': 'en' }))
    .json.reason?.includes('Output cap') === true, '');
check('normalizeLang 识别中英与未知语言',
  ['zh-CN', 'en-US', 'ru-RU'].map((v) => normalizeLang(v)).join(',') === 'zh,en,zh',
  ['zh-CN', 'en-US', 'ru-RU'].map((v) => normalizeLang(v)).join(','));
check('中英 host 词典 key 对称',
  Object.keys(MESSAGES.zh).length === Object.keys(MESSAGES.en).length,
  `zh=${Object.keys(MESSAGES.zh).length} en=${Object.keys(MESSAGES.en).length}`);

check('不带语言头时回落中文', /上下文预算/.test(noHeader.json.reason ?? ''), String(noHeader.json.reason));

await new Promise((resolve) => server.close(resolve));
for (const cleanup of cleanups) cleanup();
check('dispose 注销路由', cleaned, String(cleaned));

console.log(`RESULT ${results.every(Boolean) ? 'PASS' : 'FAIL'} (${results.filter(Boolean).length}/${results.length})`);
process.exit(results.every(Boolean) ? 0 : 1);

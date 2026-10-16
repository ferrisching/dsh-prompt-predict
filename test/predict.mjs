#!/usr/bin/env node
import http from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { messageText, recentMessages, normalizeSuggestion, predictNextPrompt } from '../lib/predict.mjs';
import { apply } from '../lib/index.js';

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
const fakeSession = {
  id: 'session-test',
  requestHeader: () => ({ config: { provider: 'provider-current', model: 'model-current' } }),
  deriveMessages: () => [
    { role: 'user', content: [{ type: 'text', text: '帮我写插件' }] },
    { role: 'assistant', content: [{ type: 'text', text: '技术验证通过，可以开始实现。' }] },
  ],
};
const fakeCtx = {
  agentDefaultModel: { currentSelection: () => ({ provider: 'provider-default', model: 'model-default' }) },
  llm: {
    async *stream(options) {
      captured = options;
      yield { type: 'block-start', block: { type: 'text' } };
      yield { type: 'text-delta', text: '"继续，直接实现并安装插件"' };
      yield { type: 'finish', reason: 'stop' };
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
const predicted = await predictNextPrompt(fakeCtx, fakeSession, { maxTokens: 48 });
check('生成并归一化建议', predicted.suggestion === '继续，直接实现并安装插件', predicted.suggestion);
check('继承当前会话模型路由', captured.provider === 'provider-current' && captured.model === 'model-current', `${captured.provider}/${captured.model}`);
check('限制输出 token', captured.maxTokens === 48, String(captured.maxTokens));
check('标记辅助调用用途', captured.purpose === 'prompt-prediction' && captured.sessionId === 'session-test', `${captured.purpose}/${captured.sessionId}`);

// Host 路由端到端（本地 HTTP）
let route;
let cleaned = false;
const cleanups = [];
const ctx = {
  sessions: { get: (id) => id === 'session-test' ? fakeSession : undefined },
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
function request(path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const r = http.request({ host: '127.0.0.1', port, path, method, headers: payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {} }, (res) => {
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
check('默认跟随当前会话模型', captured.provider === 'provider-current' && captured.model === 'model-current', `${captured.provider}/${captured.model}`);
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

await new Promise((resolve) => server.close(resolve));
for (const cleanup of cleanups) cleanup();
check('dispose 注销路由', cleaned, String(cleaned));

console.log(`RESULT ${results.every(Boolean) ? 'PASS' : 'FAIL'} (${results.filter(Boolean).length}/${results.length})`);
process.exit(results.every(Boolean) ? 0 : 1);

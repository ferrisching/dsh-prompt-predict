// 同源 HTTP 接口：提示词预测 + 设置页（启用开关、模型选择、高级参数）。
import { readFileSync } from 'node:fs';
import { predictNextPrompt, resolveRoute, isSupportedLanguage, SUGGESTION_LANGUAGES } from './predict.mjs';
import { readSettings, writeSettings, clearSettings } from './config.mjs';
import { makeT, normalizeLang, listSeparator } from './messages.mjs';

const MAX_BODY = 16 * 1024;

// 插件版本：设置页要显示它（排查问题时用户报版本最省事）。从 package.json 读，不硬编码。
const PLUGIN_VERSION = (() => {
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version || null;
  } catch { return null; }
})();

function readJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    let tooBig = false;
    req.on('data', (chunk) => {
      if (tooBig) return;
      raw += chunk;
      if (raw.length > MAX_BODY) { tooBig = true; raw = ''; }
    });
    req.on('end', () => {
      if (tooBig) return resolve(null);
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

function sendJson(res, status, value) {
  if (res.writableEnded) return;
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

export function registerPredictRoute(ctx, cordisConfig = {}) {
  const webServer = ctx?.webServer;
  const connection = ctx?.connection;
  if (!webServer || typeof webServer.register !== 'function') return null;

  // provider/model 为 'auto' 表示「跟随当前会话模型」：不向辅助调用写死路由，
  // 由 predictNextPrompt 继承会话自身选用的模型。
  const AUTO = 'auto';
  // 目录查询的超时可由 cordis 配置覆盖（测试用短超时；不要泄漏进用户可见的 effective 设置）。
  const catalogTimeoutMs = Math.min(10000, Math.max(100, Number(cordisConfig.catalogTimeoutMs) || 3000));
  const { catalogTimeoutMs: _catalogTimeoutConfig, ...cordisSettings } = cordisConfig;
  const isAuto = (value) => !value || value === AUTO;
  const routeOf = (provider, model) => (isAuto(provider) || isAuto(model) ? undefined : { provider, model });

  // 内置默认（可被 cordis patch 部署默认覆盖，再被用户保存的设置覆盖）
  const builtinDefaults = {
    enabled: true,
    provider: AUTO,
    model: AUTO,
    timeoutMs: 12000,
    outputChars: 120,     // 用户可见的字数上限；token 上限由它推导
    multilineSuggestions: true,   // 是否允许代码/列表的多行建议
    maxMessages: 8,
    maxChars: 6000,
    reasoningEffort: 'off',
    historySize: 10,
    switchEnabled: true,           // 是否允许 ↓/↑ 切换建议
    switchLimit: 3,                // 每轮最多生成几次新建议；0 = 不限
    suggestionLanguage: 'auto',
  };
  const deployDefaults = { ...builtinDefaults, ...cordisSettings };

  const currentSelection = () => {
    try { return ctx.agentDefaultModel.currentSelection() ?? {}; } catch { return {}; }
  };

  /** 有效设置 = 部署默认 + 用户保存的覆盖（每次请求时读取，改设置立即生效）。 */
  const effective = () => {
    const merged = { ...deployDefaults, ...readSettings() };
    // 老配置只有 maxTokens：按中文字符比折算成字数上限，界面上就不会出现空值
    if (merged.outputChars === undefined || merged.outputChars === null) {
      const legacy = Number(merged.maxTokens) || 256;
      merged.outputChars = Math.min(400, Math.max(20, Math.round(legacy * 0.6)));
    }
    merged.outputChars = Math.min(400, Math.max(20, Number(merged.outputChars) || 120));
    merged.multilineSuggestions = merged.multilineSuggestions !== false;
    merged.switchEnabled = merged.switchEnabled !== false;
    merged.switchLimit = Math.min(10, Math.max(0, Math.floor(Number(merged.switchLimit) || 0)));
    return merged;
  };

  // 每个会话上一条已展示的建议：用于「避免复读」——模型很容易连续两轮给出几乎相同的建议。
  // 只存内存，进程重启即清空（不需要持久化，也不涉及隐私）。
  // 长期开很多会话时不能无限增长：按最近使用维护一个有上限的 LRU。
  const SUGGESTION_MEMORY_LIMIT = 100;
  const lastSuggestion = new Map();
  const recallSuggestion = (sessionId) => {
    if (!sessionId || !lastSuggestion.has(sessionId)) return undefined;
    const value = lastSuggestion.get(sessionId);
    lastSuggestion.delete(sessionId);   // 访问即刷新到 MRU
    lastSuggestion.set(sessionId, value);
    return value;
  };
  const rememberSuggestion = (sessionId, text) => {
    if (!sessionId || !text) return;
    lastSuggestion.delete(sessionId);
    lastSuggestion.set(sessionId, text);
    while (lastSuggestion.size > SUGGESTION_MEMORY_LIMIT) {
      const oldest = lastSuggestion.keys().next().value;
      lastSuggestion.delete(oldest);
    }
  };
  // 近重复去重：大小写、空白、句末标点、成对引号差异不算「换了一条」。
  const suggestionKey = (text) => {
    let s = String(text ?? '').trim().toLowerCase();
    s = s.replace(/^[\s\u200b\u00a0"'“”‘’「」『』]+|[\s\u200b\u00a0"'“”‘’「」『』]+$/g, '');
    s = s.replace(/[\s\u200b\u00a0]+/g, '');
    s = s.replace(/[。．.!！?？,，;；:：、]+$/g, '');
    return s;
  };
  // 只对足够长的文本做 2 字符以内的编辑距离判断，避免把「好」和「好的」当成重复。
  const editDistanceAtMost = (a, b, limit) => {
    if (Math.abs(a.length - b.length) > limit) return false;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      const row = [i];
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = row;
    }
    return prev[b.length] <= limit;
  };
  const isNearDuplicate = (a, b) => {
    const x = suggestionKey(a);
    const y = suggestionKey(b);
    if (!x || !y) return false;
    if (x === y) return true;
    if (Math.min(x.length, y.length) < 8) return false;
    return editDistanceAtMost(x.slice(0, 400), y.slice(0, 400), 2);
  };

  /** 请求体里的路由（显式指定优先，其次读设置；都是 auto 时返回 undefined = 跟随会话）。 */
  // 会话显示名：不同版本字段位置不一样，逐个试，拿不到就让客户端退回「会话 id 前几位」。
  const sessionLabel = (session) => {
    try {
      const candidates = [
        session?.title, session?.meta?.title, session?.summary?.title, session?.name,
        session?.record?.title, session?.info?.title, session?.state?.title,
        typeof session?.deriveTitle === 'function' ? session.deriveTitle() : null,
      ];
      for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 60);
    } catch { /* 某些实现里 title 是抛错的 getter */ }
    return null;
  };

  const routeFrom = (body, eff) =>
    (typeof body?.provider === 'string' && typeof body?.model === 'string' && body.provider && body.model)
      ? routeOf(body.provider, body.model)
      : routeOf(eff.provider, eff.model);


  // 目录按 provider 缓存：设置页每次打开都会拉全量模型，provider 慢或挂掉时
  // 不能让整个目录卡住，也不能每次都重新等一遍。失败结果也短缓存，避免反复打爆它。
  const catalogCache = new Map();
  const CATALOG_TTL_MS = 60 * 1000;
  const CATALOG_ERROR_TTL_MS = 15 * 1000;
  function withTimeout(promise, ms, message) {
    let timer;
    return new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
      Promise.resolve(promise).then(
        (value) => { clearTimeout(timer); resolve(value); },
        (error) => { clearTimeout(timer); reject(error); },
      );
    });
  }
  async function catalogGroups(t) {
    let providers;
    try { providers = (await Promise.resolve(ctx.llm.listProviders())) || []; } catch (error) {
      throw new Error(t('err.catalogUnavailable', { detail: String(error?.message ?? error) }));
    }
    return Promise.all(providers.map(async (provider) => {
      const id = String(provider.id);
      const name = provider.name || id;
      const cached = catalogCache.get(id);
      if (cached && Date.now() - cached.at < cached.ttl) return cached.group;
      let group;
      try {
        const models = await withTimeout(
          Promise.resolve(ctx.llm.listModels(id)),
          catalogTimeoutMs,
          t('err.catalogTimeout', { seconds: Math.max(1, Math.round(catalogTimeoutMs / 1000)) }),
        );
        const list = Array.isArray(models) ? models : [];
        group = { id, name, models: list.map((m) => ({ id: String(m.id), name: m.name || String(m.id) })) };
      } catch (error) {
        group = { id, name, models: [], error: String(error?.message ?? error) };
      }
      catalogCache.set(id, {
        at: Date.now(),
        ttl: group.error ? CATALOG_ERROR_TTL_MS : CATALOG_TTL_MS,
        group,
      });
      return group;
    }));
  }

  async function validateRoute(t, provider, model) {
    try {
      const models = await ctx.llm.listModels(provider);
      if (!models.some((m) => m.id === model)) return t('err.modelUnknown', { provider, model });
      return null;
    } catch (error) {
      return t('err.providerUnavailable', { provider, detail: String(error?.message ?? error) });
    }
  }

  async function validateEffort(t, lang, provider, model, effort) {
    // off 是插件自己的「不要思考」选项，不要求模型把它列在 efforts 里；
    // 其余档位完全以模型能力为准，不能再写死成 low/high/max 的白名单。
    if (effort === 'off') return null;
    const controller = new AbortController();
    let timer;
    try {
      const info = await Promise.race([
        ctx.llm.resolveModelInfo(provider, model, controller.signal),
        new Promise((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error(t('err.effortQueryTimeout'))); }, 3500);
        }),
      ]);
      const efforts = info?.reasoning?.efforts?.map((e) => e.id) ?? [];
      if (efforts.length === 0) return t('err.effortNoLevels', { model });
      if (!efforts.includes(effort)) return t('err.effortLevelUnsupported', { model, effort, options: efforts.join(listSeparator(lang)) });
      return null;
    } catch {
      return t('err.effortUnknown');
    } finally {
      clearTimeout(timer);
    }
  }

  const route = {
    kind: 'prefix',
    path: '/dsh-prompt-predict',
    handler: async (req, res) => {
      let rejection;
      if (typeof connection?.requestRejection === 'function') {
        try { rejection = connection.requestRejection(req); } catch { rejection = 403; }
      } else {
        rejection = 403;
      }
      if (rejection !== undefined) {
        sendJson(res, rejection, { ok: false, reason: rejection === 401 ? 'unauthorized' : 'forbidden' });
        return;
      }

      const path = new URL(req.url ?? '/', 'http://x').pathname;
      // 语言由客户端在请求头带来（默认情况下 profile 的 cordis.patch.yml 里没有偏好，读不到）
      const lang = normalizeLang(req.headers['x-dsh-locale']);
      const t = makeT(lang);

      if (path === '/dsh-prompt-predict/status' && req.method === 'GET') {
        const current = currentSelection();
        // 可选 sessionId：带上时回传「该会话实际使用的模型」，设置页据此生成思考档位。
        // 不带 sessionId 时只能给全局默认——两者可能不同，混用会让档位选项对不上真实调用。
        const sid = new URL(req.url ?? '/', 'http://x').searchParams.get('sessionId') ?? '';
        let sessionModel = null;
        if (sid) {
          try {
            const session = ctx.sessions?.get?.(sid);
            if (session) {
              const resolved = resolveRoute(ctx, session) ?? {};
              sessionModel = { provider: resolved.provider ?? null, model: resolved.model ?? null };
            }
          } catch { /* 拿不到就算了，客户端回退到 current */ }
        }
        sendJson(res, 200, {
          ok: true,
          current: { provider: current.provider ?? null, model: current.model ?? null },
          sessionModel,
          effective: effective(),
          saved: readSettings(),
          defaults: deployDefaults,
          version: PLUGIN_VERSION,
          // 建议语言下拉的候选：由 Host 提供，客户端不再硬编码
          languages: SUGGESTION_LANGUAGES,
        });
        return;
      }

      if (path === '/dsh-prompt-predict/catalog' && req.method === 'GET') {
        try {
          if (/[?&]refresh=1\b/.test(req.url || '')) catalogCache.clear();
          sendJson(res, 200, { ok: true, groups: await catalogGroups(t) });
        } catch (error) {
          if (!res.writableEnded) sendJson(res, 200, { ok: false, groups: [], reason: String(error?.message ?? error) });
        }
        return;
      }

      // 某个 provider/model 实际支持的思考档位（设置页据此动态生成下拉，避免出现无效选项）
      if (path === '/dsh-prompt-predict/efforts' && req.method === 'GET') {
        const url = new URL(req.url ?? '/', 'http://x');
        const provider = url.searchParams.get('provider') ?? '';
        const model = url.searchParams.get('model') ?? '';
        if (!provider || !model) { sendJson(res, 400, { ok: false, reason: t('err.missingRoute') }); return; }
        const controller = new AbortController();
        let timer;
        try {
          const info = await Promise.race([
            ctx.llm.resolveModelInfo(provider, model, controller.signal),
            new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, 3500); }),
          ]);
          const efforts = info?.reasoning?.efforts?.map((e) => e.id) ?? [];
          sendJson(res, 200, { ok: true, efforts, default: info?.reasoning?.defaultEffort ?? null });
        } catch {
          sendJson(res, 200, { ok: false, reason: t('err.effortCatalog') });
        } finally {
          clearTimeout(timer);
        }
        return;
      }

      if (path === '/dsh-prompt-predict/settings' && req.method === 'POST') {
        const body = await readJson(req);
        if (!body) { sendJson(res, 400, { ok: false, reason: t('err.badJson') }); return; }
        if (body.reset === true) {
          clearSettings();
          sendJson(res, 200, { ok: true, effective: effective(), saved: {} });
          return;
        }
        const patch = {};
        if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
        if (typeof body.provider === 'string' && typeof body.model === 'string' && body.provider && body.model) {
          if (isAuto(body.provider) || isAuto(body.model)) {
            patch.provider = AUTO;
            patch.model = AUTO;
          } else {
            const problem = await validateRoute(t, body.provider, body.model);
            if (problem) { sendJson(res, 200, { ok: false, reason: problem }); return; }
            patch.provider = body.provider;
            patch.model = body.model;
          }
        }
        if (body.timeoutMs !== undefined) {
          const v = Number(body.timeoutMs);
          if (!Number.isSafeInteger(v) || v < 1000 || v > 60000) { sendJson(res, 200, { ok: false, reason: t('err.timeoutRange') }); return; }
          patch.timeoutMs = v;
        }
        if (body.maxMessages !== undefined) {
          const v = Number(body.maxMessages);
          if (!Number.isSafeInteger(v) || v < 2 || v > 20) { sendJson(res, 200, { ok: false, reason: t('err.messagesRange') }); return; }
          patch.maxMessages = v;
        }
        if (body.maxChars !== undefined) {
          const v = Number(body.maxChars);
          if (!Number.isSafeInteger(v) || v < 1000 || v > 20000) { sendJson(res, 200, { ok: false, reason: t('err.charsRange') }); return; }
          patch.maxChars = v;
        }
        if (body.suggestionLanguage !== undefined) {
          const v = String(body.suggestionLanguage);
          if (v !== 'auto' && !isSupportedLanguage(v)) { sendJson(res, 200, { ok: false, reason: t('err.languageUnsupported') }); return; }
          patch.suggestionLanguage = v;
        }
        if (typeof body.switchEnabled === 'boolean') patch.switchEnabled = body.switchEnabled;
        if (body.switchLimit !== undefined) {
          const v = Number(body.switchLimit);
          if (!Number.isInteger(v) || v < 0 || v > 10) { sendJson(res, 200, { ok: false, reason: t('err.switchRange') }); return; }
          patch.switchLimit = v;
        }
        if (body.historySize !== undefined) {
          const v = Number(body.historySize);
          if (!Number.isSafeInteger(v) || v < 0 || v > 50) { sendJson(res, 200, { ok: false, reason: t('err.historyRange') }); return; }
          patch.historySize = v;
        }
        if (typeof body.multilineSuggestions === 'boolean') patch.multilineSuggestions = body.multilineSuggestions;
        if (body.outputChars !== undefined) {
          const v = Number(body.outputChars);
          if (!Number.isSafeInteger(v) || v < 20 || v > 400) { sendJson(res, 200, { ok: false, reason: t('err.outputCharsRange') }); return; }
          patch.outputChars = v;
        }
        if (body.maxTokens !== undefined) {   // 兼容旧客户端：只用来折算字数
          const v = Number(body.maxTokens);
          if (!Number.isSafeInteger(v) || v < 16 || v > 1024) { sendJson(res, 200, { ok: false, reason: t('err.tokensRange') }); return; }
          patch.outputChars = Math.min(400, Math.max(20, Math.round(v * 0.6)));
        }
        if (body.reasoningEffort !== undefined) {
          const v = String(body.reasoningEffort);
          if (v === 'auto') { patch.reasoningEffort = 'auto'; }
          else {
            const next = { ...effective(), ...patch };
            // 跟随当前会话模型时模型不固定，无法按具体模型校验档位，直接按用户选择保存。
            const pinned = routeOf(next.provider, next.model);
            const problem = pinned ? await validateEffort(t, lang, pinned.provider, pinned.model, v) : null;
            if (problem) { sendJson(res, 200, { ok: false, reason: problem }); return; }
            patch.reasoningEffort = v;
          }
        }
        writeSettings(patch);
        sendJson(res, 200, { ok: true, effective: effective(), saved: readSettings() });
        return;
      }

      if (path !== '/dsh-prompt-predict/suggest' || req.method !== 'POST') {
        sendJson(res, 404, { ok: false, reason: t('err.notFound') });
        return;
      }

      const eff = effective();
      if (eff.enabled === false) {
        sendJson(res, 200, { ok: false, disabled: true, reason: t('err.disabled') });
        return;
      }

      const body = await readJson(req);
      if (!body || typeof body.sessionId !== 'string' || body.sessionId.trim() === '') {
        sendJson(res, 400, { ok: false, reason: t('err.missingSessionId') });
        return;
      }
      const session = ctx.sessions.get(body.sessionId);
      if (!session) {
        sendJson(res, 404, { ok: false, reason: t('err.sessionNotFound') });
        return;
      }

      // 流式模式：同一路由加 stream:true，返回 NDJSON（start / delta / reset / done / error）。
      // 不传 stream 时保持原来的单个 JSON 响应，旧客户端不受影响。
      const stream = body.stream === true;
      let ndjsonStarted = false;
      const writeEvent = (event) => {
        if (!stream || res.writableEnded || res.destroyed) return;
        try {
          if (!ndjsonStarted) {
            res.writeHead(200, {
              'content-type': 'application/x-ndjson; charset=utf-8',
              'cache-control': 'no-cache, no-transform',
              'x-accel-buffering': 'no',
            });
            ndjsonStarted = true;
            res.flushHeaders?.();
          }
          res.write(`${JSON.stringify(event)}\n`);
        } catch { /* 客户端断开：由 res close 的 abort 处理 */ }
      };
      // 每 40ms 合并一次 delta：极快的模型会逐 token 输出，逐行写 NDJSON 既浪费
      // 带宽又让客户端每 token 重渲染一次。reset/done/error 前强制 flush。
      const DELTA_FLUSH_MS = 40;
      let pendingDelta = null;
      let lastDeltaText = null;
      let deltaTimer = null;
      const clearPendingDelta = () => {
        if (deltaTimer) { clearTimeout(deltaTimer); deltaTimer = null; }
        pendingDelta = null;
      };
      const flushDelta = () => {
        if (deltaTimer) { clearTimeout(deltaTimer); deltaTimer = null; }
        if (pendingDelta === null) return;
        const text = pendingDelta;
        pendingDelta = null;
        writeEvent({ type: 'delta', text });
      };
      const queueDelta = (text) => {
        pendingDelta = text;
        lastDeltaText = text;
        if (deltaTimer) return;
        deltaTimer = setTimeout(() => { deltaTimer = null; flushDelta(); }, DELTA_FLUSH_MS);
      };
      const onDelta = stream ? (text) => queueDelta(text) : undefined;
      const resetStream = () => { clearPendingDelta(); lastDeltaText = null; writeEvent({ type: 'reset' }); };
      if (stream) writeEvent({ type: 'start', sessionId: session.id, session: sessionLabel(session) });

      const startedAt = Date.now();
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort('prediction timeout'), Number(eff.timeoutMs) || 12000);
      const onClose = () => { if (!res.writableEnded) abort.abort('client disconnected'); };
      res.on('close', onClose);
      const base = {
        signal: abort.signal,
        outputChars: Number(eff.outputChars) || 120,
        maxMessages: Number(eff.maxMessages) || 8,
        maxChars: Number(eff.maxChars) || 6000,
        language: eff.suggestionLanguage || 'auto',
        multiline: eff.multilineSuggestions !== false,
        route: routeFrom(body, eff),
        t,
      };
      const effort = typeof body.reasoningEffort === 'string' ? body.reasoningEffort
        : (eff.reasoningEffort && eff.reasoningEffort !== 'auto' ? eff.reasoningEffort : undefined);
      // 上一条建议：客户端可以显式传 avoid（reroll 时带当前这条），否则用本会话记忆的那条。
      const previous = (typeof body.avoid === 'string' && body.avoid.trim())
        ? body.avoid.trim()
        : recallSuggestion(session.id);
      // reroll = 用户点了「换一条」：首轮就带 avoid，别白跑一次
      const reroll = body.reroll === true && !!previous;
      const firstExtra = reroll ? { avoid: previous, forceDifferent: true } : {};
      let effortDropped = false;
      let dedupRetry = false;
      try {
        let result;
        try {
          result = await predictNextPrompt(ctx, session, { ...base, onDelta, reasoningEffort: effort, ...firstExtra });
        } catch (error) {
          // 降级：思考档位与真实模型不兼容（「跟随会话模型」时最常见）就丢掉档位再试一次。
          // 不做这步的话，用户看到的是「设置都对、但永远没有建议」——而失败在客户端是静默的，最难排查。
          if (!effort) throw error;
          effortDropped = true;
          resetStream();
          result = await predictNextPrompt(ctx, session, { ...base, onDelta, ...firstExtra });
        }
        // 被输出上限截断：建议会断在半句、用户没法直接用，放宽上限再要一次（一次为限）。
        // 只在真截断时发生，正常路径不多付一次调用；放宽后仍失败就保留第一条。
        if (result.truncated) {
          try {
            const current = Number(result.tokenCap) || 256;
            const wider = Math.min(1024, Math.max(current * 2, 384));
            resetStream();
            const retry = wider > current ? await predictNextPrompt(ctx, session, {
              ...base,
              onDelta,
              tokenCap: wider,
              reasoningEffort: effortDropped ? undefined : effort,
              ...firstExtra,
            }) : null;
            if (retry && retry.suggestion) result = retry;
          } catch { /* 放宽重试失败就保留原建议，不打断用户 */ }
        }
        // 放宽后仍然是空的（例如推理把预算吃光）——这时才真正算失败，给用户一个明确原因
        if (!result.suggestion) throw new Error(t('err.noSuggestion', { detail: '' }));
        // 去重：模型会「复读」，连续两轮给同一条时要求换一条（一次为限，失败就保留原建议）。
        if (previous && isNearDuplicate(result.suggestion, previous)) {
          try {
            resetStream();
            const retry = await predictNextPrompt(ctx, session, {
              ...base,
              onDelta,
              reasoningEffort: effortDropped ? undefined : effort,
              avoid: previous,
              forceDifferent: true,
            });
            if (retry.suggestion && !isNearDuplicate(retry.suggestion, previous)) { result = retry; dedupRetry = true; }
          } catch { /* 换一条失败就保留原建议，不打断用户 */ }
        }
        rememberSuggestion(session.id, result.suggestion);
        const payload = {
          ok: true,
          suggestion: result.suggestion,
          provider: result.route.provider,
          model: result.route.model,
          ms: Date.now() - startedAt,
          effortDropped,
          dedupRetry,
          truncated: Boolean(result.truncated),
          sessionId: session.id,
          session: sessionLabel(session),
        };
        if (stream) {
          flushDelta();
          writeEvent({ type: 'done', ...payload });
          if (!res.writableEnded) res.end();
        } else {
          sendJson(res, 200, payload);
        }
      } catch (error) {
        const reason = String(error?.message ?? error);
        if (stream) {
          // 出错时也告诉客户端「已经合并出多少内容」，便于区分 0 字符失败和半句失败。
          const partialChars = Array.from(pendingDelta ?? lastDeltaText ?? '').length;
          clearPendingDelta();
          writeEvent({ type: 'error', ok: false, reason, partialChars, ms: Date.now() - startedAt });
          if (!res.writableEnded) res.end();
        } else if (!res.writableEnded) {
          sendJson(res, 200, { ok: false, reason, ms: Date.now() - startedAt });
        }
      } finally {
        clearPendingDelta();
        clearTimeout(timeout);
        res.off('close', onClose);
      }
    },
  };
  return webServer.register(route);
}

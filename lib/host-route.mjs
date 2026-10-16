// 同源 HTTP 接口：提示词预测 + 设置页（启用开关、模型选择、高级参数）。
import { predictNextPrompt } from './predict.mjs';
import { readSettings, writeSettings, clearSettings } from './config.mjs';

const MAX_BODY = 16 * 1024;

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
  const isAuto = (value) => !value || value === AUTO;
  const routeOf = (provider, model) => (isAuto(provider) || isAuto(model) ? undefined : { provider, model });

  // 内置默认（可被 cordis patch 部署默认覆盖，再被用户保存的设置覆盖）
  const builtinDefaults = {
    enabled: true,
    provider: AUTO,
    model: AUTO,
    timeoutMs: 12000,
    maxTokens: 64,
    maxMessages: 8,
    maxChars: 6000,
    reasoningEffort: 'off',
  };
  const deployDefaults = { ...builtinDefaults, ...cordisConfig };

  const currentSelection = () => {
    try { return ctx.agentDefaultModel.currentSelection() ?? {}; } catch { return {}; }
  };

  /** 有效设置 = 部署默认 + 用户保存的覆盖（每次请求时读取，改设置立即生效）。 */
  const effective = () => ({ ...deployDefaults, ...readSettings() });


  async function catalogGroups() {
    const providers = ctx.llm.listProviders();
    return Promise.all(providers.map(async (provider) => {
      try {
        const models = await ctx.llm.listModels(provider.id);
        return { id: provider.id, name: provider.name, models: models.map((m) => ({ id: m.id, name: m.name })) };
      } catch (error) {
        return { id: provider.id, name: provider.name, models: [], error: String(error?.message ?? error) };
      }
    }));
  }

  async function validateRoute(provider, model) {
    try {
      const models = await ctx.llm.listModels(provider);
      if (!models.some((m) => m.id === model)) return `provider "${provider}" 没有模型 "${model}"`;
      return null;
    } catch (error) {
      return `provider "${provider}" 不可用：${String(error?.message ?? error)}`;
    }
  }

  async function validateEffort(provider, model, effort) {
    if (!['off', 'low', 'high', 'max'].includes(effort)) return '不支持的思考深度';
    const controller = new AbortController();
    let timer;
    try {
      const info = await Promise.race([
        ctx.llm.resolveModelInfo(provider, model, controller.signal),
        new Promise((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error('模型能力查询超时')); }, 3500);
        }),
      ]);
      const efforts = info?.reasoning?.efforts?.map((e) => e.id) ?? [];
      if (efforts.length === 0) return `模型 "${model}" 未公布可调思考深度，请选「跟随模型默认」`;
      if (!efforts.includes(effort)) return `模型 "${model}" 不支持思考深度 "${effort}"（可选：${efforts.join('、')}）`;
      return null;
    } catch {
      return '暂时无法确认模型支持的思考深度，请选「跟随模型默认」后保存';
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

      if (path === '/dsh-prompt-predict/status' && req.method === 'GET') {
        const current = currentSelection();
        sendJson(res, 200, {
          ok: true,
          current: { provider: current.provider ?? null, model: current.model ?? null },
          effective: effective(),
          saved: readSettings(),
          defaults: deployDefaults,
        });
        return;
      }

      if (path === '/dsh-prompt-predict/catalog' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, groups: await catalogGroups() });
        return;
      }

      // 某个 provider/model 实际支持的思考档位（设置页据此动态生成下拉，避免出现无效选项）
      if (path === '/dsh-prompt-predict/efforts' && req.method === 'GET') {
        const url = new URL(req.url ?? '/', 'http://x');
        const provider = url.searchParams.get('provider') ?? '';
        const model = url.searchParams.get('model') ?? '';
        if (!provider || !model) { sendJson(res, 400, { ok: false, reason: '缺少 provider 或 model' }); return; }
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
          sendJson(res, 200, { ok: false, reason: '暂时无法获取该模型支持的思考深度' });
        } finally {
          clearTimeout(timer);
        }
        return;
      }

      if (path === '/dsh-prompt-predict/settings' && req.method === 'POST') {
        const body = await readJson(req);
        if (!body) { sendJson(res, 400, { ok: false, reason: '请求体不是合法 JSON' }); return; }
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
            const problem = await validateRoute(body.provider, body.model);
            if (problem) { sendJson(res, 200, { ok: false, reason: problem }); return; }
            patch.provider = body.provider;
            patch.model = body.model;
          }
        }
        if (body.timeoutMs !== undefined) {
          const v = Number(body.timeoutMs);
          if (!Number.isSafeInteger(v) || v < 1000 || v > 60000) { sendJson(res, 200, { ok: false, reason: '超时需在 1–60 秒之间' }); return; }
          patch.timeoutMs = v;
        }
        if (body.maxMessages !== undefined) {
          const v = Number(body.maxMessages);
          if (!Number.isSafeInteger(v) || v < 2 || v > 20) { sendJson(res, 200, { ok: false, reason: '上下文条数需在 2–20 之间' }); return; }
          patch.maxMessages = v;
        }
        if (body.reasoningEffort !== undefined) {
          const v = String(body.reasoningEffort);
          if (v === 'auto') { patch.reasoningEffort = 'auto'; }
          else {
            const next = { ...effective(), ...patch };
            // 跟随当前会话模型时模型不固定，无法按具体模型校验档位，直接按用户选择保存。
            const pinned = routeOf(next.provider, next.model);
            const problem = pinned ? await validateEffort(pinned.provider, pinned.model, v) : null;
            if (problem) { sendJson(res, 200, { ok: false, reason: problem }); return; }
            patch.reasoningEffort = v;
          }
        }
        writeSettings(patch);
        sendJson(res, 200, { ok: true, effective: effective(), saved: readSettings() });
        return;
      }

      if (path !== '/dsh-prompt-predict/suggest' || req.method !== 'POST') {
        sendJson(res, 404, { ok: false, reason: 'not found' });
        return;
      }

      const eff = effective();
      if (eff.enabled === false) {
        sendJson(res, 200, { ok: false, disabled: true, reason: '提示词联想已关闭' });
        return;
      }

      const body = await readJson(req);
      if (!body || typeof body.sessionId !== 'string' || body.sessionId.trim() === '') {
        sendJson(res, 400, { ok: false, reason: '缺少 sessionId' });
        return;
      }
      const session = ctx.sessions.get(body.sessionId);
      if (!session) {
        sendJson(res, 404, { ok: false, reason: 'Session 不存在' });
        return;
      }

      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort('prediction timeout'), Number(eff.timeoutMs) || 12000);
      const onClose = () => { if (!res.writableEnded) abort.abort('client disconnected'); };
      res.on('close', onClose);
      try {
        const result = await predictNextPrompt(ctx, session, {
          signal: abort.signal,
          maxTokens: Number(eff.maxTokens) || 64,
          maxMessages: Number(eff.maxMessages) || 8,
          maxChars: Number(eff.maxChars) || 6000,
          route: (typeof body.provider === 'string' && typeof body.model === 'string' && body.provider && body.model)
            ? routeOf(body.provider, body.model)
            : routeOf(eff.provider, eff.model),
          reasoningEffort: typeof body.reasoningEffort === 'string' ? body.reasoningEffort
            : (eff.reasoningEffort && eff.reasoningEffort !== 'auto' ? eff.reasoningEffort : undefined),
        });
        sendJson(res, 200, { ok: true, suggestion: result.suggestion, provider: result.route.provider, model: result.route.model });
      } catch (error) {
        if (!res.writableEnded) sendJson(res, 200, { ok: false, reason: String(error?.message ?? error) });
      } finally {
        clearTimeout(timeout);
        res.off('close', onClose);
      }
    },
  };
  return webServer.register(route);
}

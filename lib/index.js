// dsh-prompt-predict Host 插件入口。
import { registerPredictRoute } from './host-route.mjs';

const name = 'dsh-prompt-predict';
const inject = ['sessions', 'llm', 'agentDefaultModel', 'connection', 'webServer'];

export function apply(ctx, config = {}) {
  // cordis patch 的 config 作为部署默认；用户保存的设置（文件）在每次请求时再覆盖。
  // 内置兜底（provider/model/超时等）由 host-route 负责。
  const dispose = registerPredictRoute(ctx, config);
  ctx?.effect?.(() => () => {
    try { dispose?.(); } catch { /* 忽略 */ }
  }, 'dsh-prompt-predict: unregister HTTP route');
}

export { name, inject };

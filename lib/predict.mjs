// 提示词预测核心：会话裁剪 → 调当前会话模型 → 归一化为一条可直接发送的建议。
import { randomUUID } from 'node:crypto';

const DEFAULT_SYSTEM = `你是输入框预测器。根据当前对话，预测用户下一条最可能发给助手的消息。
规则：
1. 只输出一条可直接发送的消息，不要解释、不要加引号、不要加“建议：”等前缀。
2. 使用用户近期主要语言；中文通常 8–50 个字，其他语言保持同等简洁。
3. 建议必须具体、自然、能推进当前任务；优先延续助手刚完成或刚提出的下一步。
4. 不要复述助手最后一句，不要编造用户未表达的目标，不要输出 Markdown 代码块。`;

/** 从消息 content 里只抽取普通文本。 */
export function messageText(message) {
  if (!message || !Array.isArray(message.content)) return '';
  return message.content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

/**
 * 裁出最近的用户/助手文本消息，按总字符预算从后往前保留。
 * 工具、系统、developer、图片和文件块不进入辅助模型请求。
 */
export function recentMessages(messages, { maxMessages = 8, maxChars = 6000, perMessageChars = 1600 } = {}) {
  const candidates = [];
  for (const message of Array.isArray(messages) ? messages : []) {
    if (message?.role !== 'user' && message?.role !== 'assistant') continue;
    const text = messageText(message);
    if (!text) continue;
    candidates.push({ role: message.role, text: text.slice(-perMessageChars) });
  }
  const kept = [];
  let used = 0;
  for (let i = candidates.length - 1; i >= 0 && kept.length < maxMessages; i -= 1) {
    const item = candidates[i];
    const cost = item.text.length + 32;
    if (kept.length > 0 && used + cost > maxChars) break;
    kept.unshift(item);
    used += cost;
  }
  return kept;
}

/** 清掉模型常见包装，只留下单行建议。 */
export function normalizeSuggestion(input, maxChars = 180) {
  let text = String(input ?? '').trim();
  text = text.replace(/^```[a-z0-9_-]*\s*/i, '').replace(/\s*```$/i, '').trim();
  text = text.replace(/^(?:建议|预测|下一条(?:消息|提示词)|用户(?:可能会说)?)[：:]\s*/i, '');
  text = text.replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  text = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(' ');
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > maxChars) text = text.slice(0, maxChars).trim();
  return text;
}

function selectionFor(ctx, session) {
  try {
    const header = session?.requestHeader?.();
    const config = header?.config;
    if (typeof config?.provider === 'string' && typeof config?.model === 'string') {
      return { provider: config.provider, model: config.model };
    }
  } catch { /* 回退到全局默认 */ }
  return ctx.agentDefaultModel.currentSelection();
}

/** 生成一条建议。 */
export async function predictNextPrompt(ctx, session, {
  signal,
  maxTokens = 64,
  maxMessages = 8,
  maxChars = 6000,
  system = DEFAULT_SYSTEM,
  route: routeOverride,
  reasoningEffort,
} = {}) {
  const history = recentMessages(session?.deriveMessages?.() ?? [], { maxMessages, maxChars });
  if (history.length === 0) throw new Error('没有可用于预测的会话文本');
  const route = routeOverride ?? selectionFor(ctx, session);
  if (typeof route?.provider !== 'string' || typeof route?.model !== 'string') {
    throw new Error('无法确定联想所用模型，请在「设置 → 提示词联想」里显式选择提供商与模型');
  }
  const framedHistory = history.map((item) => {
    const label = item.role === 'user' ? '用户' : '助手';
    return `[${label}]\n${item.text}`;
  }).join('\n\n');
  // 不能把裁剪后的 assistant 文本伪装成 canonical Assistant Message：DSH 的 Assistant Message
  // 必须带完整 stream/replayState。像 session-title 一样帧化成一条 request-only user input。
  const messages = [{
    id: randomUUID(),
    role: 'user',
    source: { kind: 'dsh-prompt-predict' },
    content: [{
      type: 'text',
      text: `以下是当前会话最近内容：\n\n${framedHistory}\n\n请预测我下一条最可能输入的消息。只输出预测内容。`,
    }],
  }];
  let output = '';
  let reasoning = '';
  let finish;
  const options = {
    provider: route.provider,
    model: route.model,
    messages,
    system,
    maxTokens,
    sessionId: session.id,
    purpose: 'prompt-prediction',
    signal,
  };
  // 思考深度：仅在显式设置时传入；联想默认应保持最浅以保证速度/成本。
  if (reasoningEffort) options.reasoningEffort = reasoningEffort;
  for await (const chunk of ctx.llm.stream(options)) {
    if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') output += chunk.text;
    if (chunk?.type === 'reasoning-delta' && typeof chunk.text === 'string') reasoning += chunk.text;
    if (chunk?.type === 'finish') finish = chunk.reason;
  }
  if (finish?.kind === 'error' || finish?.kind === 'aborted') {
    const failure = finish.failure;
    throw new Error(failure?.message ?? failure?.code ?? `模型调用${finish.kind}`);
  }
  const suggestion = normalizeSuggestion(output);
  if (!suggestion) {
    const detail = reasoning.trim() ? `（模型只返回 reasoning：${normalizeSuggestion(reasoning, 80)}）` : '';
    throw new Error(`模型未生成有效建议${detail}`);
  }
  return { suggestion, route, historySize: history.length };
}

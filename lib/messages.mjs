/**
 * Host 端面向用户的文案（中英双语，与 DSH 界面语言保持一致）。
 *
 * 为什么 Host 也要有一份：设置页里显示的校验错误、预测失败原因都由 Host 生成，
 * 客户端只是把 `reason` 原样显示出来。只做客户端 i18n 的话，切到英文后
 * 「设置里的报错还是中文」——正是要修的那个不一致。
 *
 * 语言从哪来：由客户端在请求头 `x-dsh-locale` 里带上当前语言。
 * 不读 profile 的 cordis.patch.yml，因为**默认情况下那里根本没有条目**
 * （用户没手动切过语言时靠浏览器语言自动判定，不落盘）——按文件读只会在
 * 最常见的情形下退回中文，等于没做。
 *
 * 这里只放 UI 文案；发给模型的提示词（predict.mjs 里的 framing / avoidHint）不在此列。
 */

export const MESSAGES = {
  zh: {
    'err.notFound': 'not found',
    'err.badJson': '请求体不是合法 JSON',
    'err.missingRoute': '缺少 provider 或 model',
    'err.missingSessionId': '缺少 sessionId',
    'err.sessionNotFound': 'Session 不存在',
    'err.disabled': '提示词联想已关闭',
    'err.timeoutRange': '超时需在 1–60 秒之间',
    'err.messagesRange': '上下文条数需在 2–20 之间',
    'err.charsRange': '上下文预算需在 1000–20000 字符之间',
    'err.tokensRange': '输出上限需在 16–1024 token 之间',
    'err.historyRange': '记录条数需在 1–50 之间',
    'err.languageUnsupported': '不支持的语言',
    'err.effortUnsupported': '不支持的思考深度',
    'err.modelUnknown': 'provider "{provider}" 没有模型 "{model}"',
    'err.providerUnavailable': 'provider "{provider}" 不可用：{detail}',
    'err.effortNoLevels': '模型 "{model}" 未公布可调思考深度，请选「跟随模型默认」',
    'err.effortLevelUnsupported': '模型 "{model}" 不支持思考深度 "{effort}"（可选：{options}）',
    'err.effortUnknown': '暂时无法确认模型支持的思考深度，请选「跟随模型默认」后保存',
    'err.effortCatalog': '暂时无法获取该模型支持的思考深度',
    'err.effortQueryTimeout': '模型能力查询超时',
    'err.noHistory': '没有可用于预测的会话文本',
    'err.noRoute': '无法确定联想所用模型，请在「设置 → 提示词联想」里显式选择提供商与模型',
    'err.callFailed': '模型调用{kind}',
    'err.noSuggestion': '模型未生成有效建议{detail}',
    'err.reasoningOnly': '（模型只返回 reasoning：{text}）',
  },
  en: {
    'err.notFound': 'not found',
    'err.badJson': 'Request body is not valid JSON',
    'err.missingRoute': 'Missing provider or model',
    'err.missingSessionId': 'Missing sessionId',
    'err.sessionNotFound': 'Session not found',
    'err.disabled': 'Prompt prediction is turned off',
    'err.timeoutRange': 'Timeout must be between 1 and 60 seconds',
    'err.messagesRange': 'Context size must be between 2 and 20 messages',
    'err.charsRange': 'Context budget must be between 1000 and 20000 characters',
    'err.tokensRange': 'Output cap must be between 16 and 1024 tokens',
    'err.historyRange': 'History size must be between 1 and 50',
    'err.languageUnsupported': 'Unsupported language',
    'err.effortUnsupported': 'Unsupported reasoning effort',
    'err.modelUnknown': 'Provider "{provider}" has no model "{model}"',
    'err.providerUnavailable': 'Provider "{provider}" is unavailable: {detail}',
    'err.effortNoLevels': 'Model "{model}" publishes no adjustable reasoning levels; choose "Follow the model default"',
    'err.effortLevelUnsupported': 'Model "{model}" does not support reasoning level "{effort}" (available: {options})',
    'err.effortUnknown': 'Cannot confirm the supported reasoning levels right now; choose "Follow the model default" and save',
    'err.effortCatalog': 'Cannot fetch the supported reasoning levels for this model right now',
    'err.effortQueryTimeout': 'Model capability query timed out',
    'err.noHistory': 'No conversation text available for prediction',
    'err.noRoute': 'Cannot determine which model to use; pick a provider and model under Settings → Prompt suggestions',
    'err.callFailed': 'Model call {kind}',
    'err.noSuggestion': 'Model produced no usable suggestion{detail}',
    'err.reasoningOnly': ' (model returned only reasoning: {text})',
  },
};

/** 任意输入 → 'zh' | 'en'；认不出来一律按中文（插件的原始语言）。 */
export function normalizeLang(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = String(raw ?? '').trim().toLowerCase();
  if (!text) return 'zh';
  if (text.startsWith('zh')) return 'zh';
  if (text.startsWith('en')) return 'en';
  return 'zh';
}

/** 列表分隔符也要跟着语言走：中文用顿号，英文用逗号。 */
export function listSeparator(lang) {
  if (lang === 'zh') return '、';
  return ', ';
}

/** 生成翻译函数：{name} 占位符由自己做，词序交给各语言的模板。 */
export function makeT(lang) {
  const dict = MESSAGES[lang] ?? MESSAGES.zh;
  return function t(key, vars) {
    // 缺词时按 en → zh 兜底：ru 之类的新语言哪怕漏了一条，也不会掉回中文
    let text = dict[key] ?? MESSAGES.en[key] ?? MESSAGES.zh[key] ?? key;
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
    }
    return text;
  };
}

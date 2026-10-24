window.__ModuleLoader__.load({
  id: "dsh-prompt-predict",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useCallback = React.useCallback;

    var name = "dsh-prompt-predict";
    var inject = ["slots", "locale"];

    // ---------- 文案：中英双语，跟随 DSH 的「设置 → 语言」 ----------
    // 注册进 DSH 的 locale 服务后语言切换即时生效（无需刷新），并同步 <html lang>。
    // 取值顺序：框架注入的 props.t → 这里绑定的 t → 本词典的中文。
    // 最后一层兜底很重要：旧运行时没有 locale 服务时，界面应是中文而不是一串 key。
    var NS = "dsh-prompt-predict";
    var DICT = {
      zh: {
        "effort.off": "关闭", "effort.minimal": "最小", "effort.low": "低",
        "effort.medium": "中", "effort.high": "高", "effort.max": "最大",
        "ghost.acceptHint": "Tab 采纳 · Alt+→ 逐段采纳",
        "ghost.reroll": "换一条建议",
        "ghost.dismiss": "Esc 忽略",
        "ghost.truncated": "已截断 · 建议调高字数上限",
        "ghost.truncatedHint": "已截断 · 到 设置 → 提示词联想 → 高级 调高「字数上限」",
        "settings.title": "提示词联想",
        "settings.desc": "助手回复结束后，在输入框里直接给出灰色建议（Tab 采纳、Esc 忽略、开始输入自动消失）。",
        "settings.enable": "启用联想",
        "settings.on": "已开启",
        "settings.off": "已关闭",
        "settings.provider": "提供商",
        "settings.model": "模型",
        "settings.followSession": "跟随当前会话模型",
        "settings.modelHint": "默认跟随当前会话模型；也可固定到某个模型——选快模型更省额度。",
        "settings.providerError": "该提供商不可用：{detail}",
        "settings.providerUnavailableShort": "不可用",
        "settings.catalogError": "提供商目录加载失败：{detail}",
        "settings.catalogFailed": "提供商目录加载失败",
        "settings.noModels": "没有可用模型",
        "settings.advanced": " 高级",
        "settings.timeout": "响应超时",
        "settings.timeoutUnit": "秒（1–60）",
        "settings.contextSize": "上下文规模",
        "settings.contextSmall": "少：最近 3 条消息",
        "settings.contextStandard": "标准：最近 8 条（默认）",
        "settings.contextLarge": "多：最近 12 条",
        "settings.contextHint": "越多越准但越慢",
        "settings.maxChars": "上下文预算",
        "settings.maxCharsHint": "字符上限（1000–20000），越小越省 token",
        "settings.outputChars": "字数上限",
        "settings.outputCharsHint": "20–400 字符，不用换算 token",
        "settings.outputCharsHintFull": "按字符计算建议长度。内部会据此推导一个宽裕的 token 安全网；万一仍被截断，ghost 会标出来并自动放宽重试一次",
        "settings.outputCharsWords": "（约 {words} 个词）",
        "settings.effort": "思考深度",
        "settings.effortDefault": "跟随模型默认",
        "settings.effortDefaultNoLevels": "跟随模型默认（该模型未公布可调档位）",
        "settings.effortFastest": "（最快最省）",
        "settings.effortHint": "联想宜浅；过深会把 token 烧在推理上",
        "settings.effortFromSession": "档位按当前会话模型生成：{provider} / {model}",
        "settings.effortNoSession": "档位按当前会话模型生成（暂时取不到会话模型）",
        "settings.save": "保存",
        "settings.saving": "保存中…",
        "settings.reset": "恢复默认",
        "settings.saved": "已保存，立即生效",
        "settings.saveFailed": "保存失败",
        "settings.enabled": "已开启联想",
        "settings.disabled": "已关闭联想",
        "settings.actionFailed": "操作失败",
        "settings.resetDone": "已恢复默认",
        "settings.loading": "加载中…",
        "settings.pause": "暂停预测",
        "settings.pauseStart": "暂停",
        "settings.pauseResume": "立即恢复",
        "settings.pauseLeft": "已暂停，剩余 {time}（到点自动恢复）",
        "settings.pauseHint": "暂停 {minutes} 分钟，期间不发起调用",
        "settings.pauseHintFull": "临时不想被打扰时用；暂停期间不会发起任何预测调用，到点自动恢复",
        "settings.test": "试一下",
        "settings.testWhilePaused": "暂停期间这个按钮仍然可用：它用于验证设置是否生效",
        "settings.testing": "请求中…",
        "settings.testNeedSession": "先打开一个会话再试（设置页拿不到会话上下文）",
        "settings.testResult": "示例建议：{text}",
        "settings.testMeta": "{provider} / {model} · {ms} {unit}",
        "run.effortDropped": "已自动降级思考档位",
        "run.dedupRetry": "已换一条",
        "run.truncated": "被长度限制截断",
        "run.ms": "毫秒",
        "settings.truncatedWarn": "最近一次预测被长度限制截断了：把上面的「字数上限」调高一档（例如 200 字），点「保存」，再触发一次联想试试。",
        "run.session": "会话 {name}",
        "run.failedShort": "失败 — {reason}",
        "run.partialChars": "已收到 {count} 字",
        "run.partialCharsOne": "已收到 1 字",
        "settings.historyTitle": "最近预测（{count}/{limit}）",
        "settings.historyHint": "点一行可以展开当时的建议原文（只存在本机，不上传）",
        "settings.historyToggle": "展开 / 收起建议原文",
        "settings.historyExpand": "展开全部",
        "settings.historyCollapse": "收起",
        "settings.historyClear": "清空",
        "settings.historyCleared": "已清空。",
        "settings.historyUndo": "撤销",
        "settings.historyCopy": "复制",
        "settings.historyCopied": "已复制",
        "settings.historyNoText": "这次预测没有记录到建议原文（功能上线前的旧记录）",
        "settings.historyEmpty": "还没有记录：触发一次联想后，这里会列出最近几次的会话、模型、耗时和异常标记。",
        "settings.predictionSection": "预测内容",
        "settings.suggestionLanguage": "建议语言",
        "settings.suggestionLanguageHint": "跟随对话，也可固定",
        "settings.suggestionLanguageHintFull": "默认按对话判断语言；固定一种后，所有建议都用它书写（带地区变体的语言还会多出一个地区下拉）",
        "settings.languageAuto": "自动（跟随对话）",
        "settings.languageMore": "更多语言…（另有 {count} 种）",
        "settings.languageRegion": "地区",
        "settings.historySize": "记录条数",
        "settings.historySizeHint": "保留最近多少次预测记录（1–50）。记录存在{storage}，本机、不上传，刷新/重启后仍在",
        "storage.electron": "本应用内（Electron 渲染层存储）",
        "storage.web": "浏览器的 localStorage",
        "dock.noSuggestion": "预测未返回有效建议",
        "dock.rerollFailed": "换一条失败",
        "dock.failureHint": "联想没成功：{reason}（连按两次失败才提示，可在 设置 → 提示词联想 里查看记录）",
      },
      en: {
        "effort.off": "Off", "effort.minimal": "Minimal", "effort.low": "Low",
        "effort.medium": "Medium", "effort.high": "High", "effort.max": "Max",
        "ghost.acceptHint": "Tab to accept · Alt+→ piece by piece",
        "ghost.reroll": "Suggest another",
        "ghost.dismiss": "Esc to dismiss",
        "ghost.truncated": "cut off · raise the output length",
        "ghost.truncatedHint": "cut off · raise Output length in Settings → Prompt suggestions → Advanced",
        "settings.title": "Prompt suggestions",
        "settings.desc": "Shows a gray suggestion in the composer right after each reply (Tab to accept, Esc to dismiss, start typing and it goes away).",
        "settings.enable": "Enable predictions",
        "settings.on": "On",
        "settings.off": "Off",
        "settings.provider": "Provider",
        "settings.model": "Model",
        "settings.followSession": "Follow the current session model",
        "settings.modelHint": "Follows the current session model by default; pin a cheaper model to save quota.",
        "settings.providerError": "This provider is unavailable: {detail}",
        "settings.providerUnavailableShort": "unavailable",
        "settings.catalogError": "Could not load the provider catalog: {detail}",
        "settings.catalogFailed": "Could not load the provider catalog",
        "settings.noModels": "No models available",
        "settings.advanced": " Advanced",
        "settings.timeout": "Response timeout",
        "settings.timeoutUnit": "seconds (1–60)",
        "settings.contextSize": "Context size",
        "settings.contextSmall": "Small: last 3 messages",
        "settings.contextStandard": "Standard: last 8 (default)",
        "settings.contextLarge": "Large: last 12 messages",
        "settings.contextHint": "More is more accurate but slower",
        "settings.maxChars": "Context budget",
        "settings.maxCharsHint": "Character cap (1000–20000); lower saves tokens",
        "settings.outputChars": "Output length",
        "settings.outputCharsHint": "20-400 characters, no token maths",
        "settings.outputCharsHintFull": "Length is measured in characters. A generous token cap is derived from it; if a reply still gets cut, the ghost says so and it is retried once with more room",
        "settings.outputCharsWords": " (~{words} words)",
        "settings.effort": "Reasoning effort",
        "settings.effortDefault": "Follow the model default",
        "settings.effortDefaultNoLevels": "Follow the model default (this model publishes no levels)",
        "settings.effortFastest": " (fastest, cheapest)",
        "settings.effortHint": "Keep it shallow; deeper levels burn tokens on reasoning",
        "settings.effortFromSession": "Levels are generated from the current session model: {provider} / {model}",
        "settings.effortNoSession": "Levels are generated from the current session model (unavailable right now)",
        "settings.save": "Save",
        "settings.saving": "Saving…",
        "settings.reset": "Reset to defaults",
        "settings.saved": "Saved — takes effect immediately",
        "settings.saveFailed": "Save failed",
        "settings.enabled": "Predictions enabled",
        "settings.disabled": "Predictions disabled",
        "settings.actionFailed": "Action failed",
        "settings.resetDone": "Defaults restored",
        "settings.loading": "Loading…",
        "settings.pause": "Pause",
        "settings.pauseStart": "Pause",
        "settings.pauseResume": "Resume now",
        "settings.pauseLeft": "Paused - {time} left (resumes automatically)",
        "settings.pauseHint": "For {minutes} minutes, no calls",
        "settings.pauseHintFull": "Use it when you do not want predictions for a while; no calls are made while paused and it resumes automatically",
        "settings.test": "Test now",
        "settings.testWhilePaused": "Still available while paused - it exists to verify your settings",
        "settings.testing": "Requesting…",
        "settings.testNeedSession": "Open a conversation first - the settings page has no session context",
        "settings.testResult": "Sample suggestion: {text}",
        "settings.testMeta": "{provider} / {model} · {ms} ms",
        "run.effortDropped": "reasoning level auto-downgraded",
        "run.dedupRetry": "rerolled",
        "run.truncated": "hit the length limit",
        "run.ms": "ms",
        "settings.truncatedWarn": "The latest prediction hit the length limit: raise Output length above (200 characters, say), click Save, then trigger a prediction again.",
        "run.session": "session {name}",
        "run.failedShort": "failed — {reason}",
        "run.partialChars": "{count} chars received",
        "run.partialCharsOne": "1 char received",
        "settings.historyTitle": "Recent predictions ({count}/{limit})",
        "settings.historyHint": "Click a row to expand the suggestion text (stored locally, never uploaded)",
        "settings.historyToggle": "Expand / collapse the suggestion text",
        "settings.historyExpand": "Show all",
        "settings.historyCollapse": "Collapse",
        "settings.historyClear": "Clear",
        "settings.historyCleared": "Cleared.",
        "settings.historyUndo": "Undo",
        "settings.historyCopy": "Copy",
        "settings.historyCopied": "Copied",
        "settings.historyNoText": "No suggestion text recorded for this run (older record)",
        "settings.historyEmpty": "No records yet: trigger a prediction and this list shows the last few with their session, model, latency and flags.",
        "settings.predictionSection": "What gets predicted",
        "settings.suggestionLanguage": "Suggestion language",
        "settings.suggestionLanguageHint": "Follow the conversation, or pin one",
        "settings.suggestionLanguageHintFull": "Detected from the conversation by default; pin a language to always get suggestions in it (languages with regional variants also get a Region dropdown)",
        "settings.languageAuto": "Auto (follow the conversation)",
        "settings.languageMore": "More languages… ({count} more)",
        "settings.languageRegion": "Region",
        "settings.historySize": "History size",
        "settings.historySizeHint": "how many recent predictions to keep (1-50). Stored in {storage}; local only, never uploaded, survives reloads",
        "storage.electron": "the app's own storage (Electron renderer)",
        "storage.web": "the browser's localStorage",
        "dock.noSuggestion": "Prediction returned no usable suggestion",
        "dock.rerollFailed": "Reroll failed",
        "dock.failureHint": "Prediction failed: {reason} (shown after two failures in a row; details in Settings → Prompt suggestions)",
      },
    };

    // 建议语言：auto = 跟随对话；其余候选由 Host 提供（status.languages），
    // 标签用 Intl.DisplayNames 现算母语名——不限定固定几种，也不用手写映射表。
    // 兜底候选（Host 的 /status.languages 是权威来源，这只是在旧 Host / 请求失败时保证下拉可用；
    // client-render 用例会校验这份清单与 lib/predict.mjs 的 SUGGESTION_LANGUAGES 一致）
    var DEFAULT_LANGUAGE_CODES = [
      "zh", "zh-TW", "zh-HK", "en", "ja", "ko", "ru", "fr", "de", "es", "pt", "it",
      "ar", "hi", "th", "vi", "tr", "nl", "pl", "uk", "sv", "da",
      "nb", "fi", "cs", "sk", "hu", "ro", "bg", "el", "he", "fa",
      "ur", "bn", "ta", "te", "ml", "kn", "gu", "mr", "pa", "id",
      "ms", "tl", "sw", "am", "sr", "hr", "sl", "et", "lv", "lt",
      "ka", "hy", "az", "kk", "uz", "mn", "ne", "si", "km", "lo",
      "my", "ca", "gl", "eu", "is", "ga", "cy", "af", "zu", "yo", "eo",
    ];
    // 主流「语言」列表（地区细分放到第二级下拉里，避免一长串 zh-TW / zh-HK / en-US…）
    var MAINSTREAM_LANGUAGE_CODES = ["zh", "zh-Hant", "en", "ja", "ko", "ru", "fr", "de", "nl", "es", "pt", "it", "ar", "hi"];
    var MORE_LANGUAGES = "__more__";
    // 需要细分地区的语言家族：base → 变体列表（第一项为「通用」）
    var LANGUAGE_FAMILIES = {
      zh: [["zh-CN", ""], ["zh-SG", ""], ["zh-MY", ""]],
      "zh-Hant": [["zh-TW", ""], ["zh-HK", ""]],
      en: [["en-US", ""], ["en-GB", ""], ["en-AU", ""], ["en-CA", ""]],
      pt: [["pt-BR", ""], ["pt-PT", ""]],
      es: [["es-ES", ""], ["es-419", ""], ["es-MX", ""], ["es-AR", ""], ["es-CO", ""]],
      fr: [["fr-FR", ""], ["fr-CA", ""]],
      de: [["de-DE", ""], ["de-AT", ""], ["de-CH", ""]],
      nl: [["nl-NL", ""], ["nl-BE", ""]],
    };
    // 家族 → 它管辖的所有代码（这些代码不在主下拉里单独出现）
    var MANAGED_CODES = Object.keys(LANGUAGE_FAMILIES).reduce(function (acc, base) {
      LANGUAGE_FAMILIES[base].forEach(function (item) { acc[item[0]] = true; });
      return acc;
    }, {});
    function languageFamily(code) {
      if (!code || code === "auto") return "auto";
      var keys = Object.keys(LANGUAGE_FAMILIES);
      for (var i = 0; i < keys.length; i += 1) {
        var variants = LANGUAGE_FAMILIES[keys[i]];
        for (var j = 0; j < variants.length; j += 1) if (variants[j][0] === code) return keys[i];
      }
      return code;
    }
    function familyVariants(base) { return LANGUAGE_FAMILIES[base] || [["", ""]]; }
    // 已保存的「通用」值（en / pt / zh-Hant …）统一落到该语言的默认地区，避免下拉显示与实际值不一致
    function normalizeSavedLanguage(code) {
      if (!code || code === "auto") return "auto";
      var variants = familyVariants(languageFamily(code));
      if (variants.length > 1 && !variants.some(function (item) { return item[0] === code; })) {
        return variants[0][0];
      }
      return code;
    }
    var LANGUAGE_LABEL_OVERRIDES = {
      zh: "简体中文",
      "zh-Hant": "繁體中文",
    };
    // 个别地区的 CLDR 名字太长（HK = 中国香港特别行政区 / Hong Kong SAR China），下拉里显示不下，
    // 这里只覆盖必要的几个，其余仍由 Intl 现算。
    var REGION_LABEL_OVERRIDES = {
      CN: { zh: "中国大陆", en: "Mainland China" },
      HK: { zh: "香港", en: "Hong Kong" },
    };
    function regionLabel(code, base, t) {
      var region = String(code).split("-")[1];
      var override = REGION_LABEL_OVERRIDES[region];
      if (override) return override[currentLang() === "zh" ? "zh" : "en"];
      try {
        var name = new Intl.DisplayNames([uiLocale() || "en"], { type: "region" }).of(region);
        if (typeof name === "string" && name && name !== region) return name;
      } catch { /* 回退到代码 */ }
      return region || code;
    }
    function languageLabel(code) {
      if (LANGUAGE_LABEL_OVERRIDES[code]) return LANGUAGE_LABEL_OVERRIDES[code];
      try {
        var name = new Intl.DisplayNames([code], { type: "language" }).of(code);
        if (typeof name === "string" && name && name !== code) return name;
      } catch { /* 回退到代码 */ }
      return code;
    }

    // 字数上限的辅助换算：中日韩按「字」算，其它语言额外给出「约 N 个单词」（平均 6 字符/词）
    function isCjkFamily(code) {
      if (!code || code === "auto") return false;
      return /^zh/i.test(code) || /^(ja|ko)\b/i.test(code) || /^zh-/i.test(code);
    }
    function wordHint(code, chars, t) {
      if (isCjkFamily(code)) return "";
      var words = Math.max(1, Math.round(Number(chars) / 6));
      return tt(t, "settings.outputCharsWords", { words: words });
    }

    var EFFORT_LABEL_KEYS = {
      off: "effort.off", none: "effort.off", minimal: "effort.minimal",
      low: "effort.low", medium: "effort.medium", high: "effort.high", max: "effort.max",
    };

    // tt() 自己实现 {name} 插值，所以不依赖 t 是否支持参数，词序完全交给各语言的模板。
    var boundTranslate = null;
    var localeService = null;
    function fallbackTranslate(key) {
      // 当前界面语言优先，其次英文，最后中文——新语言漏词时也不会掉回中文
      var lang = currentLang() || "zh";
      var own = DICT[lang];
      return (own && own[key]) || (DICT.en && DICT.en[key]) || (DICT.zh && DICT.zh[key]) || key;
    }

    /**
     * 当前界面语言。Host 端要靠它来决定用哪种语言回错误原因，所以每次请求都重新探：
     * 用户在「设置 → 语言」里切换后必须立刻跟上。
     * 先读 locale 服务的快照（它知道浏览器自动判定出来的语言），读不到再拿一个
     * 已知 key 去问翻译、跟词典比对。
     */
    function currentLang() {
      try {
        var snap = localeService && typeof localeService.getSnapshot === "function" ? localeService.getSnapshot() : null;
        var v = snap && (snap.active || snap.locale || snap.id);
        if (typeof v === "string" && v) {
          var low = v.toLowerCase();
          return low.indexOf("zh") === 0 ? "zh" : "en";   // 与 DSH 界面语言保持一致
        }
      } catch { /* 下面再试比对 */ }
      try {
        if (boundTranslate) {
          var probe = boundTranslate("settings.title");
          if (DICT.en && probe === DICT.en["settings.title"]) return "en";
        }
      } catch { /* 保守回中文 */ }
      return "zh";
    }
    // 界面语言对应的 BCP-47 标记：时间等格式化跟界面语言走，而不是系统语言。
    var UI_LOCALES = { zh: "zh-CN", en: "en-US" };
    function uiLocale() { return UI_LOCALES[currentLang()] || undefined; }

    function tt(t, key, vars) {
      var fn = t || boundTranslate || fallbackTranslate;
      var text = null;
      try { text = fn(key); } catch { text = null; }
      if (typeof text !== "string" || !text || text === key) text = fallbackTranslate(key);
      if (vars) {
        text = text.replace(/\{(\w+)\}/g, function (m, k) {
          return vars[k] === undefined || vars[k] === null ? m : String(vars[k]);
        });
      }
      return text;
    }

    // ---------- 设置页样式 ----------
    // 调色板：跟随系统/应用的深色模式（prefers-color-scheme）。浅色值保持原样。
    var PALETTE = {
      light: {
        text: "#111827", label: "#374151", muted: "#6b7280", border: "#d1d5db", cardBorder: "#e7e8ee",
        cardBg: "#fff", inputBg: "#fff", inputText: "#111827", chipBg: "#fff", chipText: "#4b5563",
        softBg: "#f8fafc", softText: "#374151", divider: "#ececf1", rowBorder: "#f1f1f5",
        link: "#4f6ef7", primary: "#4f6ef7", primaryText: "#fff", trackOff: "#d1d5db", thumb: "#fff",
        ok: "#047857", err: "#dc2626", warn: "#b45309", hintBorder: "#cbd5e1",
        ghostText: "#6b7280", ghostHint: "#6b7280", ghostTruncated: "#b45309", scheme: "light",
      },
      dark: {
        text: "#e5e7eb", label: "#d1d5db", muted: "#9ca3af", border: "#4b5563", cardBorder: "#374151",
        cardBg: "#111827", inputBg: "#1f2937", inputText: "#e5e7eb", chipBg: "#1f2937", chipText: "#d1d5db",
        softBg: "#1f2937", softText: "#e5e7eb", divider: "#374151", rowBorder: "#374151",
        link: "#93c5fd", primary: "#4f6ef7", primaryText: "#fff", trackOff: "#4b5563", thumb: "#fff",
        ok: "#34d399", err: "#f87171", warn: "#fbbf24", hintBorder: "#4b5563",
        ghostText: "#9ca3af", ghostHint: "#9ca3af", ghostTruncated: "#fbbf24", scheme: "dark",
      },
    };
    function prefersDark() {
      try {
        return typeof window !== "undefined" && window.matchMedia
          && window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch { return false; }
    }
    var THEME = prefersDark() ? "dark" : "light";
    function colors() { return PALETTE[THEME]; }
    // DSH 自身的设计令牌优先（深色/浅色由宿主决定），取不到时回落到本地调色板。
    function token(name, fallback) { return "var(--dsw-alias-" + name + ", " + fallback + ")"; }

    function buildStyles() {
      var c = colors();
      return {
        card: { border: "1px solid " + token("border-l2", c.cardBorder), borderRadius: 14, padding: "20px 22px", maxWidth: 560, background: token("bg-layer-1", c.cardBg), colorScheme: c.scheme },
        title: { fontSize: 15, fontWeight: 600, color: token("label-primary", c.text), margin: "0 0 4px" },
      version: { color: token("label-tertiary", c.muted), fontSize: 11.5, fontWeight: 400, marginInlineStart: 8 },
        muted: { color: token("label-tertiary", c.muted), fontSize: 13, lineHeight: 1.7 },
        row: { display: "flex", alignItems: "center", gap: 12, margin: "14px 0" },
        label: { width: 110, fontSize: 13, color: token("label-secondary", c.label), flex: "none" },
        select: { flex: 1, padding: "7px 10px", border: "1px solid " + token("border-l1", c.border), borderRadius: 8, fontSize: 13, color: token("label-primary", c.inputText), background: token("bg-base", c.inputBg), maxWidth: 320 },
        input: { width: 90, padding: "7px 10px", border: "1px solid " + token("border-l1", c.border), borderRadius: 8, fontSize: 13, color: token("label-primary", c.inputText), background: token("bg-base", c.inputBg) },
        btnPrimary: { padding: "8px 16px", border: 0, borderRadius: 8, background: token("state-business-primary", c.primary), color: c.primaryText, cursor: "pointer", fontSize: 13 },
        btnGhost: { padding: "8px 16px", border: "1px solid " + token("border-l1", c.border), borderRadius: 8, background: token("bg-layer-2", c.chipBg), color: token("label-primary", c.chipText), cursor: "pointer", fontSize: 13 },
        toggleTrack: function (on) { return { width: 38, height: 22, borderRadius: 22, border: 0, cursor: "pointer", padding: 2, background: on ? c.primary : c.trackOff, transition: "background .15s" }; },
        toggleThumb: function (on) { return { display: "block", width: 18, height: 18, borderRadius: 18, background: c.thumb, transform: on ? "translateX(16px)" : "translateX(0)", transition: "transform .15s" }; },
        warn: { color: c.warn, fontSize: 12.5, lineHeight: 1.7, margin: "-8px 0 0 122px" },
        warnBlock: { color: c.warn, fontSize: 12.5, lineHeight: 1.7, margin: "-4px 0 12px" },
        warnInline: { color: c.warn, fontSize: 12, marginInlineStart: 8 },
        tryBox: { marginTop: 12, padding: "10px 12px", borderRadius: 8, background: token("bg-layer-2", c.softBg), fontSize: 13, lineHeight: 1.7, color: token("label-primary", c.softText) },
        tryMeta: { display: "block", color: c.muted, fontSize: 11.5, marginTop: 4 },
        sectionTitle: { fontSize: 13, fontWeight: 600, color: token("label-secondary", c.label), margin: "0 0 8px" },
        histHead: { display: "flex", alignItems: "baseline", gap: 10, margin: "0 0 6px" },
        histToggle: { background: "none", border: 0, color: token("state-business-primary", c.link), fontSize: 12, cursor: "pointer", padding: 0 },
        histHint: { color: token("label-tertiary", c.muted), fontSize: 12, lineHeight: 1.7, margin: "0 0 6px" },
        linkBtn: { background: "none", border: 0, color: c.link, fontSize: 12, cursor: "pointer", padding: "0 4px", textDecoration: "underline" },
        hintWithMore: { color: token("label-tertiary", c.muted), fontSize: 13, lineHeight: 1.7, cursor: "help", borderBottom: "1px dotted " + c.hintBorder },
        // 悬停详情用浮层：不占布局（行高不变），也不接收鼠标事件（不会挡住下面控件的点击）
        hintAnchor: { position: "relative", display: "inline-block" },
        hintDetail: {
          // 提示文字贴在行尾，气泡从**右边缘**向左扩展，避免越过卡片右边被裁掉
          position: "absolute", top: "calc(100% + 6px)", insetInlineEnd: 0, zIndex: 30,
          width: "min(300px, 72vw)", padding: "8px 10px", borderRadius: 8, fontSize: 11.5, lineHeight: 1.6,
          textAlign: "start", whiteSpace: "normal", pointerEvents: "none",
          color: token("label-primary", c.softText), background: token("bg-layer-2", c.softBg),
          border: "1px solid " + token("border-l1", c.border), boxShadow: "0 6px 18px rgba(0, 0, 0, 0.14)",
        },
        histRowWrap: { borderBottom: "1px solid " + token("border-l1", c.rowBorder), padding: "2px 0" },
        histRow: { display: "flex", gap: 10, alignItems: "baseline", fontSize: 12.5, lineHeight: 1.9 },
        histRowButton: { width: "100%", background: "none", border: 0, padding: 0, color: "inherit", font: "inherit", textAlign: "start", cursor: "pointer" },
        histCaret: { color: c.muted, flex: "none", width: 10, fontSize: 11 },
        histText: { display: "flex", gap: 8, alignItems: "flex-start", marginBlock: "2px 10px", marginInlineStart: 20, padding: "8px 10px", borderRadius: 8, background: token("bg-layer-2", c.softBg) },
        histTextBody: { flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word", color: token("label-primary", c.softText), fontSize: 12.5, lineHeight: 1.7 },
        copyBtn: { flex: "none", padding: "2px 8px", borderRadius: 6, border: "1px solid " + token("border-l1", c.border), background: token("bg-layer-2", c.chipBg), color: token("label-secondary", c.chipText), fontSize: 11.5, cursor: "pointer" },
        histWhen: { color: c.muted, flex: "none", width: 76 },
        histWho: { color: c.text, flex: "none", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
        histWhat: { color: c.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
        err: { color: token("state-error-primary", c.err), fontSize: 12, marginTop: 8 },
        ok: { color: token("state-success-primary", c.ok), fontSize: 12, marginTop: 8 },
        divider: { borderTop: "1px solid " + token("border-l1", c.divider), margin: "16px 0" },
        advBtn: { background: "none", border: 0, color: token("state-business-primary", c.link), fontSize: 13, cursor: "pointer", padding: 0 },
      };
    }
    var SS = buildStyles();

    // 主题切换：重建样式表并让已挂载的组件重渲染
    function watchTheme() {
      try {
        if (!window.matchMedia) return;
        var mq = window.matchMedia("(prefers-color-scheme: dark)");
        var onChange = function () {
          THEME = mq.matches ? "dark" : "light";
          SS = buildStyles();
          window.dispatchEvent(new CustomEvent("dsh-prompt-predict:theme", { detail: { theme: THEME } }));
        };
        if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
        else if (typeof mq.addListener === "function") mq.addListener(onChange);
      } catch { /* 老运行时没有 matchMedia，保持浅色 */ }
    }
    function dim(style, busy) { return busy ? Object.assign({}, style, { opacity: .55, cursor: "not-allowed" }) : style; }

    function api(path, body) {
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 15000);
      var langHeader = { "x-dsh-locale": currentLang() };
      var opts = body === undefined
        ? { headers: langHeader }
        : { method: "POST", headers: Object.assign({ "content-type": "application/json" }, langHeader), body: JSON.stringify(body) };
      return fetch("./dsh-prompt-predict/" + path, Object.assign({}, opts, { signal: controller.signal }))
        .then(function (r) { return r.json(); })
        .finally(function () { clearTimeout(timer); });
    }

    // 流式联想：优先读 NDJSON（start/delta/reset/done/error），旧 Host 或没有
    // ReadableStream 时自动退回原来的单个 JSON 响应。
    function apiStream(path, body, onEvent, externalSignal) {
      // 外部（composer dock）传入的 signal 必须真正接到 fetch 上，否则切会话/暂停时
      // 只是忽略了事件，请求还会继续跑到 60 秒。
      // 外部 signal 负责「切会话/暂停/新预测」取消；这里仍保留自己的 60s 超时，
      // 两者任一触发都 abort fetch。
      var controller = new AbortController();
      var onExternalAbort = function () { controller.abort(); };
      if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else if (typeof externalSignal.addEventListener === "function") externalSignal.addEventListener("abort", onExternalAbort);
      }
      var timer = setTimeout(function () { controller.abort(); }, 60000);
      var langHeader = { "x-dsh-locale": currentLang() };
      var opts = {
        method: "POST",
        headers: Object.assign({ "content-type": "application/json" }, langHeader),
        body: JSON.stringify(Object.assign({}, body, { stream: true })),
        signal: controller.signal,
      };
      var emit = function (event) { try { onEvent(event); } catch { /* 单个事件渲染失败不影响流 */ } };
      return fetch("./dsh-prompt-predict/" + path, opts).then(function (r) {
        var type = r && r.headers && typeof r.headers.get === "function" ? (r.headers.get("content-type") || "") : "";
        if (r && r.body && typeof r.body.getReader === "function" && type.indexOf("application/x-ndjson") !== -1) {
          var reader = r.body.getReader();
          var decoder = new TextDecoder();
          var buffer = "";
          var final = null;
          var pump = function () {
            return reader.read().then(function (step) {
              if (step.done) {
                buffer += decoder.decode();
                if (buffer.trim()) { try { var last = JSON.parse(buffer); final = last; emit(last); } catch { /* 忽略残行 */ } }
                return final || { ok: false, reason: "stream ended" };
              }
              buffer += decoder.decode(step.value, { stream: true });
              var idx;
              while ((idx = buffer.indexOf("\n")) >= 0) {
                var line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line) continue;
                try {
                  var event = JSON.parse(line);
                  if (event.type === "done" || event.type === "error") final = event;
                  emit(event);
                } catch { /* 忽略坏行 */ }
              }
              return pump();
            });
          };
          return pump();
        }
        return r.json().then(function (result) {
          emit(result && result.ok ? Object.assign({ type: "done" }, result) : Object.assign({ type: "error" }, result || {}));
          return result;
        });
      }).finally(function () {
        clearTimeout(timer);
        if (externalSignal && typeof externalSignal.removeEventListener === "function") {
          externalSignal.removeEventListener("abort", onExternalAbort);
        }
      });
    }

    function notifySettings(effective) {
      window.dispatchEvent(new CustomEvent("dsh-prompt-predict:settings", { detail: effective }));
    }

    function findEditor(sessionId) {
      var scoped = sessionId ? document.querySelector('[data-conversation-session="' + sessionId + '"] [data-composer-input="true"]') : null;
      return scoped || document.querySelector('[data-composer-input="true"]');
    }

    // 编辑器里「用户已经写了的东西」。rc.2 起 slot 拿不到草稿，只能读 DOM：
    // 占位符是编辑器的兄弟节点（见上面 hidePlaceholder 的查找方式），所以不会混进来。
    function editorText(sessionId) {
      try {
        var ed = findEditor(sessionId);
        if (!ed) return "";
        var raw = typeof ed.textContent === "string" ? ed.textContent : String(ed.innerText || "");
        return raw.replace(/[\u200b\u00a0\s]/g, "");
      } catch { return ""; }
    }
    // 只把「不是我们采纳插入的那部分」当成用户草稿——逐段采纳后编辑器里本来就有前缀
    function hasForeignDraft(sessionId, acceptedPrefix) {
      var text = editorText(sessionId);
      if (!text) return false;
      var prefix = String(acceptedPrefix || "").replace(/[\u200b\u00a0\s]/g, "");
      if (!prefix) return true;
      return text.indexOf(prefix) !== 0;
    }

    // 快捷键只能在当前 composer 聚焦时接管；否则 Tab 应该正常用于焦点移动。
    function isComposerFocused(sessionId, event) {
      try {
        var ed = findEditor(sessionId);
        if (!ed) return false;
        var contains = function (node) {
          return node === ed || (typeof ed.contains === "function" && ed.contains(node));
        };
        var target = event && event.target;
        if (target && contains(target)) return true;
        var active = document.activeElement;
        // 没有 activeElement 的极简测试环境按聚焦处理；真实浏览器里这里通常是 body/input。
        if (!active) return true;
        return contains(active);
      } catch { return false; }
    }

    // ============ 模块级共享状态（composer dock 写、设置页读） ============
    // 设置页本身拿不到会话上下文，但「思考档位」必须按**会话实际模型**生成，
    // 否则用户选到的档位可能不被真实调用的模型支持（表现为「设置都对但永远没有建议」）。
    // 设置页与 dock 可能是两个独立模块实例：当前会话不能只存在模块变量里。
    // dock 写入 localStorage，设置页在读取状态/点「试一下」时取最新值。
    var LIVE_SESSION_KEY = "dsh-prompt-predict.liveSessionId";
    function readLiveSessionId() {
      try { return window.localStorage?.getItem(LIVE_SESSION_KEY) || null; } catch { return undefined; }
    }
    var liveSessionId = readLiveSessionId() || null;
    function currentLiveSessionId() {
      var stored = readLiveSessionId();
      // undefined = 存储不可用；此时保留本模块内存里的值，不清掉它。
      if (stored !== undefined && stored !== liveSessionId) liveSessionId = stored;
      return liveSessionId;
    }
    function setLiveSessionId(id) {
      var next = id || null;
      if (liveSessionId === next && readLiveSessionId() === next) return;
      liveSessionId = next;
      try {
        var store = window.localStorage;
        if (store) {
          if (next) store.setItem(LIVE_SESSION_KEY, next);
          else store.removeItem(LIVE_SESSION_KEY);
        }
      } catch { /* 隐私模式：本次模块内仍可用 */ }
      window.dispatchEvent(new CustomEvent("dsh-prompt-predict:session", { detail: { sessionId: next } }));
    }
    // 预测运行记录：最近若干次（条数可在设置里调，默认 10），新的在前。
    // 持久化在应用自身的 localStorage（desktop 即 Electron 渲染层，web 即页面存储；都只在本机、不上传）：
    // 刷新页面或重启 App 后仍能回看，排障才有意义。
    var HISTORY_KEY = "dsh-prompt-predict.history";
    function readStoredHistory() {
      try {
        var store = window.localStorage;
        if (!store) return [];
        var raw = store.getItem(HISTORY_KEY);
        var list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.filter(function (item) { return item && typeof item.at === "number"; }) : [];
      } catch { return []; }
    }
    function persistHistory() {
      try {
        var store = window.localStorage;
        if (store) store.setItem(HISTORY_KEY, JSON.stringify(runHistory.slice(0, 50)));
      } catch { /* 隐私模式 / 配额满：不存也不影响功能 */ }
    }
    function normalizeHistoryLimit(limit) {
      var n = Number(limit);
      return Number.isFinite(n) && n > 0 ? Math.min(50, Math.floor(n)) : 10;
    }
    // 加载或保存条数时立即裁剪并落盘，而不是等下一次预测才生效。
    function trimHistoryToLimit(limit) {
      var max = normalizeHistoryLimit(limit);
      var list = readStoredHistory();
      var trimmed = list.slice(0, max);
      runHistory = trimmed;
      if (trimmed.length !== list.length) {
        persistHistory();
        window.dispatchEvent(new CustomEvent("dsh-prompt-predict:run", {
          detail: { latest: trimmed[0] || null, history: trimmed.slice() },
        }));
      }
      return trimmed;
    }
    function historyEntryKey(item) {
      if (item && item.id) return String(item.id);
      // 老版本记录没有 id：用内容兜底去重，兼容已有的 localStorage 数据。
      return [item && item.at, item && item.sessionId, item && item.provider, item && item.model,
        item && item.suggestion, item && item.error].join("|");
    }
    // 撤销清空时合并「清空后的新记录」与「清空前快照」，新记录不会被覆盖。
    function mergeHistoryLists(current, snapshot, limit) {
      var seen = new Set();
      var merged = [];
      [current, snapshot].forEach(function (list) {
        (Array.isArray(list) ? list : []).forEach(function (item) {
          if (!item) return;
          var key = historyEntryKey(item);
          if (seen.has(key)) return;
          seen.add(key);
          merged.push(item);
        });
      });
      merged.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      return merged.slice(0, normalizeHistoryLimit(limit));
    }
    // 存储位置的说法要跟运行环境一致：desktop 是 Electron 渲染层，web 是页面 localStorage。
    // 措辞写死成任意一种，另一个平台就会显示错。
    function storagePlatformKey() {
      try {
        var ua = typeof navigator !== "undefined" && navigator && navigator.userAgent ? String(navigator.userAgent) : "";
        return /electron/i.test(ua) ? "storage.electron" : "storage.web";
      } catch { return "storage.web"; }
    }
    // 「暂停 10 分钟」：临时静默预测。只存本机，到期自动恢复，不需要 Host 参与。
    var PAUSE_KEY = "dsh-prompt-predict.pausedUntil";
    function readPausedUntil() {
      try {
        var raw = window.localStorage && window.localStorage.getItem(PAUSE_KEY);
        var until = Number(raw) || 0;
        return until > Date.now() ? until : 0;
      } catch { return -1; }   // -1 = 存储不可用，由调用方保留内存状态
    }
    var pausedUntil = Math.max(0, readPausedUntil());
    function isPaused() {
      // 另一个模块实例可能刚改过暂停状态；每次判断都以共享存储为准。
      var stored = readPausedUntil();
      if (stored >= 0 && stored !== pausedUntil) pausedUntil = stored;
      return pausedUntil > Date.now();
    }
    function setPause(ms) {
      pausedUntil = ms > 0 ? Date.now() + ms : 0;
      try {
        var store = window.localStorage;
        if (store) {
          if (pausedUntil) store.setItem(PAUSE_KEY, String(pausedUntil));
          else store.removeItem(PAUSE_KEY);
        }
      } catch { /* 隐私模式：不存也不影响本次会话 */ }
      window.dispatchEvent(new CustomEvent("dsh-prompt-predict:pause", { detail: { until: pausedUntil } }));
      return pausedUntil;
    }

    // 最近预测记录：刷新页面、重启 App 都还在（存在应用自身的 localStorage，本机、不上传）
    var runHistory = readStoredHistory();
    var historyLimit = 10;
    // 会话标题：Host 端拿不到（会话对象没有标题字段），所以从客户端的会话 store 里取。
    // 不同版本 store 的形状不一样（数组 / {sessions:[...]} / {byId:{...}}），都试一遍。
    function titleOfSession(value) {
      if (!value || typeof value !== "object") return "";
      var t = value.title || value.name
        || (value.record && value.record.title)
        || (value.meta && value.meta.title)
        || "";
      return typeof t === "string" ? t.trim() : "";
    }
    function titleFromList(state, id) {
      if (!state || !id) return "";
      var list = null;
      if (Array.isArray(state)) list = state;
      else if (Array.isArray(state.sessions)) list = state.sessions;
      else if (Array.isArray(state.list)) list = state.list;
      else if (state.byId && typeof state.byId === "object") list = Object.keys(state.byId).map(function (k) { return state.byId[k]; });
      if (!list) return "";
      for (var i = 0; i < list.length; i += 1) {
        var item = list[i];
        if (!item) continue;
        var sid = item.id || item.sessionId;
        if (sid !== id) continue;
        var title = titleOfSession(item);
        if (title) return title;
      }
      return "";
    }
    // 会话显示名：上述标题优先，拿不到就退回「会话 id 尾部」。
    function runSessionName(run) {
      if (!run) return null;
      if (run.session) return run.session;
      if (!run.sessionId) return null;
      // DSH 的会话 id 形如 session-<uuid>：去掉前缀再取尾部，才不会人人都显示成 "session-"
      var raw = String(run.sessionId).replace(/^session[-_]/i, "");
      if (!raw) return String(run.sessionId);
      return raw.length > 8 ? raw.slice(-8) : raw;
    }
    function recordRun(sessionId, result, error, title, extra) {
      var at = Date.now();
      var entry = {
        id: at.toString(36) + "-" + Math.random().toString(36).slice(2, 8),
        at: at,
        sessionId: sessionId || null,
        session: (result && result.session) || (title && String(title).trim()) || null,
        ms: result && typeof result.ms === "number" ? result.ms : null,
        provider: (result && result.provider) || null,
        model: (result && result.model) || null,
        effortDropped: Boolean(result && result.effortDropped),
        dedupRetry: Boolean(result && result.dedupRetry),
        truncated: Boolean(result && result.truncated),
        suggestion: (result && typeof result.suggestion === "string" && result.suggestion.trim()) || null,
        error: error || null,
        partialChars: extra && typeof extra.partialChars === 'number' ? extra.partialChars : null,
      };
      // 以已落盘的那份为准再插队：dock 与设置页可能是两个模块实例，
      // 各自内存里的 runHistory 会互相覆盖，丢记录的根源就在这里。
      var list = readStoredHistory();
      list.unshift(entry);
      runHistory = list.slice(0, Math.max(1, historyLimit));
      persistHistory();
      window.dispatchEvent(new CustomEvent("dsh-prompt-predict:run", { detail: { latest: entry, history: runHistory.slice() } }));
    }

    // 逐段采纳用：英文按一个词（含其后空格），中日韩一次 2 个字，其余按单字符。
    // 中文没有空格分词，按固定宽度切手感最接近「一点点往里填」。
    function takeChunk(text) {
      var m = text.match(/^\s*[A-Za-z0-9_@.\/#+\-:!?]+[\s]*/);
      if (m && m[0].trim()) return m[0];
      m = text.match(/^[\u3400-\u9fff\uf900-\ufaff]{1,2}/);
      if (m) return m[0];
      m = text.match(/^\s*\S/);
      return m ? m[0] : text;
    }

    // 档位下拉到底按哪个模型取的：跟随会话模型时这点必须让用户看见，
    // 否则「设置里的档位」和「真实调用用的模型」对不上时完全无从察觉。
    function effortSourceHint(st, t) {
      var eff = (st && st.effective) || {};
      var pinned = eff.provider && eff.provider !== "auto" && eff.model && eff.model !== "auto";
      if (pinned) return tt(t, "settings.effortHint");
      var cur = (st && st.sessionModel && st.sessionModel.model ? st.sessionModel : (st && st.current)) || {};
      if (!cur.provider || !cur.model) return tt(t, "settings.effortNoSession");
      return tt(t, "settings.effortFromSession", { provider: cur.provider, model: cur.model });
    }

    // 历史里一行的明细：模型 / 耗时 / 各种降级与截断标记；失败显示原因
    function historyDetail(item, t) {
      if (!item) return "";
      if (item.error) {
        var failed = tt(t, "run.failedShort", { reason: String(item.error).slice(0, 80) });
        if (typeof item.partialChars === "number" && item.partialChars > 0) {
          failed += " · " + tt(t, item.partialChars === 1 ? "run.partialCharsOne" : "run.partialChars", { count: item.partialChars });
        }
        return failed;
      }
      var bits = [(item.provider || "?") + " / " + (item.model || "?")];
      if (typeof item.ms === "number") bits.push(item.ms + " " + tt(t, "run.ms"));
      if (item.effortDropped) bits.push(tt(t, "run.effortDropped"));
      if (item.dedupRetry) bits.push(tt(t, "run.dedupRetry"));
      if (item.truncated) bits.push(tt(t, "run.truncated"));
      return bits.join(" · ");
    }

    // 行内 ghost text 覆盖层：不写进 Lexical，只有 Tab/点击采纳时才 insertText。
    function GhostOverlay(props) {
      var suggestion = props.suggestion;
      var truncated = Boolean(props.truncated);
      var _th = useState(false), truncatedHover = _th[0], setTruncatedHover = _th[1];
      var sessionId = props.sessionId;
      var onAccept = props.onAccept;
      var onReroll = props.onReroll;
      var t = props.t;
      var _p = useState(null), pos = _p[0], setPos = _p[1];

      var measure = useCallback(function () {
        var ed = findEditor(sessionId);
        if (!ed) { setPos(null); return; }
        var r = ed.getBoundingClientRect();
        var cs = getComputedStyle(ed);
        // 宽度也照抄输入框的**内容区**：建议长的时候在原位折行，而不是被 60ch 截断成省略号。
        var padLeft = parseFloat(cs.paddingLeft || "0") || 0;
        var padRight = parseFloat(cs.paddingRight || "0") || 0;
        setPos({
          left: r.left + padLeft,
          top: r.top + parseFloat(cs.paddingTop || "0"),
          width: r.width > 0 ? Math.max(80, r.width - padLeft - padRight) : 0,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          fontWeight: cs.fontWeight,
        });
      }, [sessionId]);

      useEffect(function () {
        measure();
        var ed = findEditor(sessionId);
        var ro = null;
        if (typeof ResizeObserver !== "undefined" && ed) { ro = new ResizeObserver(measure); ro.observe(ed); }
        window.addEventListener("resize", measure, true);
        window.addEventListener("scroll", measure, true);
        return function () {
          if (ro) ro.disconnect();
          window.removeEventListener("resize", measure, true);
          window.removeEventListener("scroll", measure, true);
        };
      }, [measure, suggestion]);

      useEffect(function () {
        var ed = findEditor(sessionId);
        var ph = ed && ed.parentElement ? ed.parentElement.querySelector('[class*="placeholder"]') : null;
        if (ph) ph.style.visibility = "hidden";
        return function () { if (ph) ph.style.visibility = ""; };
      }, [sessionId, suggestion]);

      if (!pos) return null;
      return h("div", {
        role: "status",
        "aria-live": "polite",
        "data-prompt-predict-ghost": "true",
        dir: "auto",
        style: {
          position: "fixed", left: pos.left, top: pos.top, zIndex: 60,
          width: pos.width || undefined,
          pointerEvents: "none",
          fontFamily: pos.fontFamily, fontSize: pos.fontSize, lineHeight: pos.lineHeight, fontWeight: pos.fontWeight,
          // 长建议在原位折行显示，完整可见；只有采纳才写进 Lexical。
          color: token("label-tertiary", colors().ghostText), whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word",
        },
      },
        h("span", {
          style: { color: token("label-tertiary", colors().ghostText) },
        }, suggestion),
        h("span", {
          style: { display: "inline-flex", alignItems: "center", gap: 6, marginInlineStart: 8, whiteSpace: "nowrap", verticalAlign: "middle" },
        },
          h("button", {
            type: "button", onClick: onAccept,
            title: tt(t, "ghost.acceptHint"), "aria-label": tt(t, "ghost.acceptHint"),
            style: {
              pointerEvents: "auto", padding: "0 9px", height: 24, borderRadius: 6,
              border: "1px solid " + token("border-l1", colors().border), background: token("bg-layer-2", colors().softBg),
              color: token("label-secondary", colors().chipText), fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", cursor: "pointer",
            },
          }, "Tab"),
          h("button", {
            type: "button", onClick: onReroll, title: tt(t, "ghost.reroll"), "aria-label": tt(t, "ghost.reroll"),
            style: {
              pointerEvents: "auto", width: 24, height: 24, padding: 0, borderRadius: 6,
              border: "1px solid var(--dsw-alias-border-l1, " + colors().border + ")", background: "var(--dsw-alias-bg-secondary, " + colors().softBg + ")",
              color: token("label-secondary", colors().chipText), fontSize: 12, lineHeight: 1, cursor: "pointer",
            },
          }, "↻"),
          h("span", { style: { color: token("label-tertiary", colors().ghostHint), fontSize: 11, whiteSpace: "nowrap" } }, tt(t, "ghost.dismiss")),
          truncated
            ? h("span", {
              // 覆盖层整体 pointer-events:none：这里单独放开，悬停时把设置路径直接展开在文字里
              //（原生 title 在这个渲染环境不弹，只变光标）
              "data-prompt-predict-truncated": "true", role: "note",
              "aria-label": tt(t, "ghost.truncatedHint"),
              style: { color: colors().ghostTruncated, fontSize: 11, whiteSpace: "nowrap", pointerEvents: "auto", cursor: "help" },
              onMouseEnter: function () { setTruncatedHover(true); },
              onMouseLeave: function () { setTruncatedHover(false); },
            }, truncatedHover ? tt(t, "ghost.truncatedHint") : tt(t, "ghost.truncated"))
            : null
        )
      );
    }

    // 原生 title 在这个渲染环境里不弹（只变光标），改成自绘 tooltip：鼠标移入/键盘聚焦都显示。
    function InfoHint(props) {
      var _o = useState(false), open = _o[0], setOpen = _o[1];
      var show = function () { setOpen(true); };
      var hide = function () { setOpen(false); };
      return h("span", {
        style: SS.hintAnchor,
        tabIndex: 0,
        "data-prompt-predict-hint-more": "true",
        onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide,
      },
        h("span", { style: SS.hintWithMore }, props.text),
        // 浮层气泡：绝对定位，不改变行高
        open ? h("span", { role: "tooltip", style: SS.hintDetail }, props.full) : null);
    }

    // 暂停剩余时间：m:ss
    function formatLeft(ms) {
      var total = Math.max(0, Math.ceil(ms / 1000));
      var m = Math.floor(total / 60);
      var sec = total % 60;
      return m + ":" + (sec < 10 ? "0" + sec : String(sec));
    }

    // 连续失败计数放在模块级：同屏可能同时挂着多个 composer dock（子会话等），
    // 各算各的会导致「两个会话各失败一次」永远到不了提示阈值。
    // 但提示只在**最近失败的那个会话**里显示，避免一个会话超时、满屏 composer 都弹提示。
    var failState = { streak: 0, reason: "", sessionId: null };
    function noteFailure(sessionId, reason) {
      failState = { streak: failState.streak + 1, reason: reason, sessionId: sessionId || null };
      try { window.dispatchEvent(new CustomEvent("dsh-prompt-predict:fail", { detail: failState })); } catch { /* 忽略 */ }
    }
    function noteSuccess() {
      if (!failState.streak) return;
      failState = { streak: 0, reason: "", sessionId: null };
      try { window.dispatchEvent(new CustomEvent("dsh-prompt-predict:fail", { detail: failState })); } catch { /* 忽略 */ }
    }

    // 连续失败时在输入框里给一行提示：以前失败是彻底静默的，用户只会觉得「插件没反应」。
    function ComposerHint(props) {
      var sessionId = props.sessionId;
      var text = props.text;
      var t = props.t;
      var _p = useState(null), pos = _p[0], setPos = _p[1];

      var measure = useCallback(function () {
        var ed = findEditor(sessionId);
        if (!ed) { setPos(null); return; }
        var r = ed.getBoundingClientRect();
        var cs = getComputedStyle(ed);
        var padLeft = parseFloat(cs.paddingLeft || "0") || 0;
        var padRight = parseFloat(cs.paddingRight || "0") || 0;
        setPos({
          left: r.left + padLeft,
          top: r.top + parseFloat(cs.paddingTop || "0"),
          width: r.width > 0 ? Math.max(80, r.width - padLeft - padRight) : 0,
          fontFamily: cs.fontFamily, fontSize: cs.fontSize,
        });
      }, [sessionId]);

      useEffect(function () {
        measure();
        window.addEventListener("resize", measure, true);
        window.addEventListener("scroll", measure, true);
        return function () {
          window.removeEventListener("resize", measure, true);
          window.removeEventListener("scroll", measure, true);
        };
      }, [measure, text]);

      if (!pos) return null;
      return h("div", {
        role: "status",
        "aria-live": "polite",
        "data-prompt-predict-hint": "true",
        dir: "auto",
        style: {
          position: "fixed", left: pos.left, top: pos.top, zIndex: 60,
          width: pos.width || undefined, pointerEvents: "none",
          fontFamily: pos.fontFamily, fontSize: pos.fontSize,
          color: colors().warn, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
        },
      }, text);
    }

    // ================= 建议（composer dock 仅提供生命周期；显示覆盖到输入框内） =================
    function PredictionDock(props) {
      var sessionId = props.sessionId;
      var useSession = props.useSession;
      var useInput = props.useInput;
      var inputActions = props.inputActions;
      var t = props.t;
      // 标题：先看会话 store（列表），再退回当前会话对象本身。两个 hook 都必须无条件调用。
      var useSessions = typeof props.useSessions === "function" ? props.useSessions : function () { return null; };
      var sessionsSnapshot = useSessions(function (value) { return value; });
      var currentSession = useSession(function (value) { return value; });
      var sessionTitle = titleFromList(sessionsSnapshot, sessionId) || titleOfSession(currentSession);
      var running = useSession(function (value) { return Boolean(value && value.running); });
      var blank = useSession(function (value) { return Boolean(value && value.blank); });
      var removed = useSession(function (value) { return Boolean(value && value.removed); });
      var draft = useInput(function (value) { return String(value && value.draft || ""); });
      var _s = useState(""), suggestion = _s[0], setSuggestion = _s[1];
      var _tr = useState(false), truncated = _tr[0], setTruncated = _tr[1];
      var _dt = useState(0), draftTick = _dt[0], setDraftTick = _dt[1];
      var _theme = useState(0), themeTick = _theme[0], setThemeTick = _theme[1];
      var _fail = useState(failState), failure = _fail[0], setFailure = _fail[1];
      var _ac = useState(""), accepted = _ac[0], setAccepted = _ac[1];   // 逐段采纳已写进输入框的前缀
      var _en = useState(true), enabled = _en[0], setEnabled = _en[1];
      var armed = useRef(true);
      var abortRef = useRef(null);
      var sessionRef = useRef(sessionId);
      var dismissedByDraft = useRef(false);
      // rc.2 不再把 draft 暴露给 slot，拿不到「输入框是否为空」。
      // 用等价信号：建议可见时按下任何可打印键 = 用户开始输入 → 立即隐藏。
      var _tk = useState(0), typedTick = _tk[0], setTypedTick = _tk[1];
      var typedSince = useRef(false);
      // 逐段采纳的前缀，只有「输入框里确实还留着它」时才算数：
      // 用户把它删掉后必须重新完整展示整条建议，否则会出现从中间截断的鬼影。
      var prefixKept = accepted !== "" && suggestion.indexOf(accepted) === 0 && draft === accepted;
      var remaining = prefixKept ? suggestion.slice(accepted.length) : suggestion;
      // 打字即隐藏，两种例外：
      //   (a) 草稿又被删空 —— 用户回到了「需要建议」的状态，让它重新浮现（只有 Esc 才是永久忽略）
      //   (b) 草稿正是我们逐段写进去、且没有改动的前缀 —— 不能把自己插的内容误判成用户打字
      dismissedByDraft.current = (draft.trim() !== "" || typedSince.current) && !prefixKept;
      var visibleSuggestion = dismissedByDraft.current ? "" : remaining;

      // 把流式事件应用到 ghost：delta 逐段更新，reset 清空重来，done/error 落历史。
      var applySuggestionEvent = function (event, isReroll) {
        if (!event || controllerAborted()) return;
        if (event.type === "start" || event.type === "reset") {
          setSuggestion("");
          setAccepted("");
          setTruncated(false);
          return;
        }
        if (event.type === "delta" && typeof event.text === "string") {
          typedSince.current = false;
          setSuggestion(event.text);
          return;
        }
        if (event.type === "done" && typeof event.suggestion === "string") {
          typedSince.current = false;
          setSuggestion(event.suggestion.trim());
          if (isReroll) setAccepted("");
          setTruncated(Boolean(event.truncated));
          noteSuccess();
          recordRun(sessionId, event, null, sessionTitle);
          return;
        }
        if (event.type === "error") {
          // 流式失败时可能已经渲染过半句；错误事件必须把 ghost 收回，
          // 不能把半句留在输入框上方。
          setSuggestion("");
          setAccepted("");
          setTruncated(false);
          var reason = event.reason || tt(t, isReroll ? "dock.rerollFailed" : "dock.noSuggestion");
          noteFailure(sessionId, reason);
          recordRun(sessionId, null, reason, sessionTitle, { partialChars: event.partialChars });
        }
      };
      var controllerAborted = function () {
        return Boolean(abortRef.current && abortRef.current.signal.aborted) || sessionRef.current !== sessionId;
      };

      // 首次读取启用状态；设置页保存后通过事件让当前会话立即生效。
      useEffect(function () {
        api("status").then(function (j) {
          setEnabled(!(j && j.effective && j.effective.enabled === false));
          if (j && j.effective && typeof j.effective.historySize === "number") {
            historyLimit = j.effective.historySize;
            trimHistoryToLimit(historyLimit);
          }
        }).catch(function () { });
      }, [sessionId]);
      useEffect(function () {
        var changed = function (event) {
          var on = event.detail?.enabled !== false;
          setEnabled(on);
          if (event.detail && typeof event.detail.historySize === "number") {
            historyLimit = event.detail.historySize;
            trimHistoryToLimit(historyLimit);
          }
          if (!on) {
            setSuggestion("");
            if (abortRef.current) abortRef.current.abort();
          }
        };
        window.addEventListener("dsh-prompt-predict:settings", changed);
        return function () { window.removeEventListener("dsh-prompt-predict:settings", changed); };
      }, []);

      useEffect(function () {
        sessionRef.current = sessionId;
        setLiveSessionId(sessionId);   // 给设置页取「会话实际模型」用（跨模块实例共享）
        armed.current = true;
        dismissedByDraft.current = false;
        setSuggestion("");
        setAccepted("");
        typedSince.current = false;
        if (abortRef.current) abortRef.current.abort();
      }, [sessionId]);

      useEffect(function () {
        if (!enabled) return;
        if (running) {
          armed.current = true;
          dismissedByDraft.current = false;
          setSuggestion("");
          setAccepted("");
          typedSince.current = false;
          if (abortRef.current) abortRef.current.abort();
          return;
        }
        if (!sessionId || blank || removed || !armed.current || isPaused()) return;
        if (draft.trim() !== "" || hasForeignDraft(sessionId, accepted)) return;
        armed.current = false;
        var controller = new AbortController();
        abortRef.current = controller;
        var timer = setTimeout(function () {
          var finished = false;
          var onEvent = function (event) {
            if (event && (event.type === "done" || event.type === "error")) finished = true;
            applySuggestionEvent(event, false);
          };
          apiStream("suggest", { sessionId: sessionId }, onEvent, controller.signal)
            .then(function (result) {
              if (!finished && result) {
                applySuggestionEvent(result.ok
                  ? Object.assign({ type: "done" }, result)
                  : Object.assign({ type: "error" }, result), false);
              }
            })
            .catch(function (error) {
              if (controller.signal.aborted) return;
              setSuggestion("");
              setAccepted("");
              setTruncated(false);
              noteFailure(sessionId, String(error));
              recordRun(sessionId, null, String(error), sessionTitle);
            });
        }, 350);
        return function () {
          clearTimeout(timer);
          controller.abort();
          if (abortRef.current === controller) abortRef.current = null;
        };
      }, [sessionId, running, blank, removed, draft, enabled, draftTick]);

      // 暂停/恢复：暂停时把已显示的建议收掉；恢复时重新武装并触发一次预测
      useEffect(function () {
        var onPause = function (event) {
          var until = (event && event.detail && event.detail.until) || 0;
          // 本模块可能是另一个实例发出的暂停事件，必须先同步共享状态。
          pausedUntil = until > Date.now() ? until : 0;
          if (until > Date.now()) {
            armed.current = false;
            if (abortRef.current) abortRef.current.abort();
            setSuggestion("");
            setAccepted("");
            setTruncated(false);
          } else {
            armed.current = true;
            setDraftTick(function (n) { return n + 1; });
          }
        };
        var onFail = function (event) { setFailure(event && event.detail ? event.detail : failState); };
        var onTheme = function () { setThemeTick(function (n) { return n + 1; }); };
        window.addEventListener("dsh-prompt-predict:pause", onPause);
        window.addEventListener("dsh-prompt-predict:fail", onFail);
        window.addEventListener("dsh-prompt-predict:theme", onTheme);
        return function () {
          window.removeEventListener("dsh-prompt-predict:pause", onPause);
          window.removeEventListener("dsh-prompt-predict:fail", onFail);
          window.removeEventListener("dsh-prompt-predict:theme", onTheme);
        };
      }, []);

      // 因为「有草稿就不预测」会直接 return，草稿被清空后需要重新触发一次。
      // rc.2 没有 draft 可订阅，只能监听编辑器的输入事件，发现变空就 bump 一下。
      useEffect(function () {
        var ed = findEditor(sessionId);
        if (!ed || typeof ed.addEventListener !== "function") return;
        var onInput = function () {
          if (!armed.current) return;                       // 已经预测过 / 正在预测
          if (hasForeignDraft(sessionId, accepted)) return;  // 还有草稿
          setDraftTick(function (n) { return n + 1; });
        };
        var types = ["input", "keyup", "compositionend", "paste", "drop"];
        types.forEach(function (type) { ed.addEventListener(type, onInput, true); });
        return function () {
          types.forEach(function (type) { ed.removeEventListener(type, onInput, true); });
        };
      }, [sessionId, accepted]);

      var accept = useCallback(function () {
        if (!visibleSuggestion || !inputActions || dismissedByDraft.current) return false;
        try {
          var span = inputActions.captureInsertion();
          if (!inputActions.insertText(visibleSuggestion, span)) return false;
          setSuggestion("");
          setAccepted("");
          return true;
        } catch { return false; }
      }, [visibleSuggestion, inputActions, draft]);

      // 逐段采纳：一次塞一小段（Alt+→），可以中途反悔，也可以一路按到整条都进去
      var acceptChunk = useCallback(function () {
        if (!visibleSuggestion || !inputActions || dismissedByDraft.current) return false;
        var chunk = takeChunk(visibleSuggestion);
        if (!chunk) return false;
        try {
          var span = inputActions.captureInsertion();
          if (!inputActions.insertText(chunk, span)) return false;
        } catch { return false; }
        if (chunk.length >= visibleSuggestion.length) { setSuggestion(""); setAccepted(""); }
        else setAccepted(accepted + chunk);
        return true;
      }, [visibleSuggestion, accepted, inputActions, draft]);

      // 换一条：把当前这条作为 avoid 传回去，让模型必须给出不同的建议
      var reroll = useCallback(function () {
        if (!sessionId || !suggestion) return;
        var controller = new AbortController();
        abortRef.current = controller;
        var finished = false;
        var onEvent = function (event) {
          if (event && (event.type === "done" || event.type === "error")) finished = true;
          applySuggestionEvent(event, true);
        };
        apiStream("suggest", { sessionId: sessionId, reroll: true, avoid: suggestion }, onEvent, controller.signal)
          .then(function (result) {
            if (!finished && result) {
              applySuggestionEvent(result.ok
                ? Object.assign({ type: "done" }, result)
                : Object.assign({ type: "error" }, result), true);
            }
          })
          .catch(function (error) {
            if (controller.signal.aborted) return;
            setSuggestion("");
            setAccepted("");
            setTruncated(false);
            noteFailure(sessionId, String(error));
            recordRun(sessionId, null, String(error), sessionTitle);
          });
      }, [sessionId, suggestion]);

      useEffect(function () {
        if (!visibleSuggestion) return;
        var onKey = function (event) {
          if (event.isComposing) return;
          if (!isComposerFocused(sessionId, event)) return;
          if (event.key === "Escape") { event.preventDefault(); setSuggestion(""); setAccepted(""); return; }
          // 任何可打印字符 → 认定用户开始输入，隐藏建议（与「开始输入自动消失」一致）
          if (!typedSince.current && typeof event.key === "string" && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            typedSince.current = true;
            setTypedTick(function (n) { return n + 1; });
          }
          // Option/Alt + → ：逐段采纳（对齐 Codex 的手感）
          if (event.key === "ArrowRight" && event.altKey) {
            if (!acceptChunk()) return;
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          if (event.key !== "Tab" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
          if (!accept()) return;
          event.preventDefault();
          event.stopPropagation();
        };
        // 除了可打印键，粘贴 / 输入法合成 / 任何文本输入 / 拖拽落字 也算「用户开始输入」。
        // 只监听 keydown 的话，中文输入法（key=Process）和 Cmd+V 都躲得过去，灰字会压在正文上。
        var hideOnInput = function () {
          if (typedSince.current) return;
          typedSince.current = true;
          setTypedTick(function (n) { return n + 1; });
        };
        var editor = findEditor(sessionId);
        var inputTarget = editor || window;
        var inputEvents = ["paste", "compositionstart", "beforeinput", "drop"];
        inputEvents.forEach(function (type) { inputTarget.addEventListener(type, hideOnInput, true); });
        window.addEventListener("keydown", onKey, true);
        return function () {
          inputEvents.forEach(function (type) { inputTarget.removeEventListener(type, hideOnInput, true); });
          window.removeEventListener("keydown", onKey, true);
        };
      }, [visibleSuggestion, accept, acceptChunk, sessionId]);

      // 建议直接以灰色 ghost text 覆盖在 Lexical 输入框首字符处。
      if (!enabled) return null;
      if (!visibleSuggestion) {
        // 连续两次失败才提示，避免偶发超时刷屏；用户开始输入就不再打扰
        if (failure && failure.streak >= 2 && failure.sessionId === sessionId && !typedSince.current && !hasForeignDraft(sessionId, accepted)) {
          return h(ComposerHint, { sessionId: sessionId, text: tt(t, "dock.failureHint", { reason: String(failure.reason || "").slice(0, 80) }), t: t });
        }
        return null;
      }
      if (dismissedByDraft.current || hasForeignDraft(sessionId, accepted)) return null;
      // 回到覆盖层：它在真实环境里是可见的（dock 内联行实测看不见）。
      // 「打字即隐藏」由上面的 typedSince 信号负责，不再依赖草稿状态。
      return h(GhostOverlay, { suggestion: visibleSuggestion, sessionId: sessionId, truncated: truncated, onAccept: accept, onReroll: reroll, t: t });
    }

    // ================= 设置页 =================
    function SettingsSection(props) {
      var t = props.t;
      var _st = useState(null), st = _st[0], setSt = _st[1];
      var _cat = useState(null), cat = _cat[0], setCat = _cat[1];
      var _catErr = useState(""), catalogError = _catErr[0], setCatalogError = _catErr[1];
      var _pv = useState(""), provider = _pv[0], setProvider = _pv[1];
      var _md = useState(""), model = _md[0], setModel = _md[1];
      var _to = useState(12), timeoutSec = _to[0], setTimeoutSec = _to[1];
      var _ctx = useState(8), ctxSize = _ctx[0], setCtxSize = _ctx[1];
      var _mc = useState(6000), maxChars = _mc[0], setMaxChars = _mc[1];
      var _mt = useState(120), outputChars = _mt[0], setOutputChars = _mt[1];
      var _hs = useState(10), historySize = _hs[0], setHistorySize = _hs[1];
      var _sl = useState("auto"), suggestionLanguage = _sl[0], setSuggestionLanguage = _sl[1];
      var _lo = useState(DEFAULT_LANGUAGE_CODES), languageCodes = _lo[0], setLanguageCodes = _lo[1];
      var _lx = useState(false), languagesExpanded = _lx[0], setLanguagesExpanded = _lx[1];
      var _ef = useState("off"), effort = _ef[0], setEffort = _ef[1];
      var _eo = useState([]), effortOptions = _eo[0], setEffortOptions = _eo[1];
      var _hist = useState(runHistory.slice()), history = _hist[0], setHistory = _hist[1];
      var _open = useState(null), openKey = _open[0], setOpenKey = _open[1];   // null = 默认展开第一条
      var _listOpen = useState(false), listOpen = _listOpen[0], setListOpen = _listOpen[1];
      var run = history[0] || null;
      var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
      var _msg = useState(null), msg = _msg[0], setMsg = _msg[1];
      var _adv = useState(false), adv = _adv[0], setAdv = _adv[1];
      var _dirty = useState(false), dirty = _dirty[0], setDirty = _dirty[1];
      var _try = useState(null), tryResult = _try[0], setTryResult = _try[1];
      var _copied = useState(""), copiedKey = _copied[0], setCopiedKey = _copied[1];
      var _pause = useState(pausedUntil), pauseState = _pause[0], setPauseState = _pause[1];
      var _theme2 = useState(0), themeTick2 = _theme2[0], setThemeTick2 = _theme2[1];
      var _ver = useState(null), pluginVersion = _ver[0], setPluginVersion = _ver[1];
      var _undo = useState(null), undoSnapshot = _undo[0], setUndoSnapshot = _undo[1];   // 清空后可撤销的快照

      function togglePause() {
        var until = isPaused() ? setPause(0) : setPause(10 * 60 * 1000);
        setPauseState(until);
      }
      // 深色模式切换时重渲染（SS 是模块级样式表，切换后需要重新取）
      useEffect(function () {
        var onTheme = function () { setThemeTick2(function (n) { return n + 1; }); };
        var onPause = function (event) {
          var until = (event && event.detail && event.detail.until) || 0;
          setPauseState(until > Date.now() ? until : 0);
        };
        window.addEventListener("dsh-prompt-predict:theme", onTheme);
        window.addEventListener("dsh-prompt-predict:pause", onPause);
        return function () {
          window.removeEventListener("dsh-prompt-predict:theme", onTheme);
          window.removeEventListener("dsh-prompt-predict:pause", onPause);
        };
      }, []);

      // 暂停中每秒刷新剩余时间；到点自动恢复
      useEffect(function () {
        if (!pauseState) return;
        var timer = setInterval(function () {
          if (isPaused()) { setPauseState(pausedUntil); return; }
          setPauseState(0);
        }, 1000);
        return function () { clearInterval(timer); };
      }, [pauseState]);

      function clearHistory() {
        var snapshot = readStoredHistory();
        runHistory = [];
        persistHistory();
        setHistory([]);
        setCopiedKey("");
        setUndoSnapshot(snapshot);
        window.dispatchEvent(new CustomEvent("dsh-prompt-predict:run", { detail: { latest: null, history: [] } }));
        // 5 秒后撤销入口自动消失（记录已经真的删了）
        setTimeout(function () { setUndoSnapshot(null); }, 5000);
      }
      function undoClear() {
        if (!undoSnapshot || !undoSnapshot.length) return;
        // 清空后可能已经有新预测落盘：撤销必须合并，不能整份覆盖。
        var merged = mergeHistoryLists(readStoredHistory(), undoSnapshot, historyLimit);
        runHistory = merged;
        persistHistory();
        setHistory(merged.slice());
        setUndoSnapshot(null);
        window.dispatchEvent(new CustomEvent("dsh-prompt-predict:run", { detail: { latest: runHistory[0] || null, history: runHistory.slice() } }));
      }
      function copySuggestion(key, text) {
        var done = function () {
          setCopiedKey(key);
          setTimeout(function () { setCopiedKey(function (cur) { return cur === key ? "" : cur; }); }, 1500);
        };
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(function () { done(); });
            return;
          }
        } catch { /* 落到下面的兜底 */ }
        try {
          var ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          document.execCommand("copy"); document.body.removeChild(ta);
        } catch { /* 复制失败就算了，不打断用户 */ }
        done();
      }

      function loadAll() {
        // 带上当前会话 id：这样「跟随会话模型」时档位下拉拿到的是会话真实模型，
        // 而不是全局默认模型——两者不同时会让用户选到不被支持的档位。
        api("status" + (currentLiveSessionId() ? "?sessionId=" + encodeURIComponent(currentLiveSessionId()) : "")).then(function (j) {
          if (!j || !j.ok) return;
          setSt(j);
          if (j.version) setPluginVersion(String(j.version));
          var eff = j.effective || {};
          setProvider(eff.provider || "");
          setModel(eff.model || "");
          setTimeoutSec(Math.round((eff.timeoutMs || 12000) / 1000));
          setCtxSize(eff.maxMessages || 8);
          setMaxChars(eff.maxChars || 6000);
          setOutputChars(eff.outputChars || 120);
          setHistorySize(eff.historySize || 10);
          setSuggestionLanguage(normalizeSavedLanguage(eff.suggestionLanguage || "auto"));
          if (Array.isArray(j.languages) && j.languages.length) setLanguageCodes(j.languages);
          historyLimit = eff.historySize || 10;
          var stored = trimHistoryToLimit(historyLimit);
          setHistory(stored);
          setEffort(eff.reasoningEffort || "off");
          setDirty(false);
        }).catch(function () { });
        api("catalog").then(function (j) {
          if (j && j.ok) { setCat(j.groups || []); setCatalogError(""); }
          else setCatalogError((j && j.reason) || tt(t, "settings.catalogFailed"));
        }).catch(function (e) { setCatalogError(String(e)); });
      }
      useEffect(function () { loadAll(); }, []);

      // 设置页打开时若已有预测记录，直接显示；之后靠事件实时刷新
      useEffect(function () {
        var on = function (event) {
          // localStorage 是唯一数据源：dock 与设置页可能是两个模块实例，
          // 光靠事件只能看到「挂载之后」发生的那几条。
          var stored = readStoredHistory();
          setHistory(stored.length ? stored : ((event.detail && event.detail.history) || []));
        };
        window.addEventListener("dsh-prompt-predict:run", on);
        return function () { window.removeEventListener("dsh-prompt-predict:run", on); };
      }, []);

      // 思考档位跟随所选模型动态生成（模型不支持的档位不出现，避免保存被拒）；
      // 选「跟随当前会话模型」时优先用**该会话实际使用的模型**（st.sessionModel），
      // 拿不到才退回全局默认——否则下拉里的档位可能和真实调用用的模型对不上。
      useEffect(function () {
        var p = provider, m = model;
        if (p === "auto" || m === "auto") {
          var cur = (st && (st.sessionModel && st.sessionModel.model ? st.sessionModel : st.current)) || {};
          p = cur.provider; m = cur.model;
        }
        if (!p || !m) { setEffortOptions([]); return; }
        api("efforts?provider=" + encodeURIComponent(p) + "&model=" + encodeURIComponent(m))
          .then(function (j) { setEffortOptions(j && j.ok && Array.isArray(j.efforts) ? j.efforts : []); })
          .catch(function () { setEffortOptions([]); });
      }, [provider, model, st]);

      // 不可用的 provider 也要列出来：报错可见，但选项禁用，避免误选后保存失败。
      function providerGroups() { return (cat || []).filter(function (g) { return g && g.id; }); }
      function modelsOf(p) {
        var g = (cat || []).find(function (x) { return x.id === p; });
        return g && Array.isArray(g.models) ? g.models : [];
      }

      function save() {
        setBusy(true); setMsg(null);
        api("settings", {
          provider: provider, model: model,
          timeoutMs: timeoutSec * 1000,
          maxMessages: ctxSize,
          maxChars: maxChars,
          outputChars: outputChars,
          historySize: historySize,
          suggestionLanguage: suggestionLanguage,
          reasoningEffort: effort,
        }).then(function (j) {
          if (j && j.ok) { trimHistoryToLimit(historySize); notifySettings(j.effective); setMsg({ ok: true, text: tt(t, "settings.saved") }); setDirty(false); loadAll(); }
          else setMsg({ ok: false, text: (j && j.reason) || tt(t, "settings.saveFailed") });
        }).catch(function (e) { setMsg({ ok: false, text: String(e) }); })
          .finally(function () { setBusy(false); });
      }
      function toggleEnabled(on) {
        setBusy(true); setMsg(null);
        api("settings", { enabled: on }).then(function (j) {
          if (j && j.ok) { notifySettings(j.effective); setSt(Object.assign({}, st, { effective: j.effective })); loadAll(); setMsg({ ok: true, text: on ? tt(t, "settings.enabled") : tt(t, "settings.disabled") }); }
          else setMsg({ ok: false, text: (j && j.reason) || tt(t, "settings.actionFailed") });
        }).catch(function (e) { setMsg({ ok: false, text: String(e) }); })
          .finally(function () { setBusy(false); });
      }
      // 「试一下」：直接打 /suggest，走的是和 composer 完全相同的链路（模型路由、语言、字数、
      // 截断重试都包含），所以能用来确认设置到底生效没有。
      function runTry() {
        var sid = currentLiveSessionId();
        if (!sid) { setMsg({ ok: false, text: tt(t, "settings.testNeedSession") }); return; }
        setBusy(true); setMsg(null); setTryResult(null);
        api("suggest", { sessionId: sid })
          .then(function (j) {
            if (j && j.ok && typeof j.suggestion === "string" && j.suggestion.trim()) {
              setTryResult({
                text: j.suggestion.trim(),
                truncated: Boolean(j.truncated),
                meta: tt(t, "settings.testMeta", {
                  provider: j.provider || "?", model: j.model || "?",
                  ms: typeof j.ms === "number" ? j.ms : "?",
                  unit: tt(t, "run.ms"),
                }),
              });
              recordRun(sid, j, null, null);
            } else {
              setMsg({ ok: false, text: (j && j.reason) || tt(t, "dock.noSuggestion") });
            }
          })
          .catch(function (e) { setMsg({ ok: false, text: String(e) }); })
          .finally(function () { setBusy(false); });
      }

      function resetDefaults() {
        setBusy(true); setMsg(null);
        api("settings", { reset: true }).then(function (j) {
          if (j && j.ok) { notifySettings(j.effective); setMsg({ ok: true, text: tt(t, "settings.resetDone") }); loadAll(); }
        }).finally(function () { setBusy(false); });
      }

      if (!st) return h("div", { style: SS.card, dir: "auto" }, h("p", { style: SS.muted }, tt(t, "settings.loading")));
      var eff = st.effective || {};
      var enabled = eff.enabled !== false;

      return h("div", { style: SS.card, dir: "auto" },
        h("p", { style: SS.title },
          tt(t, "settings.title"),
          pluginVersion
            ? h("span", { style: SS.version, "data-prompt-predict-version": "true" }, "v" + pluginVersion)
            : null),
        h("p", { style: SS.muted }, tt(t, "settings.desc")),

        h("div", { style: SS.row },
          h("span", { style: SS.label }, tt(t, "settings.enable")),
          h("button", { type: "button", style: SS.toggleTrack(enabled), onClick: function () { toggleEnabled(!enabled); }, disabled: busy, "aria-pressed": enabled },
            h("span", { style: SS.toggleThumb(enabled) })),
          h("span", { style: SS.muted }, enabled ? tt(t, "settings.on") : tt(t, "settings.off"))),

        h("div", { style: SS.divider }),

        h("div", { style: SS.row },
          h("span", { style: SS.label }, tt(t, "settings.provider")),
          h("select", {
            style: SS.select, value: provider, disabled: !enabled || busy, "aria-label": tt(t, "settings.provider"),
            onChange: function (e) {
              var p = e.target.value;
              setProvider(p);
              if (p === "auto") { setModel("auto"); }
              else { var ms = modelsOf(p); setModel(ms.length ? ms[0].id : ""); }
              setEffort("auto"); setDirty(true);
            },
          },
            h("option", { value: "auto" }, tt(t, "settings.followSession")),
            providerGroups().map(function (g) {
              return h("option", {
                key: g.id, value: g.id, disabled: Boolean(g.error),
              }, g.name + "（" + g.id + (g.error ? " · " + tt(t, "settings.providerUnavailableShort") : "") + "）");
            }))),
        h("div", { style: SS.row },
          h("span", { style: SS.label }, tt(t, "settings.model")),
          h("select", {
            style: SS.select, value: model, disabled: !enabled || busy || provider === "auto", "aria-label": tt(t, "settings.model"),
            onChange: function (e) { setModel(e.target.value); setEffort("auto"); setDirty(true); },
          },
            provider === "auto"
              ? h("option", { value: "auto" }, tt(t, "settings.followSession"))
              : (function () {
                  var models = modelsOf(provider);
                  if (!models.length) return h("option", { value: "", disabled: true }, tt(t, "settings.noModels"));
                  return models.map(function (m) {
                    return h("option", { key: m.id, value: m.id }, m.name + "（" + m.id + "）");
                  });
                })())),
        h("p", { style: SS.muted }, tt(t, "settings.modelHint")),
        catalogError
          ? h("p", { style: SS.warnBlock }, tt(t, "settings.catalogError", { detail: catalogError }))
          : null,
        (function () {
          var selected = (cat || []).find(function (g) { return g.id === provider; });
          return selected && selected.error
            ? h("p", { style: SS.warnBlock }, tt(t, "settings.providerError", { detail: selected.error }))
            : null;
        })(),

        h("p", { style: SS.muted }, tt(t, "settings.predictionSection")),
        h("div", { style: SS.row },
        h("span", { style: SS.label }, tt(t, "settings.suggestionLanguage")),
        h("select", {
            style: SS.select, value: languageFamily(suggestionLanguage), disabled: !enabled || busy, "aria-label": tt(t, "settings.suggestionLanguage"),
            "data-prompt-predict-language": "true",
            onChange: function (e) {
              var next = e.target.value;
              if (next === MORE_LANGUAGES) { setLanguagesExpanded(true); return; }   // 只展开，不改选择
              var variants = familyVariants(next);
              var keep = variants.some(function (item) { return item[0] === suggestionLanguage; });
              setSuggestionLanguage(variants.length > 1 ? (keep ? suggestionLanguage : variants[0][0]) : next);
              setDirty(true);
            },
          },
            (function () {
              var shownBases = MAINSTREAM_LANGUAGE_CODES.slice();
              var extras = languageCodes.filter(function (code) {
                return !MANAGED_CODES[code] && shownBases.indexOf(code) === -1;
              });
              var options = [h("option", { key: "auto", value: "auto" }, tt(t, "settings.languageAuto"))];
              shownBases.forEach(function (code) {
                options.push(h("option", { key: code, value: code }, languageLabel(code)));
              });
              if (languagesExpanded) {
                extras.forEach(function (code) {
                  options.push(h("option", { key: code, value: code }, languageLabel(code)));
                });
              } else if (extras.length) {
                options.push(h("option", { key: MORE_LANGUAGES, value: MORE_LANGUAGES }, tt(t, "settings.languageMore", { count: extras.length })));
              }
              return options;
            })()),
          (function () {
            var variants = familyVariants(languageFamily(suggestionLanguage));
            if (variants.length < 2) return null;
            var current = variants.some(function (item) { return item[0] === suggestionLanguage; })
              ? suggestionLanguage : variants[0][0];
            return h("select", {
              style: Object.assign({}, SS.select, { maxWidth: 140 }),
              value: current, disabled: !enabled || busy,
              "data-prompt-predict-language-region": "true",
              title: tt(t, "settings.languageRegion"),
              onChange: function (e) { setSuggestionLanguage(e.target.value); setDirty(true); },
            }, variants.map(function (item) {
              return h("option", { key: item[0], value: item[0] }, regionLabel(item[0], languageFamily(suggestionLanguage), t));
            }));
          })(),
          h(InfoHint, { text: tt(t, "settings.suggestionLanguageHint"), full: tt(t, "settings.suggestionLanguageHintFull") })),
        h("div", { style: SS.row },
          h("span", { style: SS.label }, tt(t, "settings.outputChars")),
          h("input", { style: SS.input, type: "number", min: 20, max: 400, step: 10, value: outputChars, disabled: !enabled || busy, "data-prompt-predict-chars": "true", "aria-label": tt(t, "settings.outputChars"), onChange: function (e) { setOutputChars(Number(e.target.value)); setDirty(true); } }),
          h(InfoHint, { text: tt(t, "settings.outputCharsHint") + wordHint(suggestionLanguage, outputChars, t), full: tt(t, "settings.outputCharsHintFull") })),

        h("div", { style: SS.row },
          h("span", { style: SS.label }, tt(t, "settings.pause")),
          h("button", {
            type: "button", style: dim(Object.assign({}, SS.btnGhost, { whiteSpace: "nowrap" }), busy), disabled: busy,
            "data-prompt-predict-pause": "true", "aria-pressed": Boolean(pauseState),
            onClick: togglePause,
          }, pauseState
            ? tt(t, "settings.pauseResume")
            : tt(t, "settings.pauseStart", { minutes: 10 })),
          h(InfoHint, {
            text: pauseState
              ? tt(t, "settings.pauseLeft", { time: formatLeft(pauseState - Date.now()) })
              : tt(t, "settings.pauseHint", { minutes: 10 }),
            full: tt(t, "settings.pauseHintFull"),
          })),

        h("p", null, h("button", { style: SS.advBtn, "aria-expanded": adv, onClick: function () { setAdv(!adv); } }, (adv ? "▾" : "▸") + tt(t, "settings.advanced"))),
        adv ? h("div", null,
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.timeout")),
            h("input", { style: SS.input, type: "number", min: 1, max: 60, value: timeoutSec, "aria-label": tt(t, "settings.timeout"), disabled: !enabled || busy, onChange: function (e) { setTimeoutSec(Number(e.target.value)); setDirty(true); } }),
            h("span", { style: SS.muted }, tt(t, "settings.timeoutUnit"))),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.contextSize")),
            h("select", { style: SS.select, value: ctxSize, disabled: !enabled || busy, "aria-label": tt(t, "settings.contextSize"), onChange: function (e) { setCtxSize(Number(e.target.value)); setDirty(true); } },
              h("option", { value: 3 }, tt(t, "settings.contextSmall")),
              h("option", { value: 8 }, tt(t, "settings.contextStandard")),
              h("option", { value: 12 }, tt(t, "settings.contextLarge"))),
            h("span", { style: SS.muted }, tt(t, "settings.contextHint"))),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.maxChars")),
            h("input", { style: SS.input, type: "number", min: 1000, max: 20000, step: 500, value: maxChars, "aria-label": tt(t, "settings.maxChars"), disabled: !enabled || busy, onChange: function (e) { setMaxChars(Number(e.target.value)); setDirty(true); } }),
            h("span", { style: SS.muted }, tt(t, "settings.maxCharsHint"))),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.historySize")),
            h("input", { style: SS.input, type: "number", min: 1, max: 50, step: 1, value: historySize, "aria-label": tt(t, "settings.historySize"), disabled: !enabled || busy, onChange: function (e) { setHistorySize(Number(e.target.value)); setDirty(true); } }),
            h("span", { style: SS.muted }, tt(t, "settings.historySizeHint", { storage: tt(t, storagePlatformKey()) }))),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.effort")),
            h("select", { style: SS.select, value: effort, disabled: !enabled || busy, "aria-label": tt(t, "settings.effort"), onChange: function (e) { setEffort(e.target.value); setDirty(true); } },
              h("option", { value: "auto" }, effortOptions.length === 0 ? tt(t, "settings.effortDefaultNoLevels") : tt(t, "settings.effortDefault")),
              (function () {
                var ids = effortOptions.slice();
                if (effort && effort !== "auto" && ids.indexOf(effort) === -1) ids.push(effort); // 保留当前已保存值，避免下拉显示错位
                return ids.map(function (id) {
                  return h("option", { key: id, value: id }, tt(t, EFFORT_LABEL_KEYS[id] || id) + (id === "off" ? tt(t, "settings.effortFastest") : ""));
                });
              })()),
            h("span", { style: SS.muted }, effortSourceHint(st, t))) ) : null,

        h("div", { style: SS.divider }),
        h("div", { style: SS.histHead },
          h("span", { style: SS.sectionTitle, }, tt(t, "settings.historyTitle", { count: history.length, limit: historySize })),
          history.length > 1
            ? h("button", {
              type: "button",
              style: SS.histToggle,
              "data-prompt-predict-history-toggle": "true",
              onClick: function () { setListOpen(!listOpen); },
            }, (listOpen ? "▾ " : "▸ ") + tt(t, listOpen ? "settings.historyCollapse" : "settings.historyExpand"))
            : null,
          history.length
            ? h("button", {
              type: "button", style: SS.histToggle, "data-prompt-predict-history-clear": "true",
              onClick: clearHistory,
            }, tt(t, "settings.historyClear"))
            : null),
        // 真被截断时不用展开「高级」就能看到：直接给可执行的建议
        run && run.truncated
          ? h("p", { style: SS.warnBlock }, tt(t, "settings.truncatedWarn"))
          : null,
        undoSnapshot && undoSnapshot.length
          ? h("p", { style: SS.histHint },
            h("span", null, tt(t, "settings.historyCleared")),
            h("button", {
              type: "button", style: SS.linkBtn, "data-prompt-predict-history-undo": "true",
              onClick: undoClear,
            }, tt(t, "settings.historyUndo")))
          : null,
        history.length === 0
          ? h("p", { style: SS.muted }, tt(t, "settings.historyEmpty"))
          : h("div", null,
            h("p", { style: SS.histHint }, tt(t, "settings.historyHint")),
            (function () {
              var shown = history.slice(0, listOpen ? historySize : 1);
              var firstKey = shown.length ? String(shown[0].at) + "-0" : "";
              var activeKey = openKey === null ? firstKey : openKey;
              return shown.map(function (item, index) {
                var key = String(item.at) + "-" + index;
                var isOpen = activeKey === key;
                return h("div", { key: key, style: SS.histRowWrap },
                  h("button", {
                    type: "button",
                    "data-prompt-predict-history-row": "true", "aria-expanded": isOpen,
                    style: Object.assign({}, SS.histRow, SS.histRowButton),
                    onClick: function () { setOpenKey(isOpen ? "" : key); },
                    title: tt(t, "settings.historyToggle"),
                  },
                    h("span", { style: SS.histCaret }, isOpen ? "▾" : "▸"),
                    h("span", { style: SS.histWhen }, new Date(item.at).toLocaleTimeString(uiLocale())),
                    h("span", { style: SS.histWho, title: String(runSessionName(item) || "") }, runSessionName(item) || "-"),
                    h("span", { style: SS.histWhat, title: historyDetail(item, t) }, historyDetail(item, t))),
                  isOpen
                    ? h("div", { style: SS.histText },
                      h("span", { style: SS.histTextBody }, item.suggestion || tt(t, "settings.historyNoText")),
                      item.suggestion
                        ? h("button", {
                          type: "button", style: SS.copyBtn, "data-prompt-predict-history-copy": "true",
                          onClick: function (event) { if (event) event.stopPropagation(); copySuggestion(key, item.suggestion); },
                          onKeyDown: function (event) { if (event) event.stopPropagation(); },
                        }, copiedKey === key ? tt(t, "settings.historyCopied") : tt(t, "settings.historyCopy"))
                        : null)
                    : null);
              });
            })()),

        h("div", { style: { display: "flex", gap: 10, marginTop: 16 } },
          h("button", { style: dim(SS.btnPrimary, busy || !dirty), onClick: save, disabled: busy || !dirty }, busy ? tt(t, "settings.saving") : tt(t, "settings.save")),
          h("button", { style: dim(SS.btnGhost, busy), onClick: resetDefaults, disabled: busy }, tt(t, "settings.reset")),
          h("button", {
            style: dim(SS.btnGhost, busy), disabled: busy, "data-prompt-predict-try": "true",
            onClick: runTry,
          }, busy ? tt(t, "settings.testing") : tt(t, "settings.test"))),
        tryResult
          ? h("div", { style: SS.tryBox },
            h("span", null, tt(t, "settings.testResult", { text: tryResult.text })),
            tryResult.truncated ? h("span", { style: SS.warnInline }, tt(t, "ghost.truncated")) : null,
            h("span", { style: SS.tryMeta }, tryResult.meta))
          : null,
        msg ? h("p", { style: msg.ok ? SS.ok : SS.err }, msg.text) : null);
    }

    function apply(ctx) {
      // 注册词典并绑定翻译函数：DSH 的 locale 服务会把语言切换即时应用到已挂载的界面；
      // 没有该服务（旧运行时）时保持中文兜底，不会退化成显示 key。
      watchTheme();
      try {
        if (ctx.locale && typeof ctx.locale.register === "function") {
          // 注册全部语言的词典（漏注册会让该语言的界面整屏退回中文）
          var dicts = {};
          Object.keys(DICT).forEach(function (lang) { dicts[lang] = DICT[lang]; });
          ctx.locale.register(NS, dicts);
          boundTranslate = ctx.locale.bind(NS);
          localeService = ctx.locale;      // currentLang() 要读它的快照
        }
      } catch { /* 保持中文 */ }
      ctx.slots.inject("conversation.composer.dock", function () {
        return ctx.slots.register({
          name: "conversation.composer.dock",
          id: "prompt-prediction",
          order: 10,
        }, PredictionDock);
      });
      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register({
          name: "settings.section",
          id: "prompt-predict",
          order: 2,
          label: function () { return tt(boundTranslate, "settings.title"); },
          inject: function () { return {}; },
        }, SettingsSection);
      });
    }

    module.exports = { name: name, inject: inject, apply: apply };
    return module.exports;
  },
});

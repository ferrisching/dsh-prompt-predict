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
        "ghost.regenHint": "↓ 重新生成",
        "ghost.truncated": "已截断 · 建议调高字数上限",
        "ghost.truncatedHint": "已截断 · 到 设置 → 提示词联想 → 高级 调高「字数上限」",
        "settings.title": "提示词联想",
        "settings.desc": "助手回复结束后，在输入框里直接给出灰色建议（Tab 采纳、Esc 忽略、开始输入自动消失）。",
        "settings.saveHint": "注意：所有设置修改后都需要点击「保存」才会生效。",
        "settings.enable": "启用联想",
        "settings.on": "已开启",
        "settings.shortcutHint": "快捷键：Ctrl/⌘+Shift+Space 手动触发；Tab 采纳，↓ 重新生成，Esc 忽略",
        "settings.off": "已关闭",
        "settings.provider": "提供商",
        "settings.refreshModels": "刷新",
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
        "settings.multiline": "保留多行格式",
        "settings.multilineHint": "代码/列表建议保留换行与缩进；关闭后一律压成单行（不是多条建议）",
        "settings.switchEnabled": "可切换提示词",
        "settings.switchEnabledHint": "开启后可用 ↓ 生成下一条、↑ 回到上一条；关闭后方向键不切换",
        "settings.switchLimit": "最大切换次数",
        "settings.switchLimitHint": "每轮最多生成几条新建议（0–10；0 = 不限）；↑ 回看不计入",
        "dock.switchLimit": "已达到最大切换次数（{limit} 次），按 ↑ 可回看",
        "ghost.nextHint": "↓ 下一条",
        "ghost.prevHint": "↑ 上一条",
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
        "settings.testing": "请求中…",
        "settings.testNeedSession": "先打开一个会话再试（设置页拿不到会话上下文）",
        "settings.testResult": "示例建议：{text}",
        "settings.testMeta": "{provider} / {model} · {ms} {unit}",
        "settings.checkUpdate": "检查更新",
        "settings.updateChecking": "检查中…",
        "settings.updateLatest": "已是最新版本",
        "settings.updateFound": "发现新版本 v{version}",
        "settings.updateCommand": "更新命令：{command}",
        "settings.updateStep1": "升级步骤：1. 完全退出 App（Cmd+Q），升级不能在被使用中执行",
        "settings.updateStep2": "2. 在终端执行上面的命令（profile 已按当前环境填好；自定义 profile 请自行替换）",
        "settings.updateStep3": "3. 重新打开 App 生效；仅客户端改动时刷新窗口即可",
        "settings.updateOtherEnv": "如需在另一个环境也安装，把命令中的 profile 换成另一个（desktop ↔ web）后重复执行。",
        "settings.updateCopy": "复制命令",
        "settings.updateCopied": "已复制",
        "settings.updateError": "检查失败：无法访问 registry.npmjs.org",
        "settings.updateAutoFailed": "自动检查更新失败，可点上方「检查更新」重试。",
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
        "settings.historyInsert": "插入",
        "settings.historyInserted": "已插入",
        "settings.historyAccepted": "已采纳",
        "settings.historyCopied": "已复制",
        "settings.historyNoText": "这次预测没有记录到建议原文（功能上线前的旧记录）",
        "settings.historyEmpty": "还没有记录：触发一次联想后，这里会列出最近几次的会话、模型、耗时和异常标记。",
        "settings.historyOff": "历史记录已关闭（0 条）：不会在本机保存建议原文。",
        "settings.predictionSection": "预测内容",
        "settings.suggestionLanguage": "建议语言",
        "settings.suggestionLanguageHint": "跟随对话，也可固定",
        "settings.suggestionLanguageHintFull": "默认按对话判断语言；固定一种后，所有建议都用它书写（带地区变体的语言还会多出一个地区下拉）",
        "settings.languageAuto": "自动（跟随对话）",
        "settings.languageMore": "更多语言…（另有 {count} 种）",
        "settings.languageRegion": "地区",
        "settings.historySize": "记录条数",
        "settings.historySizeHint": "保留最近多少次预测记录（0–50，0 = 关闭历史）。记录存在{storage}，本机、不上传，刷新/重启后仍在",
        "storage.electron": "本应用内（Electron 渲染层存储）",
        "storage.web": "浏览器的 localStorage",
        "dock.noSuggestion": "预测未返回有效建议",
        "dock.rerollFailed": "换一条失败",
        "dock.generatingAny": "正在生成建议…",
        "dock.manualFailed": "换一条失败：{reason}",
        "dock.discarded": "结果被丢弃：{why}",
        "dock.whyComposing": "输入法合成状态未结束",
        "dock.whyTyping": "请求期间检测到输入",
        "dock.whyDraft": "输入框里已有文字",
        "dock.openSettings": "打开设置",
        "dock.copySettingsPath": "复制设置路径",
        "dock.settingsPath": "设置 → 提示词联想",
        "dock.paused": "预测已暂停 · {time} 后恢复",
        "dock.failureHint": "联想没成功：{reason}（连按两次失败才提示，可在 设置 → 提示词联想 里查看记录）",
      },
      en: {
        "effort.off": "Off", "effort.minimal": "Minimal", "effort.low": "Low",
        "effort.medium": "Medium", "effort.high": "High", "effort.max": "Max",
        "ghost.acceptHint": "Tab to accept · Alt+→ piece by piece",
        "ghost.reroll": "Suggest another",
        "ghost.dismiss": "Esc to dismiss",
        "ghost.regenHint": "↓ regenerate",
        "ghost.truncated": "cut off · raise the output length",
        "ghost.truncatedHint": "cut off · raise Output length in Settings → Prompt suggestions → Advanced",
        "settings.title": "Prompt suggestions",
        "settings.desc": "Shows a gray suggestion in the composer right after each reply (Tab to accept, Esc to dismiss, start typing and it goes away).",
        "settings.saveHint": "Note: all settings take effect only after you click Save.",
        "settings.enable": "Enable predictions",
        "settings.on": "On",
        "settings.shortcutHint": "Shortcuts: Ctrl/⌘+Shift+Space to trigger; Tab accepts, ↓ regenerates, Esc dismisses",
        "settings.off": "Off",
        "settings.provider": "Provider",
        "settings.refreshModels": "Refresh",
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
        "settings.multiline": "Keep multi-line formatting",
        "settings.multilineHint": "Keep code/list line breaks and indentation; off forces one line (not multiple suggestions)",
        "settings.switchEnabled": "Switchable suggestions",
        "settings.switchEnabledHint": "When on, ↓ generates the next suggestion and ↑ goes back to the previous one; off disables arrow switching",
        "settings.switchLimit": "Max switches",
        "settings.switchLimitHint": "max new suggestions generated per round (0–10; 0 = unlimited); going back with ↑ does not count",
        "dock.switchLimit": "Switch limit reached ({limit}); press ↑ to go back",
        "ghost.nextHint": "↓ next",
        "ghost.prevHint": "↑ previous",
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
        "settings.testing": "Requesting…",
        "settings.testNeedSession": "Open a conversation first - the settings page has no session context",
        "settings.testResult": "Sample suggestion: {text}",
        "settings.testMeta": "{provider} / {model} · {ms} ms",
        "settings.checkUpdate": "Check for updates",
        "settings.updateChecking": "Checking…",
        "settings.updateLatest": "You are on the latest version",
        "settings.updateFound": "New version v{version} available",
        "settings.updateCommand": "Update command: {command}",
        "settings.updateStep1": "Upgrade steps: 1. Fully quit the app (Cmd+Q) — the upgrade cannot run while it is in use",
        "settings.updateStep2": "2. Run the command above in a terminal (profile pre-filled for this environment; replace it if you use a custom profile)",
        "settings.updateStep3": "3. Reopen the app; client-only changes only need a window reload",
        "settings.updateOtherEnv": "To install in the other environment too, repeat the command with the other profile (desktop ↔ web).",
        "settings.updateCopy": "Copy command",
        "settings.updateCopied": "Copied",
        "settings.updateError": "Check failed: cannot reach registry.npmjs.org",
        "settings.updateAutoFailed": "Automatic update check failed; use the Check for updates button to retry.",
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
        "settings.historyInsert": "Insert",
        "settings.historyInserted": "Inserted",
        "settings.historyAccepted": "Accepted",
        "settings.historyCopied": "Copied",
        "settings.historyNoText": "No suggestion text recorded for this run (older record)",
        "settings.historyEmpty": "No records yet: trigger a prediction and this list shows the last few with their session, model, latency and flags.",
        "settings.historyOff": "History is off (0 records): suggestion text is not stored locally.",
        "settings.predictionSection": "What gets predicted",
        "settings.suggestionLanguage": "Suggestion language",
        "settings.suggestionLanguageHint": "Follow the conversation, or pin one",
        "settings.suggestionLanguageHintFull": "Detected from the conversation by default; pin a language to always get suggestions in it (languages with regional variants also get a Region dropdown)",
        "settings.languageAuto": "Auto (follow the conversation)",
        "settings.languageMore": "More languages… ({count} more)",
        "settings.languageRegion": "Region",
        "settings.historySize": "History size",
        "settings.historySizeHint": "how many recent predictions to keep (0-50; 0 disables history). Stored in {storage}; local only, never uploaded, survives reloads",
        "storage.electron": "the app's own storage (Electron renderer)",
        "storage.web": "the browser's localStorage",
        "dock.noSuggestion": "Prediction returned no usable suggestion",
        "dock.rerollFailed": "Reroll failed",
        "dock.generatingAny": "Generating a suggestion…",
        "dock.manualFailed": "Could not get a new suggestion: {reason}",
        "dock.discarded": "Result discarded: {why}",
        "dock.whyComposing": "IME composition never ended",
        "dock.whyTyping": "input detected during the request",
        "dock.whyDraft": "the composer already has text",
        "dock.openSettings": "Open settings",
        "dock.copySettingsPath": "Copy settings path",
        "dock.settingsPath": "Settings → Prompt prediction",
        "dock.paused": "Prediction paused · resumes in {time}",
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
        hintInline: { flex: 1, minWidth: 0, color: token("label-tertiary", c.muted), fontSize: 12.5, lineHeight: 1.7 },
        row: { display: "flex", alignItems: "center", gap: 12, margin: "14px 0" },
        label: { width: 110, fontSize: 13, color: token("label-secondary", c.label), flex: "none" },
        select: { flex: 1, padding: "7px 10px", border: "1px solid " + token("border-l1", c.border), borderRadius: 8, fontSize: 13, color: token("label-primary", c.inputText), background: token("bg-base", c.inputBg), maxWidth: 320 },
        input: { width: 90, flex: "none", padding: "7px 10px", border: "1px solid " + token("border-l1", c.border), borderRadius: 8, fontSize: 13, color: token("label-primary", c.inputText), background: token("bg-base", c.inputBg) },
        btnPrimary: { padding: "8px 16px", flex: "none", border: 0, borderRadius: 8, background: token("state-business-primary", c.primary), color: c.primaryText, cursor: "pointer", fontSize: 13 },
        btnGhost: { padding: "8px 16px", flex: "none", border: "1px solid " + token("border-l1", c.border), borderRadius: 8, background: token("bg-layer-2", c.chipBg), color: token("label-primary", c.chipText), cursor: "pointer", fontSize: 13 },
        toggleTrack: function (on) { return { width: 38, height: 22, borderRadius: 22, border: 0, cursor: "pointer", padding: 2, flex: "none", boxSizing: "border-box", overflow: "hidden", background: on ? c.primary : c.trackOff, transition: "background .15s" }; },
        toggleThumb: function (on) { return { display: "block", width: 18, height: 18, borderRadius: 18, background: c.thumb, transform: on ? "translateX(16px)" : "translateX(0)", transition: "transform .15s" }; },
        warn: { color: c.warn, fontSize: 12.5, lineHeight: 1.7, margin: "-8px 0 0 122px" },
        warnBlock: { color: c.warn, fontSize: 12.5, lineHeight: 1.7, margin: "-4px 0 12px" },
        warnInline: { color: c.warn, fontSize: 12, marginInlineStart: 8 },
        tryBox: { marginTop: 12, padding: "10px 12px", borderRadius: 8, background: token("bg-layer-2", c.softBg), fontSize: 13, lineHeight: 1.7, color: token("label-primary", c.softText) },
        tryMeta: { display: "block", color: c.muted, fontSize: 11.5, marginTop: 4 },
        sectionTitle: { fontSize: 13, fontWeight: 600, color: token("label-secondary", c.label), margin: "0 0 8px" },
        histHead: { display: "flex", alignItems: "baseline", gap: 10, margin: "0 0 6px" },
        histToggle: { flex: "none", background: "none", border: 0, color: token("state-business-primary", c.link), fontSize: 12, cursor: "pointer", padding: 0 },
        histHint: { color: token("label-tertiary", c.muted), fontSize: 12, lineHeight: 1.7, margin: "0 0 6px" },
        linkBtn: { flex: "none", background: "none", border: 0, color: c.link, fontSize: 12, cursor: "pointer", padding: "0 4px", textDecoration: "underline" },
        hintWithMore: { color: token("label-tertiary", c.muted), fontSize: 13, lineHeight: 1.7, cursor: "help", borderBottom: "1px dotted " + c.hintBorder },
        // 悬停详情用浮层：不占布局（行高不变），也不接收鼠标事件（不会挡住下面控件的点击）
        hintAnchor: { position: "relative", display: "inline-block", flex: "0 1 auto", minWidth: 0 },
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
        advBtn: { flex: "none", background: "none", border: 0, color: token("state-business-primary", c.link), fontSize: 13, cursor: "pointer", padding: 0 },
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

    // composer 的外层容器：附件预览、工具栏通常在这一层，而不是可编辑节点内部。
    function findComposerScope(sessionId) {
      var ed = findEditor(sessionId);
      if (!ed) return null;
      try {
        return (typeof ed.closest === "function" && ed.closest('[class*="composer"], [data-composer]')) || ed.parentElement || ed;
      } catch { return ed.parentElement || ed; }
    }

    // 编辑器里「用户已经写了的东西」。rc.2 起 slot 拿不到草稿，只能读 DOM：
    // 占位符是编辑器的兄弟节点（见上面 hidePlaceholder 的查找方式），所以不会混进来。
    function readEditableText(node) {
      if (!node) return "";
      try {
        if (typeof node.value === "string") return node.value;
        if (node.shadowRoot && typeof node.shadowRoot.textContent === "string") return node.shadowRoot.textContent;
        var text = typeof node.textContent === "string" ? node.textContent : "";
        if (!text && typeof node.innerText === "string") text = node.innerText;
        return text;
      } catch { return ""; }
    }
    function editorText(sessionId) {
      try {
        var nodes = [];
        var ed = findEditor(sessionId);
        if (ed) nodes.push(ed);
        // 焦点可能落在嵌套的可编辑节点/隐藏 textarea 上
        var active = document.activeElement;
        if (active && active !== ed && (active.isContentEditable || (ed.contains && ed.contains(active)))) nodes.push(active);
        // 光标所在的 contenteditable（Lexical 的真实正文往往在这里）
        try {
          var sel = document.getSelection ? document.getSelection() : null;
          var anchor = sel && sel.anchorNode;
          var el = anchor ? (anchor.nodeType === 1 ? anchor : anchor.parentElement) : null;
          var host = el && el.closest ? el.closest('[contenteditable="true"], [data-lexical-editor="true"]') : null;
          if (host && nodes.indexOf(host) < 0) nodes.push(host);
        } catch { /* 选区不可用 */ }
        for (var i = 0; i < nodes.length; i += 1) {
          var raw = readEditableText(nodes[i]);
          if (!raw && nodes[i] && nodes[i].querySelector) {
            var inner = nodes[i].querySelector('[contenteditable="true"], textarea, [data-lexical-editor="true"]');
            if (inner) raw = readEditableText(inner);
          }
          if (raw) return raw.replace(/[\u200b\u00a0\s]/g, "");
        }
        return "";
      } catch { return ""; }
    }
    // 图片/附件/文件卡片同样算「输入框里有内容」，否则插件会以为空输入框、
    // 把 ghost 画在附件上（删除附件后看起来像文字重叠）。
    function editorHasAttachments(sessionId) {
      try {
        var ed = findEditor(sessionId);
        if (!ed) return false;
        var notButton = function (el) {
          if (!el || !el.closest) return Boolean(el);
          return !el.closest('button, [role="button"], [type="button"]');
        };
        // 编辑器内部：图片/媒体节点就算
        var coreSelector = "img, picture, figure, video, canvas, [data-image], [data-attachment], [data-file], [data-lexical-decorator]";
        if (typeof ed.querySelector === "function") {
          var direct = ed.querySelector(coreSelector);
          if (direct && notButton(direct)) return true;
        }
        // 没有 querySelector 的环境（或节点未挂载）用 innerHTML 兜底；只认媒体/装饰标记
        var html = typeof ed.innerHTML === "string" ? ed.innerHTML : "";
        if (html) {
          if (/<(img|picture|figure|video|canvas)\b/i.test(html)) return true;
          if (/data-lexical-decorator|contenteditable="false"/i.test(html)) return true;
        }
        // 编辑器外部：只认明确带附件标记的卡片，绝不把工具栏图标当附件
        var root = findComposerScope(sessionId);
        var chipSelector = "[data-attachment], [data-file], [data-image], [data-lexical-decorator], [class*=\"attachment-card\"], [class*=\"image-preview\"], [class*=\"file-chip\"], [class*=\"attachment-chip\"]";
        var roots = [ed, root];
        for (var i = 0; i < roots.length; i += 1) {
          var node = roots[i];
          if (!node || typeof node.querySelector !== "function") continue;
          var chip = node.querySelector(chipSelector);
          if (chip && notButton(chip)) return true;
        }
        return false;
      } catch { return false; }
    }
    // 编辑器里有任何文字/附件就算「已有内容」，此时不显示建议。
    function hasForeignDraft(sessionId) {
      if (editorHasAttachments(sessionId)) return true;
      return Boolean(editorText(sessionId));
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
    // 模块加载时就注册方向键监听：组件挂载晚于宿主自己的键盘处理，可能被更早的
    // 监听器 stopImmediatePropagation 拦掉；这里注册得早，收到后再转给 dock。
    try {
      var forwardDown = function (event) {
        if (!event) return;
        if (event.key !== "ArrowDown" && event.key !== "Down") return;
        if (event.code && event.code !== "ArrowDown" && event.code !== "Down") return;
        window.dispatchEvent(new CustomEvent("dsh-prompt-predict:down", { detail: { native: event, phase: event.type } }));
      };
      window.addEventListener("keydown", forwardDown, true);
      window.addEventListener("keyup", forwardDown, true);
    } catch { /* 非浏览器环境 */ }

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
      if (n === 0) return 0;   // 0 = 关闭历史
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
    function isElectronEnv() {
      try {
        var ua = typeof navigator !== "undefined" && navigator && navigator.userAgent ? String(navigator.userAgent) : "";
        return /electron/i.test(ua);
      } catch { return false; }
    }
    // 查 npm registry 的 latest 版本；设置页手动检查和 composer 自动提示共用。
    function fetchLatestVersion() {
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 10000);
      return fetch("https://registry.npmjs.org/dsh-prompt-predict/latest", { signal: controller.signal, cache: "no-store" })
        .then(function (r) { if (!r || !r.ok) throw new Error("http " + (r && r.status)); return r.json(); })
        .then(function (j) { return j && typeof j.version === "string" ? j.version : ""; })
        .finally(function () { clearTimeout(timer); });
    }
    // 自动更新检查的去重：localStorage 时间戳，跨模块实例 10 分钟内只查一次
    // （同屏多个 composer dock 各自挂载，否则会各发一次 registry 请求）。
    var UPDATE_CHECK_TS_KEY = "dsh-prompt-predict.lastUpdateCheck";
    var UPDATE_CHECK_INTERVAL = 10 * 60 * 1000;
    function readLastUpdateCheck() {
      try { return Number(window.localStorage?.getItem(UPDATE_CHECK_TS_KEY)) || 0; } catch { return 0; }
    }
    function markUpdateChecked() {
      try { window.localStorage?.setItem(UPDATE_CHECK_TS_KEY, String(Date.now())); } catch { /* 记不了也不影响功能 */ }
    }

    // 语义化版本比较：只管 0.2.7 / 0.2.10 这种数字段，足够插件自更新用。
    // 放在共享作用域：设置页手动检查和 composer 自动提示都要用。
    function versionNewer(latest, current) {
      var a = String(latest || "0").split("."), b = String(current || "0").split(".");
      for (var i = 0; i < 3; i += 1) {
        var x = Number(a[i]) || 0, y = Number(b[i]) || 0;
        if (x > y) return true;
        if (x < y) return false;
      }
      return false;
    }

    // 默认 profile 名：桌面 App 是 desktop，web 构建是 web（与官方 profile 命名一致；
    // 自定义 profile 的用户在命令里自行替换）。
    function currentProfileName() { return isElectronEnv() ? "desktop" : "web"; }
    function storagePlatformKey() {
      return isElectronEnv() ? "storage.electron" : "storage.web";
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
        error: error ? redactErrorText(error) : null,
        partialChars: extra && typeof extra.partialChars === 'number' ? extra.partialChars : null,
      };
      // 以已落盘的那份为准再插队：dock 与设置页可能是两个模块实例，
      // 各自内存里的 runHistory 会互相覆盖，丢记录的根源就在这里。
      var list = readStoredHistory();
      list.unshift(entry);
      runHistory = list.slice(0, Math.max(0, historyLimit));
      persistHistory();
      window.dispatchEvent(new CustomEvent("dsh-prompt-predict:run", { detail: { latest: entry, history: runHistory.slice() } }));
    }

    // 采纳后回写最近一条历史：多候选时记录用户实际选中的那条，并标记已采纳。
    function patchLastRun(sessionId, patch) {
      try {
        var list = readStoredHistory();
        var index = -1;
        for (var i = 0; i < list.length; i += 1) {
          if (list[i] && list[i].sessionId === sessionId) { index = i; break; }
        }
        if (index < 0) return;
        list[index] = Object.assign({}, list[index], patch || {});
        runHistory = list.slice(0, Math.max(0, historyLimit));
        persistHistory();
        window.dispatchEvent(new CustomEvent("dsh-prompt-predict:run", { detail: { latest: list[index], history: runHistory.slice() } }));
      } catch { /* 存储不可用就算了，不影响采纳 */ }
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
      var busy = Boolean(props.busy);
      var canPrev = Boolean(props.canPrev);
      var nextAction = props.nextAction || "regen";
      var switchEnabled = props.switchEnabled !== false;
      var notice = typeof props.notice === "string" ? props.notice : "";
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
        // 已逐段采纳时 ghost 要接在前缀后面：优先用光标位置
        var caret = null;
        try {
          var sel = typeof window.getSelection === "function" ? window.getSelection() : null;
          if (sel && sel.rangeCount && ed.contains(sel.anchorNode)) {
            var range = sel.getRangeAt(0).cloneRange();
            var rects = typeof range.getClientRects === "function" ? range.getClientRects() : null;
            var rr = rects && rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
            if (rr && (rr.width > 0 || rr.height > 0)) caret = rr;
          }
        } catch { /* 选区不可用时退回编辑器起点 */ }
        var left = caret ? Math.max(caret.left, r.left + padLeft) : r.left + padLeft;
        var top = caret ? Math.max(caret.top, r.top + parseFloat(cs.paddingTop || "0")) : r.top + parseFloat(cs.paddingTop || "0");
        setPos({
          left: left,
          top: top,
          width: r.width > 0 ? Math.max(80, (typeof r.right === "number" ? r.right : r.left + r.width) - padRight - left) : 0,
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
        if (!ed) return;
        var hidden = [];
        var scope = ed.parentElement;
        for (var depth = 0; depth < 3 && scope; depth += 1) {
          try {
            var list = typeof scope.querySelectorAll === "function"
              ? Array.prototype.slice.call(scope.querySelectorAll('[class*="placeholder"], [data-placeholder]'))
              : [];
            list.forEach(function (node) {
              if (!node || !node.style || node === ed) return;
              hidden.push({ node: node, old: node.style.visibility });
              node.style.visibility = "hidden";
            });
          } catch { /* 查询失败就跳过 */ }
          scope = scope.parentElement;
        }
        return function () { hidden.forEach(function (item) { item.node.style.visibility = item.old; }); };
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
          "data-prompt-predict-text": "true",
          style: { color: token("label-tertiary", colors().ghostText) },
        }, suggestion),
        busy ? null : h("span", {
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
          canPrev
            ? h("span", {
              "data-prompt-predict-prev-hint": "true",
              title: tt(t, "ghost.prevHint"),
              style: { color: token("label-tertiary", colors().ghostHint), fontSize: 11, whiteSpace: "nowrap" },
            }, tt(t, "ghost.prevHint"))
            : null,
          nextAction === "next" || nextAction === "regen"
            ? h("span", {
              "data-prompt-predict-replace-hint": "true",
              title: tt(t, nextAction === "next" ? "ghost.nextHint" : "ghost.regenHint"),
              style: { color: token("label-tertiary", colors().ghostHint), fontSize: 11, whiteSpace: "nowrap" },
            }, tt(t, nextAction === "next" ? "ghost.nextHint" : "ghost.regenHint"))
            : null,
          notice
            ? h("span", {
              "data-prompt-predict-notice": "true",
              style: { color: token("label-tertiary", colors().ghostHint), fontSize: 10, whiteSpace: "nowrap" },
            }, notice)
            : null,
          onReroll
            ? h("button", {
              type: "button", onClick: onReroll, title: tt(t, "ghost.reroll"), "aria-label": tt(t, "ghost.reroll"),
              style: {
                pointerEvents: "auto", width: 24, height: 24, padding: 0, borderRadius: 6,
                border: "1px solid var(--dsw-alias-border-l1, " + colors().border + ")", background: "var(--dsw-alias-bg-secondary, " + colors().softBg + ")",
                color: token("label-secondary", colors().chipText), fontSize: 12, lineHeight: 1, cursor: "pointer",
              },
            }, "↻")
            : null,
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

    // 错误文本脱敏后再落盘/展示：provider 报错里可能带内部 URL、query key、Bearer token。
    function redactErrorText(text) {
      return String(text == null ? "" : text)
        .replace(/https?:\/\/\S+/gi, "[url]")
        .replace(/\b(api[_-]?key|token|key|signature|secret)=([^\s&]+)/gi, function (_all, k) { return k + "=[redacted]"; })
        .replace(/\b(Authorization:\s*Bearer|Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [redacted]")
        .slice(0, 400);
    }

    // 连续失败计数放在模块级：同屏可能同时挂着多个 composer dock（子会话等），
    // 各算各的会导致「两个会话各失败一次」永远到不了提示阈值。
    // 但提示只在**最近失败的那个会话**里显示，避免一个会话超时、满屏 composer 都弹提示。
    var failState = { streak: 0, reason: "", sessionId: null };
    function noteFailure(sessionId, reason) {
      failState = { streak: failState.streak + 1, reason: redactErrorText(reason), sessionId: sessionId || null };
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
          height: r.height || 0,
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
          position: "fixed", left: pos.left, top: pos.top + (props.below ? (pos.height || 0) + 4 : 0), zIndex: 60,
          width: pos.width || undefined, pointerEvents: "none",
          fontFamily: pos.fontFamily, fontSize: pos.fontSize,
          color: colors().warn, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
        },
      },
        h("span", null, text),
        props.actionLabel
          ? h("button", {
            type: "button", "data-prompt-predict-hint-action": "true",
            onClick: props.onAction,
            style: {
              pointerEvents: "auto", marginInlineStart: 8, background: "none", border: 0,
              color: token("state-business-primary", colors().link), fontSize: 11.5,
              textDecoration: "underline", cursor: "pointer", fontFamily: "inherit",
            },
          }, props.actionLabel)
          : null);
    }

    // 空候选数组用同一引用：清空时 setState 不会因新数组触发无意义重渲染。
    // ================= 建议（composer dock 仅提供生命周期；显示覆盖到输入框内） =================
    function PredictionDock(props) {
      var sessionId = props.sessionId;
      var useSession = props.useSession;
      var useInput = props.useInput;
      var inputActions = props.inputActions;
      var t = props.t;
      // 标题：先看会话 store（列表），再退回当前会话对象本身。两个 hook 都必须无条件调用。
      // 选择器只返回标题字符串（原始值）：会话任何其他字段变化都不会触发 dock 重渲染。
      var useSessions = typeof props.useSessions === "function" ? props.useSessions : function () { return null; };
      var titleFromStore = useSessions(function (state) { return titleFromList(state, sessionId); });
      var titleFromCurrent = useSession(function (value) { return titleOfSession(value); });
      var sessionTitle = titleFromStore || titleFromCurrent;
      var running = useSession(function (value) { return Boolean(value && value.running); });
      var blank = useSession(function (value) { return Boolean(value && value.blank); });
      var removed = useSession(function (value) { return Boolean(value && value.removed); });
      var draft = useInput(function (value) { return String(value && value.draft || ""); });
      var composerState = useInput(function (value) { return value; });
      var _pa = useState(false), pastedAttachment = _pa[0], setPastedAttachment = _pa[1];
      var _s = useState(""), suggestion = _s[0], setSuggestion = _s[1];
      var _tr = useState(false), truncated = _tr[0], setTruncated = _tr[1];
      var _busy = useState(null), busyState = _busy[0], setBusyState = _busy[1];   // 批量候选生成中
      var busyTimerRef = useRef(null);   // 请求慢时才显示「生成中」，避免闪一下
      var _pn = useState(Date.now()), pauseNow = _pn[0], setPauseNow = _pn[1];   // 暂停倒计时刷新
      var _dt = useState(0), draftTick = _dt[0], setDraftTick = _dt[1];
      var _theme = useState(0), themeTick = _theme[0], setThemeTick = _theme[1];
      var _fail = useState(failState), failure = _fail[0], setFailure = _fail[1];
      var _me = useState(""), manualError = _me[0], setManualError = _me[1];   // 手动换一条失败的原因
      var _mk = useState("failed"), manualErrorKind = _mk[0], setManualErrorKind = _mk[1];
      var _en = useState(true), enabled = _en[0], setEnabled = _en[1];
      var _swi = useState(true), switchEnabled = _swi[0], setSwitchEnabled = _swi[1];
      var switchLimitRef = useRef(3);
      var suggestionHistoryRef = useRef([]);
      var historyIndexRef = useRef(0);
      var switchCountRef = useRef(0);
      var _swnt = useState(""), switchNotice = _swnt[0], setSwitchNotice = _swnt[1];
      var armed = useRef(true);
      var abortRef = useRef(null);
      var sessionRef = useRef(sessionId);
      var dismissedByDraft = useRef(false);
      // rc.2 不再把 draft 暴露给 slot，拿不到「输入框是否为空」。
      // 用等价信号：建议可见时按下任何可打印键 = 用户开始输入 → 立即隐藏。
      var _tk = useState(0), typedTick = _tk[0], setTypedTick = _tk[1];
      var typedSince = useRef(false);
      var composingRef = useRef(false);   // 输入法合成中：拼音串可能不落进 textContent，必须单独跟踪
      var composingInComposer = useRef(false);   // 合成是否发生在 composer（用于判断结束后要不要重新预测）
      var composingAt = useRef(0);   // 合成开始时间：状态卡住时自愈
      var typedDuringRequest = useRef(false);   // 本次请求期间用户是否输入过（不依赖 DOM 可读性）
      var selfInsertAt = useRef(0);   // 我们自己通过 inputActions 插入的时间（避免把插入当成用户输入）
      var suppressPredictionUntil = useRef(0);   // 粘贴后短暂禁止自动预测，避免读不到正文时误换一条
      var hadAttachmentsRef = useRef(false);   // 用于「删除附件」时清掉残留建议
      var lastReplaceAt = useRef(0);   // ↓ 的 keydown/keyup 双保险去重
      // 粘贴/拖入图片或文件：即使 DOM 里检测不到附件，也视为「有内容」。
      var hasInputAttachments = function () {
        var value = composerState;
        if (!value || typeof value !== "object") return false;
        var keys = ["attachments", "files", "images", "pendingFiles", "uploadingFiles", "pendingAttachments"];
        for (var i = 0; i < keys.length; i += 1) {
          var list = value[keys[i]];
          if (Array.isArray(list) && list.length > 0) return true;
        }
        return false;
      };
      // 打字即隐藏；草稿删空会重新浮现（只有 Esc 才是永久忽略）
      dismissedByDraft.current = draft.trim() !== "" || typedSince.current;
      var foreignDraftNow = pastedAttachment || hasInputAttachments() || hasForeignDraft(sessionId);
      var composingNow = isComposingNow();
      var visibleSuggestion = (dismissedByDraft.current || foreignDraftNow || composingNow) ? "" : suggestion;

      // 把流式事件应用到 ghost：delta 逐段更新，reset 清空重来，done/error 落历史。
      // 合成状态自愈：正常 compositionend 会清掉；若事件丢了，超过 5s 就不再据此丢弃结果。
      function isComposingNow() {
        if (!composingRef.current) return false;
        if (Date.now() - composingAt.current < 5000) return true;
        composingRef.current = false;
        return false;
      }
      var applySuggestionEvent = function (event, isReroll, manual) {
        if (!event || controllerAborted()) return;
        if (event.type === "start" || event.type === "reset") {
          setManualError("");
          // 不要在这里 endBusy：模型可能还要好几秒才吐第一个字，
          // 占位必须留到第一段 delta 到达，否则中间是一片空白。
          setSuggestion("");
          setTruncated(false);
          return;
        }
        if (event.type === "delta" && typeof event.text === "string") {
          endBusy();
          setManualError("");
          if (isComposingNow() || typedDuringRequest.current || hasForeignDraft(sessionId)) {
            typedSince.current = true;
            if (manual) {
              setManualError(tt(t, "dock.discarded", {
                why: isComposingNow() ? tt(t, "dock.whyComposing")
                  : typedDuringRequest.current ? tt(t, "dock.whyTyping") : tt(t, "dock.whyDraft"),
              }));
              setManualErrorKind("discarded");
            }
            return;
          }
          typedSince.current = false;
          setSuggestion(event.text);
          return;
        }
        if (event.type === "done" && typeof event.suggestion === "string") {
          endBusy();
          setManualError("");
          if (isComposingNow() || typedDuringRequest.current || hasForeignDraft(sessionId)) {
            // 用户在等待期间已经开始写（或正在用输入法合成）：不要把灰字盖上去，清空后再重新预测
            typedSince.current = true;
            if (manual) {
              setManualError(tt(t, "dock.discarded", {
                why: isComposingNow() ? tt(t, "dock.whyComposing")
                  : typedDuringRequest.current ? tt(t, "dock.whyTyping") : tt(t, "dock.whyDraft"),
              }));
              setManualErrorKind("discarded");
            }
            armed.current = true;
            setSuggestion("");
            noteSuccess();
            return;
          }
          typedSince.current = false;
          var fullSuggestion = event.suggestion.trim();
          if (isReroll) {
            var hist = suggestionHistoryRef.current;
            if (hist[hist.length - 1] !== fullSuggestion) hist.push(fullSuggestion);
            historyIndexRef.current = hist.length - 1;
            switchCountRef.current += 1;
          } else {
            suggestionHistoryRef.current = [fullSuggestion];
            historyIndexRef.current = 0;
            switchCountRef.current = 0;
          }
          setSwitchNotice("");
          setSuggestion(fullSuggestion);
          setTruncated(Boolean(event.truncated));
          noteSuccess();
          recordRun(sessionId, Object.assign({}, event, { suggestion: fullSuggestion }), null, sessionTitle);
          return;
        }
        if (event.type === "error") {
          endBusy();
          // 流式失败时可能已经渲染过半句；错误事件必须把 ghost 收回，
          // 不能把半句留在输入框上方。
          setSuggestion("");
          setTruncated(false);
          var reason = event.reason || tt(t, isReroll ? "dock.rerollFailed" : "dock.noSuggestion");
          if (manual) { setManualError(reason); setManualErrorKind("failed"); }
          noteFailure(sessionId, reason);
          recordRun(sessionId, null, reason, sessionTitle, { partialChars: event.partialChars });
        }
      };
      var endBusy = function () {
        if (busyTimerRef.current) { clearTimeout(busyTimerRef.current); busyTimerRef.current = null; }
        setBusyState(null);
      };
      var beginBusy = function (immediate) {
        if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
        setBusyState({ visible: Boolean(immediate) });
        if (immediate) { busyTimerRef.current = null; return; }
        busyTimerRef.current = setTimeout(function () {
          busyTimerRef.current = null;
          setBusyState(function (prev) { return prev ? { visible: true } : prev; });
        }, 900);
      };
      // 失败提示里的「打开设置」：优先用宿主提供的导航能力，没有就复制路径兜底。
      var findSettingsOpener = function () {
        var fns = [props.openSettings, props.openSettingsPanel, props.openOptions,
          props.host && props.host.openSettings, window.dsh && window.dsh.openSettings,
          window.__DSH__ && window.__DSH__.openSettings];
        for (var i = 0; i < fns.length; i += 1) if (typeof fns[i] === "function") return fns[i];
        return null;
      };
      var openSettingsFromHint = function () {
        var opener = findSettingsOpener();
        if (opener) {
          try { opener(); return; } catch { /* 回退到复制路径 */ }
        }
        try {
          var text = tt(t, "dock.settingsPath");
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
        } catch { /* 忽略剪贴板失败 */ }
      };
      var controllerAborted = function () {
        return Boolean(abortRef.current && abortRef.current.signal.aborted) || sessionRef.current !== sessionId;
      };

      // 首次读取启用状态；设置页保存后通过事件让当前会话立即生效。
      useEffect(function () {
        api("status").then(function (j) {
          setEnabled(!(j && j.effective && j.effective.enabled === false));
          setSwitchEnabled(!(j && j.effective && j.effective.switchEnabled === false));
          switchLimitRef.current = Math.min(10, Math.max(0, Math.floor(Number(j && j.effective && j.effective.switchLimit) || 0)));
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
          if (event.detail && typeof event.detail.switchEnabled === "boolean") setSwitchEnabled(event.detail.switchEnabled);
          if (event.detail && typeof event.detail.switchLimit === "number") {
            switchLimitRef.current = Math.min(10, Math.max(0, Math.floor(event.detail.switchLimit)));
          }
          if (event.detail && typeof event.detail.historySize === "number") {
            historyLimit = event.detail.historySize;
            trimHistoryToLimit(historyLimit);
          }
          if (!on) {
            endBusy();
            setSuggestion("");
            if (abortRef.current) abortRef.current.abort();
          }
        };
        window.addEventListener("dsh-prompt-predict:settings", changed);
        return function () { window.removeEventListener("dsh-prompt-predict:settings", changed); };
      }, []);

      // 键位级粘贴兜底：不阻止默认行为；若 Cmd/Ctrl+V 之后编辑器没变化，
      // 主动读剪贴板并插入（应对 Electron 里 paste 事件无 clipboardData 或宿主没处理）。
      useEffect(function () {
        if (!inputActions) return;
        var onPasteKey = function (event) {
          if (event.isComposing || !isComposerFocused(sessionId, event)) return;
          if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
          if (event.key !== "v" && event.key !== "V") return;
          suppressPredictionUntil.current = Date.now() + 1500;
          // 先无条件收起 ghost：编辑器正文读不到时，DOM 守卫也挡不住它压字
          setSuggestion("");
          var before = editorText(sessionId);
          setTimeout(function () {
            if (editorText(sessionId) !== before) return;   // 编辑器已经粘贴成功
            try {
              if (!navigator.clipboard || !navigator.clipboard.readText) return;
              navigator.clipboard.readText().then(function (text) {
                if (editorText(sessionId) !== before) return;
                if (!text) return;   // Electron 下读不到剪贴板是常态，不要误报失败
                selfInsertAt.current = Date.now();
                var span = inputActions.captureInsertion();
                var inserted = false;
                try { inserted = inputActions.insertText(text, span); } catch { inserted = false; }
                setTimeout(function () {
                  if (editorText(sessionId) !== before) return;
                  // 编辑器 API 没写进去：再试一次原生插入命令
                  try {
                    selfInsertAt.current = Date.now();
                    if (document.execCommand) document.execCommand("insertText", false, text);
                  } catch { /* 忽略 */ }
                  setTimeout(function () { /* 写不进去也保持安静，避免误报 */ }, 120);
                }, 120);
              }).catch(function () { /* 读不到剪贴板就算了 */ });
            } catch { /* 忽略 */ }
          }, 180);
        };
        var pasteKeyTarget = typeof document.addEventListener === "function" ? document : window;
        pasteKeyTarget.addEventListener("keydown", onPasteKey, true);
        return function () { pasteKeyTarget.removeEventListener("keydown", onPasteKey, true); };
      }, [sessionId, inputActions]);

      // 兜底粘贴：不阻止默认行为；若编辑器在 60ms 内没吃进这段文本，
      // 说明宿主/编辑器的粘贴处理失效了，由插件用 inputActions 插进去。
      useEffect(function () {
        if (!inputActions) return;
        var onPaste = function (event) {
          if (!isComposerFocused(sessionId, event)) return;
          var data = event && event.clipboardData;
          var files = data && data.files;
          var items = data && data.items;
          var hasFile = Boolean(files && files.length)
            || (items && Array.prototype.some.call(items, function (item) { return item && item.kind === "file"; }));
          if (hasFile) {
            setPastedAttachment(true);
            setSuggestion("");
            suppressPredictionUntil.current = Date.now() + 5000;
            return;
          }
          var text = data && typeof data.getData === "function" ? data.getData("text/plain") : "";
          if (!text) return;
          suppressPredictionUntil.current = Date.now() + 1500;
          setSuggestion("");
          var before = editorText(sessionId);
          setTimeout(function () {
            var after = editorText(sessionId);
            if (after !== before) return;   // 编辑器自己处理了
            try {
              selfInsertAt.current = Date.now();
              var span = inputActions.captureInsertion();
              inputActions.insertText(text, span);
            } catch { /* 插不进去就算了，保持原样 */ }
          }, 60);
        };
        var pasteTarget = typeof document.addEventListener === "function" ? document : window;
        pasteTarget.addEventListener("paste", onPaste, true);
        return function () { pasteTarget.removeEventListener("paste", onPaste, true); };
      }, [sessionId, inputActions]);

      // 拖入图片/文件：同样视为已有内容。
      useEffect(function () {
        var onDrop = function (event) {
          if (!isComposerFocused(sessionId, event)) return;
          var files = event.dataTransfer && event.dataTransfer.files;
          if (!files || !files.length) return;
          setPastedAttachment(true);
          setSuggestion("");
          suppressPredictionUntil.current = Date.now() + 5000;
        };
        var dropTarget = typeof document.addEventListener === "function" ? document : window;
        dropTarget.addEventListener("drop", onDrop, true);
        return function () { dropTarget.removeEventListener("drop", onDrop, true); };
      }, [sessionId]);

      // 历史记录「插入」：把旧建议塞回当前输入框（settings 与 dock 是不同实例，用窗口事件连接）
      useEffect(function () {
        var onInsert = function (event) {
          var text = event && event.detail && typeof event.detail.text === "string" ? event.detail.text : "";
          if (!text || !inputActions) return;
          try {
            var span = inputActions.captureInsertion();
            if (inputActions.insertText(text, span)) {
              setSuggestion("");
              typedSince.current = false;
            }
          } catch { /* 插入失败就保持原样 */ }
        };
        window.addEventListener("dsh-prompt-predict:insert", onInsert);
        return function () { window.removeEventListener("dsh-prompt-predict:insert", onInsert); };
      }, [inputActions]);

      useEffect(function () {
        sessionRef.current = sessionId;
        setLiveSessionId(sessionId);   // 给设置页取「会话实际模型」用（跨模块实例共享）
        armed.current = true;
        dismissedByDraft.current = false;
        setSuggestion("");
        setPastedAttachment(false);
        endBusy();
        typedSince.current = false;
        if (abortRef.current) abortRef.current.abort();
      }, [sessionId]);

      useEffect(function () {
        if (!enabled) return;
        if (running) {
          armed.current = true;
          dismissedByDraft.current = false;
          setPastedAttachment(false);
          suggestionHistoryRef.current = [];
          historyIndexRef.current = 0;
          switchCountRef.current = 0;
          setSwitchNotice("");
          setSuggestion("");
          typedSince.current = false;
          if (abortRef.current) abortRef.current.abort();
          return;
        }
        if (!sessionId || blank || removed || !armed.current || isPaused()) return;
        if (pastedAttachment || hasInputAttachments() || draft.trim() !== "" || hasForeignDraft(sessionId)) return;
        armed.current = false;
        var controller = new AbortController();
        abortRef.current = controller;
        var timer = setTimeout(function () {
          var finished = false;
          var onEvent = function (event) {
            if (event && (event.type === "done" || event.type === "error")) finished = true;
            applySuggestionEvent(event, false);
          };
          typedDuringRequest.current = false;
          beginBusy();
          apiStream("suggest", { sessionId: sessionId }, onEvent, controller.signal)
            .then(function (result) {
              if (!finished && result) {
                applySuggestionEvent(result.ok
                  ? Object.assign({ type: "done" }, result)
                  : Object.assign({ type: "error" }, result), false);
              }
            })
            .catch(function (error) {
              endBusy();
              if (controller.signal.aborted) return;
              setSuggestion("");
              setTruncated(false);
              noteFailure(sessionId, String(error));
              recordRun(sessionId, null, String(error), sessionTitle);
            });
        }, 350);
        return function () {
          clearTimeout(timer);
          endBusy();
          controller.abort();
          if (abortRef.current === controller) abortRef.current = null;
        };
      }, [sessionId, running, blank, removed, draft, enabled, draftTick]);

      // 直接盯编辑器 DOM：贴图、删图、打字、拖拽都会触发；不依赖 input 事件与正文可读性。
      // 只要我们自己的插入不在进行中，任何内容变化都立刻收起建议。
      useEffect(function () {
        if (typeof MutationObserver === "undefined") return;
        var ed = findEditor(sessionId);
        if (!ed) return;
        var scope = findComposerScope(sessionId) || ed;
        // 任何位置出现/移除图片、附件节点都算：不依赖附件预览是否在 composer 子树内。
        var isAttachmentNode = function (node) {
          if (!node || node.nodeType !== 1) return false;
          try {
            if (typeof node.matches === "function" && node.matches('img, picture, video, canvas, [data-attachment], [data-file], [data-image], [data-lexical-decorator]')) return true;
            if (typeof node.querySelector === "function" && node.querySelector('img, picture, video, canvas, [data-attachment], [data-file], [data-image], [data-lexical-decorator], [contenteditable="false"]')) return true;
          } catch { return false; }
          return false;
        };
        var observer = new MutationObserver(function (mutations) {
          if (Date.now() - selfInsertAt.current < 500) return;   // 我们自己的插入
          var addedAttachment = false;
          var removedAttachment = false;
          try {
            addedAttachment = (mutations || []).some(function (mutation) {
              return Array.from(mutation.addedNodes || []).some(isAttachmentNode);
            });
            removedAttachment = (mutations || []).some(function (mutation) {
              return Array.from(mutation.removedNodes || []).some(isAttachmentNode);
            });
          } catch { addedAttachment = false; removedAttachment = false; }
          if (addedAttachment || removedAttachment) {
            setSuggestion("");   // 贴图或删图：立即收起，避免残影
            if (addedAttachment) setPastedAttachment(true);
            if (removedAttachment && !editorText(sessionId)) setPastedAttachment(false);   // 删空了就恢复后续预测
            hadAttachmentsRef.current = false;
            return;
          }
          var hasAttach = editorHasAttachments(sessionId);
          if (hasAttach || hadAttachmentsRef.current) setSuggestion("");   // 附件出现或刚被删除
          hadAttachmentsRef.current = hasAttach;
          setTypedTick(function (n) { return n + 1; });
        });
        observer.observe(scope, { childList: true, subtree: true, characterData: true });
        var outer = scope.parentElement;
        if (outer && outer !== document.body) observer.observe(outer, { childList: true, subtree: true, characterData: true });
        return function () { observer.disconnect(); };
      }, [sessionId]);


      // 输入法合成：合成期间一律不显示建议；合成结束若没留下文字，视为「取消输入」，
      // 重新允许预测。始终挂载，避免「请求在途中合成」这类竞态漏判。
      useEffect(function () {
        var onStart = function () {
          // 不在这里判断焦点：合成期焦点可能落在 Lexical 的隐藏节点上，判断失败就会
          // 把拼音和 ghost 叠在一起。合成只可能来自输入，隐藏是无害的。
          composingRef.current = true;
          composingAt.current = Date.now();
          composingInComposer.current = isComposerFocused(sessionId);
          typedDuringRequest.current = true;
          typedSince.current = true;
          endBusy();
          setSuggestion("");
          setTypedTick(function (n) { return n + 1; });
        };
        var onEnd = function () {
          composingRef.current = false;
          if (!composingInComposer.current) { setTypedTick(function (n) { return n + 1; }); return; }
          // 无论是否留下文字都重新武装：留下文字时靠 hasForeignDraft 挡住，
          // 等用户把文字删空后，始终挂载的 input 监听就能重新触发预测。
          armed.current = true;
          if (!editorText(sessionId)) {
            typedSince.current = false;
            setDraftTick(function (n) { return n + 1; });
          }
          setTypedTick(function (n) { return n + 1; });
        };
        window.addEventListener("compositionstart", onStart, true);
        window.addEventListener("compositionend", onEnd, true);
        return function () {
          window.removeEventListener("compositionstart", onStart, true);
          window.removeEventListener("compositionend", onEnd, true);
        };
      }, [sessionId]);

      // ↓ 常驻：有建议时换一条；没有建议且输入框为空时也直接拉一条。
      // 监听来自模块级转发（注册得最早）和编辑器自身的事件，双重保险。
      var handleDown = function (native) {
        if (!native || native.isComposing) return;
        if (native.code && native.code !== "ArrowDown" && native.code !== "Down") return;
        if (!isComposerFocused(sessionId, native)) return;
        if (!enabled || pausedUntil > Date.now()) return;
        if (native.type === "keyup" && Date.now() - lastReplaceAt.current < 400) return;
        lastReplaceAt.current = Date.now();
        if (busyState) {
          // 正在生成：至少把占位显示出来，证明按键已生效
          setBusyState(function (prev) { return prev ? { visible: true } : prev; });
          native.preventDefault();
          native.stopPropagation();
          if (typeof native.stopImmediatePropagation === "function") native.stopImmediatePropagation();
          return;
        }
        if (!switchEnabled) return;
        if (visibleSuggestion) {
          var hist = suggestionHistoryRef.current;
          if (historyIndexRef.current < hist.length - 1) {
            historyIndexRef.current += 1;
            setSuggestion(hist[historyIndexRef.current]);
            setSwitchNotice("");
          } else {
            reroll();
          }
        } else {
          if (pastedAttachment || hasInputAttachments() || draft.trim() !== "" || hasForeignDraft(sessionId)) return;
          if (!runRequest(false, true)) return;
        }
        native.preventDefault();
        native.stopPropagation();
        if (typeof native.stopImmediatePropagation === "function") native.stopImmediatePropagation();
      };
      useEffect(function () {
        var onForward = function (event) {
          handleDown(event && event.detail ? event.detail.native : null);
        };
        window.addEventListener("dsh-prompt-predict:down", onForward);
        var ed = findEditor(sessionId);
        var onEditorKey = function (event) { handleDown(event); };
        if (ed && typeof ed.addEventListener === "function") {
          ed.addEventListener("keydown", onEditorKey, true);
          ed.addEventListener("keyup", onEditorKey, true);
        }
        return function () {
          window.removeEventListener("dsh-prompt-predict:down", onForward);
          if (ed && typeof ed.removeEventListener === "function") {
            ed.removeEventListener("keydown", onEditorKey, true);
            ed.removeEventListener("keyup", onEditorKey, true);
          }
        };
      }, [enabled, switchEnabled, sessionId, visibleSuggestion, draft, busyState]);

      // 手动触发：Ctrl/Cmd+Shift+Space。不用 Ctrl+Space，避免和 macOS 切换输入法冲突。
      useEffect(function () {
        var onManual = function (event) {
          if (event.isComposing) return;
          if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey) return;
          if (event.key !== " " && event.code !== "Space") return;
          if (!isComposerFocused(sessionId, event)) return;
          if (!enabled || pausedUntil > Date.now()) return;
          if (visibleSuggestion) {
            if (runRequest(true)) { event.preventDefault(); event.stopPropagation(); }
            return;
          }
          if (pastedAttachment || hasInputAttachments() || draft.trim() !== "" || hasForeignDraft(sessionId)) return;
          if (runRequest(false)) { event.preventDefault(); event.stopPropagation(); }
        };
        window.addEventListener("keydown", onManual, true);
        return function () { window.removeEventListener("keydown", onManual, true); };
      }, [enabled, sessionId, visibleSuggestion, draft, suggestion]);

      // 暂停/恢复：暂停时把已显示的建议收掉；恢复时重新武装并触发一次预测
      useEffect(function () {
        var id = setInterval(function () { setPauseNow(Date.now()); }, 15000);
        return function () { clearInterval(id); };
      }, []);
      useEffect(function () {
        return function () { if (busyTimerRef.current) clearTimeout(busyTimerRef.current); };
      }, []);
      useEffect(function () {
        var onPause = function (event) {
          var until = (event && event.detail && event.detail.until) || 0;
          // 本模块可能是另一个实例发出的暂停事件，必须先同步共享状态。
          pausedUntil = until > Date.now() ? until : 0;
          if (until > Date.now()) {
            armed.current = false;
            if (abortRef.current) abortRef.current.abort();
            endBusy();
            setSuggestion("");
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
        // keyup 只用于兜底判断「草稿被清空」，不能把方向键、Tab、Esc 等
        // 也算成「用户在输入」——否则我们自己的 ↓ keyup 会把结果误丢弃。
        var isTypingEvent = function (event) {
          if (!event || event.type !== "keyup") return true;
          var k = event.key;
          if (typeof k !== "string") return false;
          return k.length === 1 || k === "Backspace" || k === "Delete" || k === "Enter";
        };
        var onInput = function (event) {
          if (!isTypingEvent(event)) return;
          if (Date.now() - selfInsertAt.current < 150) return;   // 我们自己插入的内容
          typedDuringRequest.current = true;
          if (!editorText(sessionId)) typedSince.current = false;   // 草稿删空 → 允许建议重新浮现
          var hasAttach = editorHasAttachments(sessionId);
          if (hasAttach || hadAttachmentsRef.current) setSuggestion("");   // 附件出现或刚被删除
          hadAttachmentsRef.current = hasAttach;
          setTypedTick(function (n) { return n + 1; });     // 只触发渲染，让 DOM 守卫隐藏 ghost
          if (Date.now() < suppressPredictionUntil.current) return;   // 刚粘贴过，别自动换建议
          if (!armed.current) return;                       // 已经预测过 / 正在预测
          if (hasForeignDraft(sessionId)) return;  // 还有草稿
          setDraftTick(function (n) { return n + 1; });
        };
        var types = ["input", "keyup", "compositionend", "drop"];
        types.forEach(function (type) { ed.addEventListener(type, onInput, true); });
        return function () {
          types.forEach(function (type) { ed.removeEventListener(type, onInput, true); });
        };
      }, [sessionId]);

      var accept = useCallback(function () {
        if (busyState || !visibleSuggestion || !inputActions || dismissedByDraft.current) return false;
        try {
          var span = inputActions.captureInsertion();
          selfInsertAt.current = Date.now();
          if (!inputActions.insertText(visibleSuggestion, span)) return false;
          patchLastRun(sessionId, { suggestion: suggestion, accepted: true });
          suggestionHistoryRef.current = [];
          historyIndexRef.current = 0;
          switchCountRef.current = 0;
          setSwitchNotice("");
          setSuggestion("");
          return true;
        } catch { return false; }
      }, [visibleSuggestion, inputActions, draft, busyState, suggestion, sessionId]);

      // 换一条：把当前这条作为 avoid 传回去，让模型必须给出不同的建议
      // 统一的请求入口：手动触发、reroll 都走这里（自动触发仍带 350ms 防抖）。
      var runRequest = function (isReroll, immediate) {
        if (!sessionId || (isReroll && !suggestion)) return false;
        var controller = new AbortController();
        abortRef.current = controller;
        var finished = false;
        var onEvent = function (event) {
          if (event && (event.type === "done" || event.type === "error")) finished = true;
          applySuggestionEvent(event, isReroll, true);
        };
        typedDuringRequest.current = false;
        var body = isReroll ? { sessionId: sessionId, reroll: true, avoid: suggestion } : { sessionId: sessionId };
        if (isReroll) {
          // 换一条：清掉旧的剩余部分；已逐段采纳的前缀保留，只重新生成后面的
          setSuggestion("");
        }
        beginBusy(Boolean(isReroll || immediate));
        apiStream("suggest", body, onEvent, controller.signal)
          .then(function (result) {
            if (!finished && result) {
              applySuggestionEvent(result.ok
                ? Object.assign({ type: "done" }, result)
                : Object.assign({ type: "error" }, result), isReroll, true);
            }
          })
          .catch(function (error) {
            endBusy();
            if (controller.signal.aborted) return;
            setSuggestion("");
            setTruncated(false);
            setManualError(String(error));
            setManualErrorKind("failed");
            noteFailure(sessionId, String(error));
            recordRun(sessionId, null, String(error), sessionTitle);
          });
        return true;
      };
      var reroll = function () {
        if (!switchEnabled) return;
        var limit = switchLimitRef.current;
        if (limit > 0 && switchCountRef.current >= limit) {
          setSwitchNotice(tt(t, "dock.switchLimit", { limit: limit }));
          return;
        }
        runRequest(true);
      };

      useEffect(function () {
        if (!visibleSuggestion) return;
        var onKey = function (event) {
          if (event.isComposing) return;
          if (!isComposerFocused(sessionId, event)) return;
          if (event.key === "ArrowUp" && switchEnabled && visibleSuggestion) {
            var hist = suggestionHistoryRef.current;
            if (historyIndexRef.current > 0) {
              historyIndexRef.current -= 1;
              setSuggestion(hist[historyIndexRef.current]);
              setSwitchNotice("");
              event.preventDefault();
              event.stopPropagation();
              return;
            }
          }
          if (event.key === "Escape") { event.preventDefault(); setSuggestion(""); suggestionHistoryRef.current = []; historyIndexRef.current = 0; switchCountRef.current = 0; setSwitchNotice(""); return; }
          // 任何可打印字符 → 认定用户开始输入，隐藏建议（与「开始输入自动消失」一致）
          if (!typedSince.current && typeof event.key === "string" && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            typedSince.current = true;
            typedDuringRequest.current = true;
            setTypedTick(function (n) { return n + 1; });
          }
          if (event.key !== "Tab" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
          if (!accept()) return;
          event.preventDefault();
          event.stopPropagation();
        };
        // 除了可打印键，粘贴 / 输入法合成 / 任何文本输入 / 拖拽落字 也算「用户开始输入」。
        // 只监听 keydown 的话，中文输入法（key=Process）和 Cmd+V 都躲得过去，灰字会压在正文上。
        var hideOnInput = function () {
          typedDuringRequest.current = true;
          if (typedSince.current) return;
          typedSince.current = true;
          setTypedTick(function (n) { return n + 1; });
        };
        var editor = findEditor(sessionId);
        var inputTarget = editor || window;
        // 不监听 paste：任何 capture 阶段的 paste 监听都可能与编辑器的粘贴处理互相干扰，
        // beforeinput/input 已经能可靠地识别粘贴。
        var inputEvents = ["compositionstart", "drop"];
        inputEvents.forEach(function (type) { inputTarget.addEventListener(type, hideOnInput, true); });
        window.addEventListener("keydown", onKey, true);
        return function () {
          inputEvents.forEach(function (type) { inputTarget.removeEventListener(type, hideOnInput, true); });
          window.removeEventListener("keydown", onKey, true);
        };
      }, [visibleSuggestion, accept, switchEnabled, sessionId]);

      // 建议直接以灰色 ghost text 覆盖在 Lexical 输入框首字符处。
      if (!enabled) return null;
      var dockBody;
      if (busyState && busyState.visible && !visibleSuggestion && !foreignDraftNow && !composingNow) {
        dockBody = h(GhostOverlay, {
          suggestion: tt(t, "dock.generatingAny"),
          busy: true, sessionId: sessionId, t: t,
        });
      } else if (!visibleSuggestion) {
        // 连续两次失败才提示，避免偶发超时刷屏；用户开始输入就不再打扰
        if (failure && failure.streak >= 2 && failure.sessionId === sessionId && !typedSince.current && !hasForeignDraft(sessionId)) {
          dockBody = h(ComposerHint, {
            sessionId: sessionId,
            text: tt(t, "dock.failureHint", { reason: String(failure.reason || "").slice(0, 80) }),
            t: t,
            actionLabel: findSettingsOpener()
              ? tt(t, "dock.openSettings")
              : tt(t, "dock.copySettingsPath"),
            onAction: openSettingsFromHint,
          });
        } else {
          dockBody = null;
        }
      } else if (dismissedByDraft.current || hasForeignDraft(sessionId)) {
        dockBody = null;
      } else {
        // 回到覆盖层：它在真实环境里是可见的（dock 内联行实测看不见）。
        // 「打字即隐藏」由上面的 typedSince 信号负责，不再依赖草稿状态。
        var histNow = suggestionHistoryRef.current;
        var canPrev = switchEnabled && historyIndexRef.current > 0;
        var nextAction = !switchEnabled ? "off" : (historyIndexRef.current < histNow.length - 1 ? "next" : "regen");
        dockBody = h(GhostOverlay, {
          suggestion: visibleSuggestion,
          sessionId: sessionId,
          truncated: truncated,
          onAccept: accept,
          onReroll: switchEnabled ? reroll : null,
          switchEnabled: switchEnabled,
          canPrev: canPrev,
          nextAction: nextAction,
          notice: switchNotice,
          t: t,
        });
      }
      // 手动换一条失败：立刻说明原因，不要等「连续两次失败」。
      if (!dockBody && manualError) {
        dockBody = h(ComposerHint, {
          sessionId: sessionId,
          below: true,
          text: manualErrorKind === "discarded"
            ? String(manualError).slice(0, 120)
            : tt(t, "dock.manualFailed", { reason: String(manualError).slice(0, 120) }),
          t: t,
          actionLabel: findSettingsOpener()
            ? tt(t, "dock.openSettings")
            : tt(t, "dock.copySettingsPath"),
          onAction: openSettingsFromHint,
        });
      }
      // 暂停时的常驻提示：否则用户会以为插件坏了
      if (!dockBody && pausedUntil > pauseNow) {
        dockBody = h(ComposerHint, { sessionId: sessionId, text: tt(t, "dock.paused", { time: formatLeft(pausedUntil - pauseNow) }), t: t });
      }
      return dockBody;
    }

    // 模型能力查询带 5 分钟缓存：设置页每次打开/保存都重查的话，provider 慢时会反复卡 3.5 秒超时。
    var effortsCache = new Map();
    function getEfforts(p, m) {
      var key = p + "/" + m;
      var hit = effortsCache.get(key);
      if (hit && Date.now() - hit.at < 5 * 60 * 1000) return Promise.resolve(hit.efforts);
      return api("efforts?provider=" + encodeURIComponent(p) + "&model=" + encodeURIComponent(m))
        .then(function (j) {
          var efforts = j && j.ok && Array.isArray(j.efforts) ? j.efforts : [];
          effortsCache.set(key, { at: Date.now(), efforts: efforts });
          return efforts;
        });
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
      var _ml = useState(true), multiline = _ml[0], setMultiline = _ml[1];   // 多行建议开关
      var _sw = useState(true), switchEnabled = _sw[0], setSwitchEnabled = _sw[1];   // 是否允许切换建议
      var _slim = useState(3), switchLimit = _slim[0], setSwitchLimit = _slim[1];   // 最大切换次数
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
      var _ik = useState(""), insertedKey = _ik[0], setInsertedKey = _ik[1];
      var _pause = useState(pausedUntil), pauseState = _pause[0], setPauseState = _pause[1];
      var _theme2 = useState(0), themeTick2 = _theme2[0], setThemeTick2 = _theme2[1];
      var _ver = useState(null), pluginVersion = _ver[0], setPluginVersion = _ver[1];
      var _upd = useState(""), updateState = _upd[0], setUpdateState = _upd[1];   // "" | "checking"
      var _updInfo = useState(null), updateInfo = _updInfo[0], setUpdateInfo = _updInfo[1];
      var _aue = useState(false), autoUpdateError = _aue[0], setAutoUpdateError = _aue[1];
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
      // 直接向 npm registry 查 latest（registry 允许跨域），失败就提示网络问题。
      function checkUpdate() {
        if (updateState === "checking") return;
        setUpdateState("checking");
        setUpdateInfo(null);
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, 10000);
        fetch("https://registry.npmjs.org/dsh-prompt-predict/latest", { signal: controller.signal, cache: "no-store" })
          .then(function (r) { if (!r || !r.ok) throw new Error("http " + (r && r.status)); return r.json(); })
          .then(function (j) {
            var latest = j && typeof j.version === "string" ? j.version : "";
            if (!latest) throw new Error("bad response");
            setUpdateInfo(versionNewer(latest, pluginVersion || "0.0.0")
              ? { status: "found", version: latest }
              : { status: "latest", version: latest });
          })
          .catch(function () { setUpdateInfo({ status: "error" }); })
          .finally(function () { clearTimeout(timer); setUpdateState(""); });
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
          setMultiline(eff.multilineSuggestions !== false);
          setSwitchEnabled(eff.switchEnabled !== false);
          setSwitchLimit(typeof eff.switchLimit === "number" ? eff.switchLimit : 3);
          setHistorySize(typeof eff.historySize === "number" ? eff.historySize : 10);
          setSuggestionLanguage(normalizeSavedLanguage(eff.suggestionLanguage || "auto"));
          if (Array.isArray(j.languages) && j.languages.length) setLanguageCodes(j.languages);
          historyLimit = typeof eff.historySize === "number" ? eff.historySize : 10;
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

      // 打开设置页时自动检查一次（10 分钟内不重复）；更新提示只出现在这里，不占用 composer。
      useEffect(function () {
        if (!pluginVersion) return;
        if (Date.now() - readLastUpdateCheck() < UPDATE_CHECK_INTERVAL) return;
        markUpdateChecked();
        fetchLatestVersion().then(function (latest) {
          setAutoUpdateError(false);
          if (latest && versionNewer(latest, pluginVersion)) setUpdateInfo({ status: "found", version: latest });
        }).catch(function () { setAutoUpdateError(true); });
      }, [pluginVersion]);

      // 新配的 provider 不必等缓存过期：手动绕过 Host 的 60s 缓存。
      function refreshCatalog() {
        setCatalogError("");
        api("catalog?refresh=1").then(function (j) {
          if (j && j.ok) { setCat(j.groups || []); }
          else setCatalogError((j && j.reason) || tt(t, "settings.catalogFailed"));
        }).catch(function (e) { setCatalogError(String(e)); });
      }

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
      // 渲染期解析出实际路由（原语），effect 只依赖它：st 整体变化不再触发重复查询。
      var effortProvider = provider, effortModel = model;
      if (effortProvider === "auto" || effortModel === "auto") {
        var cur0 = (st && (st.sessionModel && st.sessionModel.model ? st.sessionModel : st.current)) || {};
        effortProvider = cur0.provider; effortModel = cur0.model;
      }
      useEffect(function () {
        if (!effortProvider || !effortModel) { setEffortOptions([]); return; }
        getEfforts(effortProvider, effortModel)
          .then(function (efforts) { setEffortOptions(efforts); })
          .catch(function () { setEffortOptions([]); });
      }, [effortProvider, effortModel]);

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
          multilineSuggestions: multiline,
          switchEnabled: switchEnabled,
          switchLimit: switchLimit,
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
              // 失败同样写进历史：和普通预测行为一致，排障不用靠猜
              var tryReason = (j && j.reason) || tt(t, "dock.noSuggestion");
              setMsg({ ok: false, text: tryReason });
              recordRun(sid, null, tryReason, null);
            }
          })
          .catch(function (e) { setMsg({ ok: false, text: String(e) }); recordRun(sid, null, String(e), null); })
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
            : null,
          h("button", {
            type: "button",
            style: Object.assign({}, SS.linkBtn, { marginInlineStart: 8 }),
            "data-prompt-predict-update-check": "true",
            disabled: updateState === "checking" || busy || !pluginVersion,   // 版本号未加载前禁用，避免误报
            onClick: checkUpdate,
          }, updateState === "checking" ? tt(t, "settings.updateChecking") : tt(t, "settings.checkUpdate"))),
        autoUpdateError && !updateInfo
          ? h("p", { style: SS.muted, "data-prompt-predict-update-auto-error": "true" }, tt(t, "settings.updateAutoFailed"))
          : null,
        updateInfo
          ? h("p", { style: SS.muted, "data-prompt-predict-update-info": "true" },
            updateInfo.status === "found"
              ? h("span", null,
                h("span", null, tt(t, "settings.updateFound", { version: updateInfo.version })),
                h("button", {
                  type: "button",
                  style: Object.assign({}, SS.linkBtn, { marginInlineStart: 6 }),
                  "data-prompt-predict-update-copy": "true",
                  onClick: function () { copySuggestion("update-cmd", "dsh plugin --profile " + currentProfileName() + " add dsh-prompt-predict@" + updateInfo.version); },
                }, copiedKey === "update-cmd" ? tt(t, "settings.updateCopied") : tt(t, "settings.updateCopy")),
                h("span", { style: { display: "block" } },
                  tt(t, "settings.updateCommand", { command: "dsh plugin --profile " + currentProfileName() + " add dsh-prompt-predict@" + updateInfo.version })),
                h("span", { style: { display: "block", fontSize: 12, marginTop: 2 } }, tt(t, "settings.updateStep1")),
                h("span", { style: { display: "block", fontSize: 12 } }, tt(t, "settings.updateStep2")),
                h("span", { style: { display: "block", fontSize: 12 } }, tt(t, "settings.updateStep3")),
                h("span", { style: { display: "block", fontSize: 12, marginTop: 2 } }, tt(t, "settings.updateOtherEnv")))
              : updateInfo.status === "latest"
                ? tt(t, "settings.updateLatest")
                : tt(t, "settings.updateError"))
          : null,
        h("p", { style: SS.muted }, tt(t, "settings.desc")),
        h("p", {
          style: Object.assign({}, SS.muted, { fontWeight: 600 }),
          "data-prompt-predict-save-hint": "true",
        }, tt(t, "settings.saveHint")),

        h("div", { style: SS.row },
          h("span", { style: SS.label }, tt(t, "settings.enable")),
          h("button", { type: "button", style: SS.toggleTrack(enabled), onClick: function () { toggleEnabled(!enabled); }, disabled: busy, "aria-pressed": enabled },
            h("span", { style: SS.toggleThumb(enabled) })),
          h("span", { style: SS.muted }, enabled ? tt(t, "settings.on") : tt(t, "settings.off"))),
        h("p", { style: SS.muted }, tt(t, "settings.shortcutHint")),

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
            })),
          h("button", {
            type: "button", style: SS.linkBtn, "data-prompt-predict-refresh-models": "true",
            disabled: busy, onClick: refreshCatalog,
          }, tt(t, "settings.refreshModels"))),
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
          h("span", { style: SS.label }, tt(t, "settings.multiline")),
          h("button", {
            type: "button", style: dim(SS.toggleTrack(multiline), !enabled || busy), disabled: !enabled || busy,
            "data-prompt-predict-multiline": "true", "aria-pressed": multiline,
            onClick: function () { setMultiline(!multiline); setDirty(true); },
          }, h("span", { style: SS.toggleThumb(multiline) })),
          h("span", { style: SS.hintInline }, tt(t, "settings.multilineHint"))),

        h("div", { style: SS.row },
          h("span", { style: SS.label }, tt(t, "settings.switchEnabled")),
          h("button", {
            type: "button", style: dim(SS.toggleTrack(switchEnabled), !enabled || busy), disabled: !enabled || busy,
            "data-prompt-predict-switch": "true", "aria-pressed": switchEnabled,
            onClick: function () { setSwitchEnabled(!switchEnabled); setDirty(true); },
          }, h("span", { style: SS.toggleThumb(switchEnabled) })),
          h("span", { style: SS.hintInline }, tt(t, "settings.switchEnabledHint"))),

        switchEnabled
          ? h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.switchLimit")),
            h("input", {
              style: SS.input, type: "number", min: 0, max: 10, step: 1, value: switchLimit,
              disabled: !enabled || busy,
              "data-prompt-predict-switch-limit": "true", "aria-label": tt(t, "settings.switchLimit"),
              onChange: function (e) { setSwitchLimit(Number(e.target.value)); setDirty(true); },
            }),
            h("span", { style: SS.hintInline }, tt(t, "settings.switchLimitHint")))
          : null,

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
            h("input", { style: SS.input, type: "number", min: 0, max: 50, step: 1, value: historySize, "aria-label": tt(t, "settings.historySize"), disabled: !enabled || busy, onChange: function (e) { setHistorySize(Number(e.target.value)); setDirty(true); } }),
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
        historySize === 0
          ? h("p", { style: SS.muted }, tt(t, "settings.historyOff"))
          : history.length === 0
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
                      item.accepted
                        ? h("span", { style: { flex: "none", color: token("state-success-primary", colors().ok), fontSize: 11.5 }, "data-prompt-predict-accepted": "true" }, tt(t, "settings.historyAccepted"))
                        : null,
                      item.suggestion
                        ? h("button", {
                          type: "button", style: SS.copyBtn, "data-prompt-predict-history-copy": "true",
                          onClick: function (event) { if (event) event.stopPropagation(); copySuggestion(key, item.suggestion); },
                          onKeyDown: function (event) { if (event) event.stopPropagation(); },
                        }, copiedKey === key ? tt(t, "settings.historyCopied") : tt(t, "settings.historyCopy"))
                        : null,
                      item.suggestion
                        ? h("button", {
                          type: "button", style: SS.copyBtn, "data-prompt-predict-history-insert": "true",
                          onClick: function (event) {
                            if (event) event.stopPropagation();
                            try { window.dispatchEvent(new CustomEvent("dsh-prompt-predict:insert", { detail: { text: item.suggestion, sessionId: item.sessionId } })); } catch { /* 事件不可用就退化为仅提示 */ }
                            setInsertedKey(key);
                          },
                          onKeyDown: function (event) { if (event) event.stopPropagation(); },
                        }, insertedKey === key ? tt(t, "settings.historyInserted") : tt(t, "settings.historyInsert"))
                        : null)
                    : null);
              });
            })()),

        h("div", { style: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 } },
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

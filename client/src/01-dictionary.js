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


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
        "ghost.truncated": "已截断 · 建议调高输出上限（max tokens）",
        "ghost.truncatedHint": "模型输出撞到「输出上限」被截断：可在 设置 → 提示词联想 → 高级 里调高",
        "settings.title": "提示词联想",
        "settings.desc": "助手回复结束后，在输入框里直接给出灰色建议（Tab 采纳、Esc 忽略、开始输入自动消失）。",
        "settings.enable": "启用联想",
        "settings.on": "已开启",
        "settings.off": "已关闭",
        "settings.provider": "提供商",
        "settings.model": "模型",
        "settings.followSession": "跟随当前会话模型",
        "settings.modelHint": "默认跟随当前会话模型；也可固定到某个模型——选快模型更省额度。",
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
        "settings.maxTokens": "输出上限",
        "settings.maxTokensHint": "token（16–1024）。256 大约够 64 个汉字；仍出现半句截断时，把这里调高（最大 1024）",
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
        "run.effortDropped": "已自动降级思考档位",
        "run.dedupRetry": "已换一条",
        "run.truncated": "被输出上限截断",
        "settings.truncatedWarn": "最近一次预测被输出上限截断了：把上面的「输出上限」调高到 320 或更大，点「保存」，再触发一次联想试试。",
        "run.session": "会话 {name}",
        "run.failedShort": "失败 — {reason}",
        "settings.historyTitle": "最近预测（{count}/{limit}）",
        "settings.historyHint": "点一行可以展开当时的建议原文（只存在本机，不上传）",
        "settings.historyToggle": "展开 / 收起建议原文",
        "settings.historyExpand": "展开全部",
        "settings.historyCollapse": "收起",
        "settings.historyNoText": "这次预测没有记录到建议原文（功能上线前的旧记录）",
        "settings.historyEmpty": "还没有记录：触发一次联想后，这里会列出最近几次的会话、模型、耗时和异常标记。",
        "settings.historySize": "记录条数",
        "settings.historySizeHint": "保留最近多少次预测记录（1–50）。记录存在{storage}，本机、不上传，刷新/重启后仍在",
        "storage.electron": "本应用内（Electron 渲染层存储）",
        "storage.web": "浏览器的 localStorage",
        "dock.noSuggestion": "预测未返回有效建议",
        "dock.rerollFailed": "换一条失败",
      },
      en: {
        "effort.off": "Off", "effort.minimal": "Minimal", "effort.low": "Low",
        "effort.medium": "Medium", "effort.high": "High", "effort.max": "Max",
        "ghost.acceptHint": "Tab to accept · Alt+→ piece by piece",
        "ghost.reroll": "Suggest another",
        "ghost.dismiss": "Esc to dismiss",
        "ghost.truncated": "cut off · raise the output cap (max tokens)",
        "ghost.truncatedHint": "The model hit the output cap: raise \"Output cap\" in Settings → Prompt suggestions → Advanced",
        "settings.title": "Prompt suggestions",
        "settings.desc": "Shows a gray suggestion in the composer right after each reply (Tab to accept, Esc to dismiss, start typing and it goes away).",
        "settings.enable": "Enable predictions",
        "settings.on": "On",
        "settings.off": "Off",
        "settings.provider": "Provider",
        "settings.model": "Model",
        "settings.followSession": "Follow the current session model",
        "settings.modelHint": "Follows the current session model by default; pin a cheaper model to save quota.",
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
        "settings.maxTokens": "Output cap",
        "settings.maxTokensHint": "tokens (16-1024). 256 is about 64 Chinese characters; raise this if suggestions still get cut off (max 1024)",
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
        "run.effortDropped": "reasoning level auto-downgraded",
        "run.dedupRetry": "rerolled",
        "run.truncated": "hit the output cap",
        "settings.truncatedWarn": "The latest prediction hit the output cap: raise Output cap above to 320 or higher, click Save, then trigger a prediction again.",
        "run.session": "session {name}",
        "run.failedShort": "failed — {reason}",
        "settings.historyTitle": "Recent predictions ({count}/{limit})",
        "settings.historyHint": "Click a row to expand the suggestion text (stored locally, never uploaded)",
        "settings.historyToggle": "Expand / collapse the suggestion text",
        "settings.historyExpand": "Show all",
        "settings.historyCollapse": "Collapse",
        "settings.historyNoText": "No suggestion text recorded for this run (older record)",
        "settings.historyEmpty": "No records yet: trigger a prediction and this list shows the last few with their session, model, latency and flags.",
        "settings.historySize": "History size",
        "settings.historySizeHint": "how many recent predictions to keep (1-50). Stored in {storage}; local only, never uploaded, survives reloads",
        "storage.electron": "the app's own storage (Electron renderer)",
        "storage.web": "the browser's localStorage",
        "dock.noSuggestion": "Prediction returned no usable suggestion",
        "dock.rerollFailed": "Reroll failed",
      },
    };

    var EFFORT_LABEL_KEYS = {
      off: "effort.off", none: "effort.off", minimal: "effort.minimal",
      low: "effort.low", medium: "effort.medium", high: "effort.high", max: "effort.max",
    };

    // tt() 自己实现 {name} 插值，所以不依赖 t 是否支持参数，词序完全交给各语言的模板。
    var boundTranslate = null;
    var localeService = null;
    function fallbackTranslate(key) { return (DICT.zh && DICT.zh[key]) || key; }

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
        if (typeof v === "string" && v) return v.toLowerCase().indexOf("zh") === 0 ? "zh" : "en";
      } catch { /* 下面再试比对 */ }
      try {
        if (boundTranslate) {
          var probe = boundTranslate("settings.title");
          if (probe === DICT.en["settings.title"]) return "en";
        }
      } catch { /* 保守回中文 */ }
      return "zh";
    }
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
    var SS = {
      card: { border: "1px solid var(--dsh-border, #e7e8ee)", borderRadius: 14, padding: "20px 22px", maxWidth: 560, background: "var(--dsh-bg, #fff)" },
      title: { fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 4px" },
      muted: { color: "#6b7280", fontSize: 13, lineHeight: 1.7 },
      row: { display: "flex", alignItems: "center", gap: 12, margin: "14px 0" },
      label: { width: 110, fontSize: 13, color: "#374151", flex: "none" },
      select: { flex: 1, padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff", maxWidth: 320 },
      input: { width: 90, padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 },
      btnPrimary: { padding: "8px 16px", border: 0, borderRadius: 8, background: "#4f6ef7", color: "#fff", cursor: "pointer", fontSize: 13 },
      btnGhost: { padding: "8px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#374151", cursor: "pointer", fontSize: 13 },
      toggleTrack: function (on) { return { width: 38, height: 22, borderRadius: 22, border: 0, cursor: "pointer", padding: 2, background: on ? "#4f6ef7" : "#d1d5db", transition: "background .15s" }; },
      toggleThumb: function (on) { return { display: "block", width: 18, height: 18, borderRadius: 18, background: "#fff", transform: on ? "translateX(16px)" : "translateX(0)", transition: "transform .15s" }; },
      warn: { color: "#b45309", fontSize: 12.5, lineHeight: 1.7, margin: "-8px 0 0 122px" },
      warnBlock: { color: "#b45309", fontSize: 12.5, lineHeight: 1.7, margin: "-4px 0 12px" },
      sectionTitle: { fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 8px" },
      histHead: { display: "flex", alignItems: "baseline", gap: 10, margin: "0 0 6px" },
      histToggle: { background: "none", border: 0, color: "#4f6ef7", fontSize: 12, cursor: "pointer", padding: 0 },
      histHint: { color: "#9ca3af", fontSize: 12, lineHeight: 1.7, margin: "0 0 6px" },
      histRowWrap: { borderBottom: "1px solid #f1f1f5", padding: "2px 0" },
      histRow: { display: "flex", gap: 10, alignItems: "baseline", fontSize: 12.5, lineHeight: 1.9 },
      histCaret: { color: "#9ca3af", flex: "none", width: 10, fontSize: 11 },
      histText: { whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#374151", fontSize: 12.5, lineHeight: 1.7, margin: "2px 0 10px 20px", padding: "8px 10px", borderRadius: 8, background: "#f8fafc" },
      histWhen: { color: "#6b7280", flex: "none", width: 76 },
      histWho: { color: "#111827", flex: "none", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      histWhat: { color: "#6b7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      err: { color: "#dc2626", fontSize: 12, marginTop: 8 },
      ok: { color: "#047857", fontSize: 12, marginTop: 8 },
      divider: { borderTop: "1px solid #ececf1", margin: "16px 0" },
      advBtn: { background: "none", border: 0, color: "#4f6ef7", fontSize: 13, cursor: "pointer", padding: 0 },
    };
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

    function notifySettings(effective) {
      window.dispatchEvent(new CustomEvent("dsh-prompt-predict:settings", { detail: effective }));
    }

    function findEditor(sessionId) {
      var scoped = sessionId ? document.querySelector('[data-conversation-session="' + sessionId + '"] [data-composer-input="true"]') : null;
      return scoped || document.querySelector('[data-composer-input="true"]');
    }

    // ============ 模块级共享状态（composer dock 写、设置页读） ============
    // 设置页本身拿不到会话上下文，但「思考档位」必须按**会话实际模型**生成，
    // 否则用户选到的档位可能不被真实调用的模型支持（表现为「设置都对但永远没有建议」）。
    var liveSessionId = null;
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
    // 存储位置的说法要跟运行环境一致：desktop 是 Electron 渲染层，web 是页面 localStorage。
    // 措辞写死成任意一种，另一个平台就会显示错。
    function storagePlatformKey() {
      try {
        var ua = typeof navigator !== "undefined" && navigator && navigator.userAgent ? String(navigator.userAgent) : "";
        return /electron/i.test(ua) ? "storage.electron" : "storage.web";
      } catch { return "storage.web"; }
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
    function recordRun(sessionId, result, error, title) {
      var entry = {
        at: Date.now(),
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
      if (item.error) return tt(t, "run.failedShort", { reason: String(item.error).slice(0, 80) });
      var bits = [(item.provider || "?") + " / " + (item.model || "?")];
      if (typeof item.ms === "number") bits.push(item.ms + " ms");
      if (item.effortDropped) bits.push(tt(t, "run.effortDropped"));
      if (item.dedupRetry) bits.push(tt(t, "run.dedupRetry"));
      if (item.truncated) bits.push(tt(t, "run.truncated"));
      return bits.join(" · ");
    }

    // 行内 ghost text 覆盖层：不写进 Lexical，只有 Tab/点击采纳时才 insertText。
    function GhostOverlay(props) {
      var suggestion = props.suggestion;
      var truncated = Boolean(props.truncated);
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
        style: {
          position: "fixed", left: pos.left, top: pos.top, zIndex: 60,
          width: pos.width || undefined,
          pointerEvents: "none",
          fontFamily: pos.fontFamily, fontSize: pos.fontSize, lineHeight: pos.lineHeight, fontWeight: pos.fontWeight,
          // 长建议在原位折行显示，完整可见；只有采纳才写进 Lexical。
          color: "#9aa3b2", whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word",
        },
      },
        h("span", {
          style: { color: "#9aa3b2" },
        }, suggestion),
        h("span", {
          style: { display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 8, whiteSpace: "nowrap", verticalAlign: "middle" },
        },
          h("button", {
            type: "button", onClick: onAccept,
            title: tt(t, "ghost.acceptHint"),
            style: {
              pointerEvents: "auto", padding: "0 7px", height: 19, borderRadius: 5,
              border: "1px solid var(--dsw-alias-border-l1, #d1d5db)", background: "var(--dsw-alias-bg-secondary, #f8fafc)",
              color: "#9aa3b2", fontSize: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", cursor: "pointer",
            },
          }, "Tab"),
          h("button", {
            type: "button", onClick: onReroll, title: tt(t, "ghost.reroll"),
            style: {
              pointerEvents: "auto", width: 19, height: 19, padding: 0, borderRadius: 5,
              border: "1px solid var(--dsw-alias-border-l1, #d1d5db)", background: "var(--dsw-alias-bg-secondary, #f8fafc)",
              color: "#9aa3b2", fontSize: 11, lineHeight: 1, cursor: "pointer",
            },
          }, "↻"),
          h("span", { style: { color: "#b0b7c3", fontSize: 10, whiteSpace: "nowrap" } }, tt(t, "ghost.dismiss")),
          truncated
            ? h("span", { style: { color: "#c08457", fontSize: 10, whiteSpace: "nowrap" }, title: tt(t, "ghost.truncatedHint") }, tt(t, "ghost.truncated"))
            : null
        )
      );
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

      // 首次读取启用状态；设置页保存后通过事件让当前会话立即生效。
      useEffect(function () {
        api("status").then(function (j) {
          setEnabled(!(j && j.effective && j.effective.enabled === false));
          if (j && j.effective && typeof j.effective.historySize === "number") historyLimit = j.effective.historySize;
        }).catch(function () { });
      }, [sessionId]);
      useEffect(function () {
        var changed = function (event) {
          var on = event.detail?.enabled !== false;
          setEnabled(on);
          if (event.detail && typeof event.detail.historySize === "number") historyLimit = event.detail.historySize;
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
        liveSessionId = sessionId;          // 给设置页取「会话实际模型」用
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
        if (!sessionId || blank || removed || !armed.current) return;
        if (draft.trim() !== "") return;
        armed.current = false;
        var controller = new AbortController();
        abortRef.current = controller;
        var timer = setTimeout(function () {
          api("suggest", { sessionId: sessionId })
            .then(function (result) {
              if (controller.signal.aborted || sessionRef.current !== sessionId) return;
              if (result && result.ok && typeof result.suggestion === "string") {
                typedSince.current = false;
                setSuggestion(result.suggestion.trim());
                setTruncated(Boolean(result.truncated));
                recordRun(sessionId, result, null, sessionTitle);
              } else {
                // 失败照样记下来：设置页会显示原因（以前是彻底静默，排查全靠猜）
                recordRun(sessionId, null, (result && result.reason) || tt(t, "dock.noSuggestion"), sessionTitle);
              }
            })
            .catch(function (error) { recordRun(sessionId, null, String(error), sessionTitle); });
        }, 350);
        return function () {
          clearTimeout(timer);
          controller.abort();
          if (abortRef.current === controller) abortRef.current = null;
        };
      }, [sessionId, running, blank, removed, draft, enabled]);

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
        api("suggest", { sessionId: sessionId, reroll: true, avoid: suggestion })
          .then(function (result) {
            if (controller.signal.aborted || sessionRef.current !== sessionId) return;
            if (result && result.ok && typeof result.suggestion === "string") {
              setSuggestion(result.suggestion.trim());
              setAccepted("");
              recordRun(sessionId, result, null, sessionTitle);
            } else {
              recordRun(sessionId, null, (result && result.reason) || tt(t, "dock.rerollFailed"), sessionTitle);
            }
          })
          .catch(function (error) { recordRun(sessionId, null, String(error), sessionTitle); });
      }, [sessionId, suggestion]);

      useEffect(function () {
        if (!visibleSuggestion) return;
        var onKey = function (event) {
          if (event.isComposing) return;
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
        window.addEventListener("keydown", onKey, true);
        return function () { window.removeEventListener("keydown", onKey, true); };
      }, [visibleSuggestion, accept, acceptChunk]);

      // 建议直接以灰色 ghost text 覆盖在 Lexical 输入框首字符处。
      if (!enabled || dismissedByDraft.current || !visibleSuggestion) return null;
      // 回到覆盖层：它在真实环境里是可见的（dock 内联行实测看不见）。
      // 「打字即隐藏」由上面的 typedSince 信号负责，不再依赖草稿状态。
      return h(GhostOverlay, { suggestion: visibleSuggestion, sessionId: sessionId, truncated: truncated, onAccept: accept, onReroll: reroll, t: t });
    }

    // ================= 设置页 =================
    function SettingsSection(props) {
      var t = props.t;
      var _st = useState(null), st = _st[0], setSt = _st[1];
      var _cat = useState(null), cat = _cat[0], setCat = _cat[1];
      var _pv = useState(""), provider = _pv[0], setProvider = _pv[1];
      var _md = useState(""), model = _md[0], setModel = _md[1];
      var _to = useState(12), timeoutSec = _to[0], setTimeoutSec = _to[1];
      var _ctx = useState(8), ctxSize = _ctx[0], setCtxSize = _ctx[1];
      var _mc = useState(6000), maxChars = _mc[0], setMaxChars = _mc[1];
      var _mt = useState(256), maxTokens = _mt[0], setMaxTokens = _mt[1];
      var _hs = useState(10), historySize = _hs[0], setHistorySize = _hs[1];
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

      function loadAll() {
        // 带上当前会话 id：这样「跟随会话模型」时档位下拉拿到的是会话真实模型，
        // 而不是全局默认模型——两者不同时会让用户选到不被支持的档位。
        api("status" + (liveSessionId ? "?sessionId=" + encodeURIComponent(liveSessionId) : "")).then(function (j) {
          if (!j || !j.ok) return;
          setSt(j);
          var eff = j.effective || {};
          setProvider(eff.provider || "");
          setModel(eff.model || "");
          setTimeoutSec(Math.round((eff.timeoutMs || 12000) / 1000));
          setCtxSize(eff.maxMessages || 8);
          setMaxChars(eff.maxChars || 6000);
          setMaxTokens(eff.maxTokens || 256);
          setHistorySize(eff.historySize || 10);
          historyLimit = eff.historySize || 10;
          var stored = readStoredHistory();
          if (stored.length) setHistory(stored);
          setEffort(eff.reasoningEffort || "off");
          setDirty(false);
        }).catch(function () { });
        api("catalog").then(function (j) { if (j && j.ok) setCat(j.groups || []); }).catch(function () { });
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

      function providerGroups() { return (cat || []).filter(function (g) { return g.models && g.models.length; }); }
      function modelsOf(p) {
        var g = (cat || []).find(function (x) { return x.id === p; });
        return g ? g.models : [];
      }

      function save() {
        setBusy(true); setMsg(null);
        api("settings", {
          provider: provider, model: model,
          timeoutMs: timeoutSec * 1000,
          maxMessages: ctxSize,
          maxChars: maxChars,
          maxTokens: maxTokens,
          historySize: historySize,
          reasoningEffort: effort,
        }).then(function (j) {
          if (j && j.ok) { notifySettings(j.effective); setMsg({ ok: true, text: tt(t, "settings.saved") }); setDirty(false); loadAll(); }
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
      function resetDefaults() {
        setBusy(true); setMsg(null);
        api("settings", { reset: true }).then(function (j) {
          if (j && j.ok) { notifySettings(j.effective); setMsg({ ok: true, text: tt(t, "settings.resetDone") }); loadAll(); }
        }).finally(function () { setBusy(false); });
      }

      if (!st) return h("div", { style: SS.card }, h("p", { style: SS.muted }, tt(t, "settings.loading")));
      var eff = st.effective || {};
      var enabled = eff.enabled !== false;

      return h("div", { style: SS.card },
        h("p", { style: SS.title }, tt(t, "settings.title")),
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
            style: SS.select, value: provider, disabled: !enabled || busy,
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
              return h("option", { key: g.id, value: g.id }, g.name + "（" + g.id + "）");
            }))),
        h("div", { style: SS.row },
          h("span", { style: SS.label }, tt(t, "settings.model")),
          h("select", {
            style: SS.select, value: model, disabled: !enabled || busy || provider === "auto",
            onChange: function (e) { setModel(e.target.value); setEffort("auto"); setDirty(true); },
          },
            provider === "auto"
              ? h("option", { value: "auto" }, tt(t, "settings.followSession"))
              : modelsOf(provider).map(function (m) {
                  return h("option", { key: m.id, value: m.id }, m.name + "（" + m.id + "）");
                }))),
        h("p", { style: SS.muted }, tt(t, "settings.modelHint")),

        h("p", null, h("button", { style: SS.advBtn, onClick: function () { setAdv(!adv); } }, (adv ? "▾" : "▸") + tt(t, "settings.advanced"))),
        adv ? h("div", null,
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.timeout")),
            h("input", { style: SS.input, type: "number", min: 1, max: 60, value: timeoutSec, disabled: !enabled || busy, onChange: function (e) { setTimeoutSec(Number(e.target.value)); setDirty(true); } }),
            h("span", { style: SS.muted }, tt(t, "settings.timeoutUnit"))),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.contextSize")),
            h("select", { style: SS.select, value: ctxSize, disabled: !enabled || busy, onChange: function (e) { setCtxSize(Number(e.target.value)); setDirty(true); } },
              h("option", { value: 3 }, tt(t, "settings.contextSmall")),
              h("option", { value: 8 }, tt(t, "settings.contextStandard")),
              h("option", { value: 12 }, tt(t, "settings.contextLarge"))),
            h("span", { style: SS.muted }, tt(t, "settings.contextHint"))),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.maxChars")),
            h("input", { style: SS.input, type: "number", min: 1000, max: 20000, step: 500, value: maxChars, disabled: !enabled || busy, onChange: function (e) { setMaxChars(Number(e.target.value)); setDirty(true); } }),
            h("span", { style: SS.muted }, tt(t, "settings.maxCharsHint"))),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.maxTokens")),
            h("input", { style: SS.input, type: "number", min: 16, max: 1024, step: 8, value: maxTokens, disabled: !enabled || busy, onChange: function (e) { setMaxTokens(Number(e.target.value)); setDirty(true); } }),
            h("span", { style: SS.muted }, tt(t, "settings.maxTokensHint"))),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.historySize")),
            h("input", { style: SS.input, type: "number", min: 1, max: 50, step: 1, value: historySize, disabled: !enabled || busy, onChange: function (e) { setHistorySize(Number(e.target.value)); setDirty(true); } }),
            h("span", { style: SS.muted }, tt(t, "settings.historySizeHint", { storage: tt(t, storagePlatformKey()) }))),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, tt(t, "settings.effort")),
            h("select", { style: SS.select, value: effort, disabled: !enabled || busy, onChange: function (e) { setEffort(e.target.value); setDirty(true); } },
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
            : null),
        // 真被截断时不用展开「高级」就能看到：直接给可执行的建议
        run && run.truncated
          ? h("p", { style: SS.warnBlock }, tt(t, "settings.truncatedWarn"))
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
                  h("div", {
                    "data-prompt-predict-history-row": "true",
                    style: Object.assign({}, SS.histRow, { cursor: "pointer" }),
                    onClick: function () { setOpenKey(isOpen ? "" : key); },
                    title: tt(t, "settings.historyToggle"),
                  },
                    h("span", { style: SS.histCaret }, isOpen ? "▾" : "▸"),
                    h("span", { style: SS.histWhen }, new Date(item.at).toLocaleTimeString()),
                    h("span", { style: SS.histWho, title: String(runSessionName(item) || "") }, runSessionName(item) || "-"),
                    h("span", { style: SS.histWhat, title: historyDetail(item, t) }, historyDetail(item, t))),
                  isOpen
                    ? h("div", { style: SS.histText }, item.suggestion || tt(t, "settings.historyNoText"))
                    : null);
              });
            })()),

        h("div", { style: { display: "flex", gap: 10, marginTop: 16 } },
          h("button", { style: dim(SS.btnPrimary, busy || !dirty), onClick: save, disabled: busy || !dirty }, busy ? tt(t, "settings.saving") : tt(t, "settings.save")),
          h("button", { style: dim(SS.btnGhost, busy), onClick: resetDefaults, disabled: busy }, tt(t, "settings.reset"))),
        msg ? h("p", { style: msg.ok ? SS.ok : SS.err }, msg.text) : null);
    }

    function apply(ctx) {
      // 注册词典并绑定翻译函数：DSH 的 locale 服务会把语言切换即时应用到已挂载的界面；
      // 没有该服务（旧运行时）时保持中文兜底，不会退化成显示 key。
      try {
        if (ctx.locale && typeof ctx.locale.register === "function") {
          ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en });
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

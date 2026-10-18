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
        "settings.maxTokensHint": "token（16–512），建议够一句话即可",
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
        "run.none": "上次预测：暂无记录（本轮还沒触发过联想）",
        "run.line": "上次预测：{time} · {detail}",
        "run.failed": "上次预测：{time} · 失败 — {reason}",
        "run.effortDropped": "已自动降级思考档位",
        "run.dedupRetry": "已换一条",
        "dock.noSuggestion": "预测未返回有效建议",
        "dock.rerollFailed": "换一条失败",
      },
      en: {
        "effort.off": "Off", "effort.minimal": "Minimal", "effort.low": "Low",
        "effort.medium": "Medium", "effort.high": "High", "effort.max": "Max",
        "ghost.acceptHint": "Tab to accept · Alt+→ piece by piece",
        "ghost.reroll": "Suggest another",
        "ghost.dismiss": "Esc to dismiss",
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
        "settings.maxTokensHint": "tokens (16–512); enough for one sentence",
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
        "run.none": "Last prediction: no record yet (nothing triggered this round)",
        "run.line": "Last prediction: {time} · {detail}",
        "run.failed": "Last prediction: {time} · failed — {reason}",
        "run.effortDropped": "reasoning level auto-downgraded",
        "run.dedupRetry": "rerolled",
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
    // 上一次预测的结果快照：设置页据此显示「上次预测：模型 / 耗时 / 错误」。
    // 之前失败是静默的，用户和作者都看不出是没触发、超时还是模型报错。
    var lastRun = null;
    function recordRun(result, error) {
      lastRun = {
        at: Date.now(),
        ms: result && typeof result.ms === "number" ? result.ms : null,
        provider: (result && result.provider) || null,
        model: (result && result.model) || null,
        effortDropped: Boolean(result && result.effortDropped),
        dedupRetry: Boolean(result && result.dedupRetry),
        error: error || null,
      };
      window.dispatchEvent(new CustomEvent("dsh-prompt-predict:run", { detail: lastRun }));
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

    // 上次预测的运行情况：模型 / 耗时 / 是否降级 / 是否换过 / 失败原因
    function runText(run, t) {
      if (!run) return tt(t, "run.none");
      var time = new Date(run.at).toLocaleTimeString();
      if (run.error) return tt(t, "run.failed", { time: time, reason: String(run.error) });
      var bits = [(run.provider || "?") + " / " + (run.model || "?")];
      if (typeof run.ms === "number") bits.push(run.ms + " ms");
      if (run.effortDropped) bits.push(tt(t, "run.effortDropped"));
      if (run.dedupRetry) bits.push(tt(t, "run.dedupRetry"));
      return tt(t, "run.line", { time: time, detail: bits.join(" · ") });
    }

    // 行内 ghost text 覆盖层：不写进 Lexical，只有 Tab/点击采纳时才 insertText。
    function GhostOverlay(props) {
      var suggestion = props.suggestion;
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
        setPos({
          left: r.left + parseFloat(cs.paddingLeft || "0"),
          top: r.top + parseFloat(cs.paddingTop || "0"),
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
          display: "flex", alignItems: "baseline", gap: 8, pointerEvents: "none",
          fontFamily: pos.fontFamily, fontSize: pos.fontSize, lineHeight: pos.lineHeight, fontWeight: pos.fontWeight,
          maxWidth: "min(70vw, 72ch)",
        },
      },
        h("span", {
          style: { color: "#9aa3b2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60ch" },
        }, suggestion),
        h("button", {
          type: "button", onClick: onAccept,
          title: tt(t, "ghost.acceptHint"),
          style: {
            pointerEvents: "auto", flex: "none", padding: "0 7px", height: 19, borderRadius: 5,
            border: "1px solid var(--dsw-alias-border-l1, #d1d5db)", background: "var(--dsw-alias-bg-secondary, #f8fafc)",
            color: "#9aa3b2", fontSize: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", cursor: "pointer",
          },
        }, "Tab"),
        h("button", {
          type: "button", onClick: onReroll, title: tt(t, "ghost.reroll"),
          style: {
            pointerEvents: "auto", flex: "none", width: 19, height: 19, padding: 0, borderRadius: 5,
            border: "1px solid var(--dsw-alias-border-l1, #d1d5db)", background: "var(--dsw-alias-bg-secondary, #f8fafc)",
            color: "#9aa3b2", fontSize: 11, lineHeight: 1, cursor: "pointer",
          },
        }, "↻"),
        h("span", { style: { color: "#b0b7c3", fontSize: 10, whiteSpace: "nowrap" } }, tt(t, "ghost.dismiss")));
    }

    // ================= 建议（composer dock 仅提供生命周期；显示覆盖到输入框内） =================
    function PredictionDock(props) {
      var sessionId = props.sessionId;
      var useSession = props.useSession;
      var useInput = props.useInput;
      var inputActions = props.inputActions;
      var t = props.t;
      var running = useSession(function (value) { return Boolean(value && value.running); });
      var blank = useSession(function (value) { return Boolean(value && value.blank); });
      var removed = useSession(function (value) { return Boolean(value && value.removed); });
      var propsDraft = useInput(function (value) { return String(value && value.draft || ""); });
      // DSH 0.2.1-rc.1 起 useInput 的快照里没有 draft 了（换成了 Lexical 输入态字段），
      // 只依赖它会让插件永远以为输入框是空的。这里直接读输入框 DOM，并订阅输入事件。
      var _dd = useState(""), domDraft = _dd[0], setDomDraft = _dd[1];
      useEffect(function () {
        var ed = findEditor(sessionId);
        if (!ed) return undefined;
        var sync = function () { setDomDraft(String(ed.innerText || "")); };
        sync();
        ed.addEventListener("input", sync);
        ed.addEventListener("keyup", sync);
        ed.addEventListener("compositionend", sync);
        return function () {
          ed.removeEventListener("input", sync);
          ed.removeEventListener("keyup", sync);
          ed.removeEventListener("compositionend", sync);
        };
      }, [sessionId, running]);
      var draft = propsDraft !== "" ? propsDraft : domDraft;
      var _s = useState(""), suggestion = _s[0], setSuggestion = _s[1];
      var _ac = useState(""), accepted = _ac[0], setAccepted = _ac[1];   // 逐段采纳已写进输入框的前缀
      var _en = useState(true), enabled = _en[0], setEnabled = _en[1];
      var armed = useRef(true);
      var abortRef = useRef(null);
      var sessionRef = useRef(sessionId);
      var dismissedByDraft = useRef(false);
      // 逐段采纳的前缀，只有「输入框里确实还留着它」时才算数：
      // 用户把它删掉后必须重新完整展示整条建议，否则会出现从中间截断的鬼影。
      var prefixKept = accepted !== "" && suggestion.indexOf(accepted) === 0 && draft === accepted;
      var remaining = prefixKept ? suggestion.slice(accepted.length) : suggestion;
      // 打字即隐藏，两种例外：
      //   (a) 草稿又被删空 —— 用户回到了「需要建议」的状态，让它重新浮现（只有 Esc 才是永久忽略）
      //   (b) 草稿正是我们逐段写进去、且没有改动的前缀 —— 不能把自己插的内容误判成用户打字
      dismissedByDraft.current = draft.trim() !== "" && !prefixKept;
      var visibleSuggestion = dismissedByDraft.current ? "" : remaining;

      // 首次读取启用状态；设置页保存后通过事件让当前会话立即生效。
      useEffect(function () {
        api("status").then(function (j) { setEnabled(!(j && j.effective && j.effective.enabled === false)); }).catch(function () { });
      }, [sessionId]);
      useEffect(function () {
        var changed = function (event) {
          var on = event.detail?.enabled !== false;
          setEnabled(on);
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
        if (abortRef.current) abortRef.current.abort();
      }, [sessionId]);

      useEffect(function () {
        if (!enabled) return;
        if (running) {
          armed.current = true;
          dismissedByDraft.current = false;
          setSuggestion("");
          setAccepted("");
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
                setSuggestion(result.suggestion.trim());
                recordRun(result, null);
              } else {
                // 失败照样记下来：设置页会显示原因（以前是彻底静默，排查全靠猜）
                recordRun(null, (result && result.reason) || tt(t, "dock.noSuggestion"));
              }
            })
            .catch(function (error) { recordRun(null, String(error)); });
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
              recordRun(result, null);
            } else {
              recordRun(null, (result && result.reason) || tt(t, "dock.rerollFailed"));
            }
          })
          .catch(function (error) { recordRun(null, String(error)); });
      }, [sessionId, suggestion]);

      useEffect(function () {
        if (!visibleSuggestion) return;
        var onKey = function (event) {
          if (event.isComposing) return;
          if (event.key === "Escape") { event.preventDefault(); setSuggestion(""); setAccepted(""); return; }
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
      return h(GhostOverlay, { suggestion: visibleSuggestion, sessionId: sessionId, onAccept: accept, onReroll: reroll, t: t });
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
      var _mt = useState(64), maxTokens = _mt[0], setMaxTokens = _mt[1];
      var _ef = useState("off"), effort = _ef[0], setEffort = _ef[1];
      var _eo = useState([]), effortOptions = _eo[0], setEffortOptions = _eo[1];
      var _run = useState(lastRun), run = _run[0], setRun = _run[1];
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
          setMaxTokens(eff.maxTokens || 64);
          setEffort(eff.reasoningEffort || "off");
          setDirty(false);
        }).catch(function () { });
        api("catalog").then(function (j) { if (j && j.ok) setCat(j.groups || []); }).catch(function () { });
      }
      useEffect(function () { loadAll(); }, []);

      // 设置页打开时若已有预测记录，直接显示；之后靠事件实时刷新
      useEffect(function () {
        var on = function (event) { setRun(event.detail); };
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
            h("input", { style: SS.input, type: "number", min: 16, max: 512, step: 8, value: maxTokens, disabled: !enabled || busy, onChange: function (e) { setMaxTokens(Number(e.target.value)); setDirty(true); } }),
            h("span", { style: SS.muted }, tt(t, "settings.maxTokensHint"))),
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
        h("p", { style: SS.muted }, runText(run, t)),

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

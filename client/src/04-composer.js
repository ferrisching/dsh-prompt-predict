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


    // 会话内的显式选择要按点击顺序保存；同一会话的新查询等前一次写入完成。
    // 这里只追踪尚未发送完的请求，待用内容始终由 Host 保存。
    var pendingRoundWrites = new Map();
    function writeRound(path, body) {
      var previous = pendingRoundWrites.get(body.sessionId);
      var send = function () { return api(path, body, { keepalive: true }).catch(function () {}); };
      // 忽略/采纳不能等选中请求返回；Host 不允许 select 复活已经忽略的轮次。
      var write = path === "select" && previous ? previous.then(send) : send();
      var pending = previous && path === "dismiss" ? Promise.all([previous, write]) : write;
      pendingRoundWrites.set(body.sessionId, pending);
      pending.then(function () {
        if (pendingRoundWrites.get(body.sessionId) === pending) pendingRoundWrites.delete(body.sessionId);
      });
    }

    // ================= 建议（composer dock 仅提供生命周期；显示覆盖到输入框内） =================
    function PredictionDock(props) {
      var sessionId = props.sessionId;
      var useSession = props.useSession;
      var useInput = props.useInput;
      var inputActions = props.inputActions;
      var actionsRef = useRef(inputActions);
      actionsRef.current = inputActions;
      var t = props.t;
      // 标题：先看会话 store（列表），再退回当前会话对象本身。两个 hook 都必须无条件调用。
      var useSessions = typeof props.useSessions === "function" ? props.useSessions : function () { return null; };
      var titleFromStore = useSessions(function (state) { return titleFromList(state, sessionId); });
      var titleFromCurrent = useSession(function (value) { return titleOfSession(value); });
      var sessionTitle = titleFromStore || titleFromCurrent;
      var running = useSession(function (value) { return Boolean(value && value.running); });
      var blank = useSession(function (value) { return Boolean(value && value.blank); });
      var removed = useSession(function (value) { return Boolean(value && value.removed); });
      var draft = useInput(function (value) { return String(value && value.draft || ""); });
      var inputAttachments = useInput(function (value) {
        var keys = ["attachmentIds", "attachments", "files", "images", "pendingFiles", "uploadingFiles", "pendingAttachments"];
        return Boolean(value && keys.some(function (key) { return Array.isArray(value[key]) && value[key].length > 0; }));
      });
      var _s = useState(null), selected = _s[0], setSelected = _s[1];
      var selectedRef = useRef(null);
      var _busy = useState(null), busyState = _busy[0], setBusyState = _busy[1];
      var busyTimerRef = useRef(null);
      var _pn = useState(Date.now()), pauseNow = _pn[0], setPauseNow = _pn[1];
      var _et = useState(0), editorTick = _et[0], setEditorTick = _et[1];
      var _theme = useState(0), setThemeTick = _theme[1];
      var _fail = useState(failState), failure = _fail[0], setFailure = _fail[1];
      var showFailure = useRef(false);
      var _me = useState(""), manualError = _me[0], setManualError = _me[1];
      var _en = useState(true), enabled = _en[0], setEnabled = _en[1];
      var enabledRef = useRef(true);
      var settingsRevision = useRef(0);
      var _min = useState(false), minimalDisplay = _min[0], setMinimalDisplay = _min[1];
      var _swi = useState(true), switchEnabled = _swi[0], setSwitchEnabled = _swi[1];
      var switchLimitRef = useRef(3);
      var suggestionHistoryRef = useRef([]);
      var historyIndexRef = useRef(0);
      var switchCountRef = useRef(0);
      var _swnt = useState(""), switchNotice = _swnt[0], setSwitchNotice = _swnt[1];
      var armed = useRef(true);
      var requestRef = useRef(null);
      var sessionRef = useRef(null);
      var pasteMask = useRef(null);
      var lastReplaceAt = useRef(0);
      var typedSince = useRef(false);  // rc.2 起 draft 可能不可读；可打印键/输入事件兜底
      var seenDomDraft = useRef(false);
      var seenDomAttachments = useRef(false);
      var composingRef = useRef(false);
      var composingInComposer = useRef(false);
      var composingAt = useRef(0);
      var storeDraft = useRef("");
      var storeAttachments = useRef(false);
      var keyHandlers = useRef(null);
      var unavailable = !sessionId || running || blank || removed;

      // store 能确认清空时，不再依赖编辑器的 DOM 或按键兜底。
      if (storeDraft.current.trim() && !draft.trim()) typedSince.current = false;
      if (storeDraft.current !== draft || storeAttachments.current !== inputAttachments) pasteMask.current = null;
      storeDraft.current = draft;
      storeAttachments.current = inputAttachments;

      function isComposingNow() {
        if (!composingRef.current) return false;
        if (Date.now() - composingAt.current < 5000) return true;
        composingRef.current = false;   // 宿主漏发 compositionend 时自愈
        return false;
      }
      function hasDraft() {
        return typedSince.current || pasteMask.current || storeAttachments.current
          || storeDraft.current.trim() !== "" || isComposingNow() || hasForeignDraft(sessionId);
      }
      function canSuggest() {
        return !unavailable && sessionRef.current === sessionId && enabledRef.current
          && pausedUntil <= Date.now() && !isPaused();
      }
      var draftHidden = hasDraft();
      var visibleSuggestion = canSuggest() && !draftHidden && selected ? selected.suggestion.trim() : "";

      function choose(entry) {
        selectedRef.current = entry;
        setSelected(entry);
      }
      function clearHistory() {
        suggestionHistoryRef.current = [];
        historyIndexRef.current = 0;
        switchCountRef.current = 0;
        setSwitchNotice("");
      }
      function endBusy() {
        if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
        busyTimerRef.current = null;
        setBusyState(null);
      }
      function ownsRequest(request) {
        return requestRef.current === request && !request.controller.signal.aborted && canSuggest();
      }
      function cancelRequest() {
        var request = requestRef.current;
        requestRef.current = null;
        if (request) {
          if (request.timer) clearTimeout(request.timer);
          request.controller.abort();
        }
      }
      function beginBusy(request, immediate) {
        setBusyState({ visible: immediate });
        if (immediate) return;
        busyTimerRef.current = setTimeout(function () {
          if (!ownsRequest(request)) return;
          busyTimerRef.current = null;
          setBusyState(function (prev) { return prev ? { visible: true } : prev; });
        }, 900);
      }
      function resetSuggestion() {
        cancelRequest();
        endBusy();
        clearHistory();
        showFailure.current = false;
        setManualError("");
        choose(null);
      }

      // 只有当前请求的 start/done 能绑定当前候选的 round；兼容不返回 round 的旧 Host。
      function applySuggestionEvent(request, event) {
        if (!event || !ownsRequest(request)) return;
        if (typeof event.round === "string" && (event.type === "start" || event.type === "done")) {
          request.round = event.round;
          var first = suggestionHistoryRef.current[0];
          if (first && first.round !== request.round) clearHistory();
        }
        if (event.type === "start" || event.type === "reset") {
          // start 不撤掉占位，等第一段文字到达再撤。
          choose(null);
          return;
        }
        if (event.type === "delta" && typeof event.text === "string") {
          endBusy();
          choose({ suggestion: event.text, truncated: false, round: request.round });
          return;
        }
        if (event.type !== "done" && event.type !== "error") return;
        requestRef.current = null;
        endBusy();
        if (event.type === "done" && typeof event.suggestion === "string" && event.suggestion.trim()) {
          var entry = {
            suggestion: event.suggestion, truncated: Boolean(event.truncated), round: request.round,
            candidate: typeof event.candidate === "string" ? event.candidate : null,
          };
          var hist = suggestionHistoryRef.current;
          var sameRound = hist.length && hist[hist.length - 1].round === entry.round;
          var restoredIndex = event.restored && sameRound ? hist.findIndex(function (item) {
            return item.suggestion === entry.suggestion && item.truncated === entry.truncated;
          }) : -1;
          if (restoredIndex >= 0) {
            hist[restoredIndex] = entry; // 恢复可以重签 token，但不会增加历史或切换次数。
            historyIndexRef.current = restoredIndex;
          } else if (!event.restored && request.isReroll && sameRound) {
            if (hist[hist.length - 1].suggestion === entry.suggestion) hist[hist.length - 1] = entry;
            else hist.push(entry);
            historyIndexRef.current = hist.length - 1;
            switchCountRef.current += 1;
          } else {
            suggestionHistoryRef.current = [entry];
            historyIndexRef.current = 0;
            switchCountRef.current = 0;
          }
          if (Number.isInteger(event.rerollCount) && event.rerollCount >= 0) switchCountRef.current = event.rerollCount;
          setSwitchNotice(event.detached === true ? tt(t, "dock.detached")
            : Number.isInteger(event.switchLimit) ? tt(t, "dock.switchLimit", { limit: event.switchLimit }) : "");
          choose(entry);
          // 草稿只隐藏候选，不取消请求，也不另发请求。保留原来不为隐藏结果写诊断历史的行为。
          if (!event.restored) {
            noteSuccess();
            if (!hasDraft()) recordRun(sessionId, event, null, sessionTitle);
          }
          return;
        }
        // 流式失败不能留下半句。服务器未给新候选并不是模型失败。
        choose(null);
        if (event.code === "suggestion_detached") {
          setSwitchNotice(tt(t, "dock.detached"));
          return;
        }
        var reason = event.reason || tt(t, request.isReroll ? "dock.rerollFailed" : "dock.noSuggestion");
        if (event.code === "suggestion_suppressed" || event.code === "suggestion_stale"
          || event.code === "session_not_found" || /session.*(not found|不存在)/i.test(String(reason))) return;
        if (request.manual) setManualError(reason);
        showFailure.current = true;
        noteFailure(sessionId, reason);
        recordRun(sessionId, null, reason, sessionTitle, { partialChars: event.partialChars, diagnostics: event.diagnostics });
      }

      // 手动请求可取代仍在等待/传输的自动请求；只有请求持有自己的 controller 才能改界面。
      function runRequest(isReroll, manual, immediate) {
        var current = selectedRef.current;
        if (!canSuggest() || hasDraft() || (isReroll && !current)) return false;
        var limit = switchLimitRef.current;
        if (isReroll && limit > 0 && switchCountRef.current >= limit) {
          setSwitchNotice(tt(t, "dock.switchLimit", { limit: limit }));
          return true; // The shortcut was handled without sending a request.
        }
        var body = { sessionId: sessionId, composer: manual ? "manual" : "auto" };
        if (isReroll) { body.reroll = true; body.avoid = current.suggestion.trim(); }
        cancelRequest();
        endBusy();
        armed.current = false;
        showFailure.current = false;
        setManualError("");
        setSwitchNotice("");
        choose(null);
        var request = { controller: new AbortController(), round: null, timer: null, started: false, isReroll: isReroll, manual: manual };
        requestRef.current = request;
        var send = function () {
          if (!ownsRequest(request)) return;
          if (hasDraft()) {
            // 防抖期间才开始输入：尚未发请求，等清空后再发。
            requestRef.current = null;
            armed.current = true;
            return;
          }
          request.started = true;
          beginBusy(request, Boolean(isReroll || immediate));
          var onEvent = function (event) { applySuggestionEvent(request, event); };
          apiStream("suggest", body, onEvent, request.controller.signal)
            .then(function (result) {
              // 旧 Host 的 JSON 回退以及 NDJSON 缺失终止帧也走相同守卫。
              if (result) onEvent(result.ok
                ? Object.assign({ type: "done" }, result)
                : Object.assign({ type: "error" }, result));
            })
            .catch(function (error) { onEvent({ type: "error", reason: String(error) }); });
        };
        var afterWrites = function () {
          request.timer = null;
          var previous = pendingRoundWrites.get(sessionId);
          if (previous) previous.then(send);
          else send();
        };
        if (manual) afterWrites();
        else request.timer = setTimeout(afterWrites, 350);
        return true;
      }
      function reroll() {
        if (!switchEnabled || selectedRef.current !== selected) return;
        runRequest(true, true);
      }
      function selectHistory(index) {
        var entry = suggestionHistoryRef.current[index];
        if (!entry || entry === selectedRef.current) return;
        cancelRequest();
        endBusy();
        historyIndexRef.current = index;
        choose(entry);
        setSwitchNotice("");
        if (entry.round && entry.candidate) {
          writeRound("select", {
            sessionId: sessionId, round: entry.round, candidate: entry.candidate,
            suggestion: entry.suggestion, truncated: entry.truncated,
          });
        }
      }
      function isVisible(entry) {
        return Boolean(entry && entry === selectedRef.current && entry.suggestion.trim() && canSuggest() && !hasDraft());
      }
      function dismiss(entry) {
        // Tab 插入后编辑器已经有内容，不能再次用 hasDraft 检查；候选身份仍必须一致。
        if (entry !== selectedRef.current || sessionRef.current !== sessionId) return;
        armed.current = false;
        resetSuggestion();
        if (entry.round) writeRound("dismiss", { sessionId: sessionId, round: entry.round });
      }
      function bumpEditor() { setEditorTick(function (n) { return n + 1; }); }
      function maskPaste() {
        // 粘贴/投递到草稿出现前先隐藏；上传被拒绝时不能永久锁住建议。
        if (pasteMask.current) clearTimeout(pasteMask.current);
        var timer = setTimeout(function () {
          if (pasteMask.current !== timer) return;
          pasteMask.current = null;
          bumpEditor();
        }, 1500);
        pasteMask.current = timer;
        bumpEditor();
      }

      // 用同步生命周期收尾；切换后的第一帧以及旧全局 Tab 回调都不能显示/采纳上一轮。
      useLayoutEffect(function () {
        sessionRef.current = unavailable ? null : sessionId;
        armed.current = true;
        pasteMask.current = null;
        typedSince.current = false;
        seenDomDraft.current = false;
        seenDomAttachments.current = false;
        composingRef.current = false;
        composingInComposer.current = false;
        lastReplaceAt.current = 0;
        resetSuggestion();
        return function () {
          sessionRef.current = null;
          selectedRef.current = null;
          if (pasteMask.current) clearTimeout(pasteMask.current);
          pasteMask.current = null;
          cancelRequest();
          if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
          busyTimerRef.current = null;
        };
      }, [sessionId, unavailable]);
      useEffect(function () { setLiveSessionId(sessionId); }, [sessionId]);
      useEffect(function () {
        if (!armed.current) return;
        runRequest(false, false);
      }, [sessionId, unavailable, enabled, draft, inputAttachments, editorTick, pauseNow]);

      // 首次读取启用状态；设置页保存后通过事件让当前会话立即生效。
      function applySettings(effective) {
        if (typeof effective.enabled === "boolean") {
          var on = effective.enabled;
          enabledRef.current = on;
          if (!on) { resetSuggestion(); armed.current = true; }
          setEnabled(on);
        }
        if (typeof effective.minimalDisplay === "boolean") setMinimalDisplay(effective.minimalDisplay);
        if (typeof effective.switchEnabled === "boolean") setSwitchEnabled(effective.switchEnabled);
        if (typeof effective.switchLimit === "number") {
          switchLimitRef.current = Math.min(10, Math.max(0, Math.floor(effective.switchLimit)));
        }
        if (typeof effective.historySize === "number") {
          historyLimit = effective.historySize;
          trimHistoryToLimit(historyLimit);
        }
      }
      useEffect(function () {
        var active = true;
        var revision = settingsRevision.current;
        api("status").then(function (j) {
          if (active && revision === settingsRevision.current && j && j.effective) applySettings(j.effective);
        }).catch(function () {});
        return function () { active = false; };
      }, [sessionId]);
      useEffect(function () {
        var changed = function (event) {
          settingsRevision.current += 1;
          applySettings(event.detail || {});
        };
        var onPause = function (event) {
          var until = (event && event.detail && event.detail.until) || 0;
          pausedUntil = until > Date.now() ? until : 0;
          if (pausedUntil) resetSuggestion();
          armed.current = true;
          bumpEditor();
        };
        var onFail = function (event) { setFailure(event && event.detail ? event.detail : failState); };
        var onTheme = function () { setThemeTick(function (n) { return n + 1; }); };
        window.addEventListener("dsh-prompt-predict:settings", changed);
        window.addEventListener("dsh-prompt-predict:pause", onPause);
        window.addEventListener("dsh-prompt-predict:fail", onFail);
        window.addEventListener("dsh-prompt-predict:theme", onTheme);
        var timer = setInterval(function () { setPauseNow(Date.now()); }, 15000);
        return function () {
          clearInterval(timer);
          window.removeEventListener("dsh-prompt-predict:settings", changed);
          window.removeEventListener("dsh-prompt-predict:pause", onPause);
          window.removeEventListener("dsh-prompt-predict:fail", onFail);
          window.removeEventListener("dsh-prompt-predict:theme", onTheme);
        };
      }, []);

      // 粘贴兜底不影响默认行为；所有异步回调都随本会话编辑器的监听生命周期失效。
      useEffect(function () {
        var active = true;
        var stillHere = function () { return active && sessionRef.current === sessionId; };
        var fallbackInsert = function (text) {
          var actions = actionsRef.current;
          if (!actions) return false;
          try { return actions.insertText(text, actions.captureInsertion()); } catch { return false; }
        };
        var onPasteKey = function (event) {
          if (!stillHere() || event.isComposing || !isComposerFocused(sessionId, event)) return;
          if (!(event.ctrlKey || event.metaKey) || event.altKey || !/^[vV]$/.test(event.key)) return;
          maskPaste();
          if (!actionsRef.current) return;
          var before = editorText(sessionId);
          setTimeout(function () {
            if (!stillHere() || editorText(sessionId) !== before) return;
            try {
              if (!navigator.clipboard || !navigator.clipboard.readText) return;
              navigator.clipboard.readText().then(function (text) {
                if (!text || !stillHere() || editorText(sessionId) !== before) return;
                if (fallbackInsert(text)) return;
                setTimeout(function () {
                  if (!stillHere() || editorText(sessionId) !== before) return;
                  try {
                    if (document.execCommand) document.execCommand("insertText", false, text);
                  } catch { /* 忽略 */ }
                }, 120);
              }).catch(function () { /* Electron 读不到剪贴板时保持安静 */ });
            } catch { /* 忽略 */ }
          }, 180);
        };
        var onPaste = function (event) {
          if (!stillHere() || !isComposerFocused(sessionId, event)) return;
          var data = event.clipboardData;
          var files = data && data.files;
          var items = data && data.items;
          if ((files && files.length) || (items && Array.prototype.some.call(items, function (item) { return item && item.kind === "file"; }))) {
            maskPaste();
            return;
          }
          var text = data && typeof data.getData === "function" ? data.getData("text/plain") : "";
          if (!text) return;
          maskPaste();
          var before = editorText(sessionId);
          setTimeout(function () {
            if (stillHere() && editorText(sessionId) === before) fallbackInsert(text);
          }, 60);
        };
        var onDrop = function (event) {
          if (stillHere() && isComposerFocused(sessionId, event)) maskPaste();
        };
        var onInsert = function (event) {
          var text = event && event.detail && event.detail.text;
          if (stillHere() && typeof text === "string" && text && fallbackInsert(text)) maskPaste();
        };
        var target = typeof document.addEventListener === "function" ? document : window;
        target.addEventListener("keydown", onPasteKey, true);
        target.addEventListener("paste", onPaste, true);
        target.addEventListener("drop", onDrop, true);
        window.addEventListener("dsh-prompt-predict:insert", onInsert);
        return function () {
          active = false;
          target.removeEventListener("keydown", onPasteKey, true);
          target.removeEventListener("paste", onPaste, true);
          target.removeEventListener("drop", onDrop, true);
          window.removeEventListener("dsh-prompt-predict:insert", onInsert);
        };
      }, [sessionId, unavailable]);

      // 输入、DOM 变化、IME 只切换显示条件，不动同轮候选，也不取消已开始的请求。
      useEffect(function () {
        if (unavailable) return;
        var active = true;
        var stillHere = function () { return active && sessionRef.current === sessionId; };
        var ed = findEditor(sessionId);
        var scope = ed && (findComposerScope(sessionId) || ed);
        var trackDraft = function (event) {
          var hasText = Boolean(editorText(sessionId));
          var hasAttach = editorHasAttachments(sessionId);
          var deletion = event && (/^delete/.test(event.inputType || "") || /^(Backspace|Delete)$/.test(event.key));
          if (hasText || seenDomDraft.current || deletion) typedSince.current = false;
          else if (event && event.type === "input" && !hasAttach && !seenDomAttachments.current && !isComposingNow()) typedSince.current = true;
          if (hasText || seenDomDraft.current || hasAttach || seenDomAttachments.current) pasteMask.current = null;
          seenDomDraft.current = hasText;
          seenDomAttachments.current = hasAttach;
        };
        trackDraft();
        var isAttachmentNode = function (node) {
          if (!node || node.nodeType !== 1) return false;
          var selector = 'img, picture, video, canvas, [data-attachment], [data-file], [data-image], [data-lexical-decorator]';
          try {
            return (typeof node.matches === "function" && node.matches(selector))
              || (typeof node.querySelector === "function" && node.querySelector(selector + ', [contenteditable="false"]'));
          } catch { return false; }
        };
        var observer;
        if (scope && typeof MutationObserver !== "undefined") {
          observer = new MutationObserver(function (mutations) {
            if (!stillHere()) return;
            var added = mutations.some(function (m) { return Array.from(m.addedNodes || []).some(isAttachmentNode); });
            var removedAttach = mutations.some(function (m) { return Array.from(m.removedNodes || []).some(isAttachmentNode); });
            if (removedAttach && !editorHasAttachments(sessionId)) pasteMask.current = null;
            trackDraft();
            if (added && !seenDomAttachments.current) maskPaste();
            else bumpEditor();
          });
          observer.observe(scope, { childList: true, subtree: true, characterData: true });
          var outer = scope.parentElement;
          if (outer && outer !== document.body) observer.observe(outer, { childList: true, subtree: true, characterData: true });
        }
        var onInput = function (event) {
          if (!stillHere()) return;
          if (event.type === "keyup" && !/^(Backspace|Delete|Enter)$/.test(event.key)) return;
          trackDraft(event);
          bumpEditor();
        };
        var onStart = function () {
          if (!stillHere() || isComposingNow()) return;
          // 合成期焦点可能暂时落在 Lexical 的隐藏节点上；先遮住，再判断结束时的内容。
          composingRef.current = true;
          composingAt.current = Date.now();
          composingInComposer.current = isComposerFocused(sessionId);
          bumpEditor();
        };
        var onEnd = function (event) {
          if (!stillHere() || !composingRef.current) return;
          composingRef.current = false;
          if (composingInComposer.current || isComposerFocused(sessionId, event)) {
            trackDraft();
            // DOM 可能读不到已经提交的合成正文；取消时没有 data，允许原建议回来。
            if (event.data && !seenDomDraft.current) typedSince.current = true;
          }
          bumpEditor();
        };
        window.addEventListener("compositionstart", onStart, true);
        window.addEventListener("compositionend", onEnd, true);
        if (ed && typeof ed.addEventListener === "function") {
          ed.addEventListener("input", onInput, true);
          ed.addEventListener("keyup", onInput, true);
          ed.addEventListener("compositionstart", onStart, true);
          ed.addEventListener("compositionend", onEnd, true);
        }
        return function () {
          active = false;
          if (observer) observer.disconnect();
          window.removeEventListener("compositionstart", onStart, true);
          window.removeEventListener("compositionend", onEnd, true);
          if (ed && typeof ed.removeEventListener === "function") {
            ed.removeEventListener("input", onInput, true);
            ed.removeEventListener("keyup", onInput, true);
            ed.removeEventListener("compositionstart", onStart, true);
            ed.removeEventListener("compositionend", onEnd, true);
          }
        };
      }, [sessionId, unavailable]);

      var accept = useCallback(function () {
        if (!isVisible(selected)) return false;
        var text = selected.suggestion.trim();
        try {
          var editor = findEditor(sessionId);
          var focused = document.activeElement;
          if (isOtherSession(sessionId, focused) || isOtherSession(sessionId, editor)) return false;
          // 切换后 findEditor 可能短暂指向旧节点；未标记为其它会话的焦点 contenteditable 优先。
          if (focused && focused.isContentEditable
            && (!editor || (editor !== focused && editor.contains && !editor.contains(focused)))) editor = focused;
          if (editor && !(editor === focused || (editor.contains && editor.contains(focused)))) {
            try { editor.focus(); } catch { /* 聚焦失败仍尝试插入 */ }
          }
          var inserted = inputActions && inputActions.insertText(text, inputActions.captureInsertion());
          if (!inserted && editor) {
            try { editor.focus(); } catch { /* 忽略 */ }
            try { inserted = document.execCommand("insertText", false, text); } catch { inserted = false; }
          }
          if (!inserted) return false;
          var last = readStoredHistory().find(function (item) { return item.sessionId === sessionId; });
          // 恢复缓存不新增记录，也不要把别轮的历史（或设置试跑）误标为已采纳。
          if (last && suggestionHistoryRef.current.some(function (entry) { return entry.suggestion.trim() === last.suggestion; })) {
            patchLastRun(sessionId, { suggestion: text, truncated: selected.truncated, accepted: true });
          }
          dismiss(selected);
          return true;
        } catch { return false; }
      }, [selected, inputActions, sessionId, unavailable]);

      // 全局 Tab 和按钮使用同一条采纳路径；注册对象不持有其他会话的候选。
      useLayoutEffect(function () {
        if (!visibleSuggestion) return;
        var controller = {
          canAccept: function (event) { return isVisible(selected) && canAcceptTabEverywhere(sessionId, event); },
          accept: accept,
        };
        window.__dshPromptPredictTabAccept = controller;
        return function () {
          if (window.__dshPromptPredictTabAccept === controller) window.__dshPromptPredictTabAccept = null;
        };
      }, [visibleSuggestion, accept, sessionId]);

      // 流式半句的上一条是刚才最后选中的完整候选，而不是再往前一条。
      var prevIndex = historyIndexRef.current - (requestRef.current ? 0 : 1);
      keyHandlers.current = {
        down: function (event) {
          if (!event || !/^(ArrowDown|Down)$/.test(event.key) || event.isComposing) return;
          if (event.code && event.code !== "ArrowDown" && event.code !== "Down") return;
          if (!canSuggest() || hasDraft() || !isComposerFocused(sessionId, event)) return;
          if (event.type === "keyup" && Date.now() - lastReplaceAt.current < 400) return;
          if (isVisible(selected)) {
            if (!switchEnabled) return;
            if (historyIndexRef.current < suggestionHistoryRef.current.length - 1) selectHistory(historyIndexRef.current + 1);
            else reroll();
          } else if (requestRef.current && requestRef.current.started) {
            setBusyState(function (prev) { return prev ? { visible: true } : prev; });
          } else if (!switchEnabled || !runRequest(false, true, true)) return;
          lastReplaceAt.current = Date.now();
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        },
        other: function (event) {
          if (event.isComposing || !canSuggest() || isComposingNow() || !isComposerFocused(sessionId, event)) return;
          var visible = isVisible(selected);
          if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && (event.key === " " || event.code === "Space")) {
            if (runRequest(visible, true)) { event.preventDefault(); event.stopPropagation(); }
          } else if (visible && event.key === "ArrowUp" && switchEnabled && suggestionHistoryRef.current[prevIndex]) {
            selectHistory(prevIndex);
            event.preventDefault();
            event.stopPropagation();
          } else if (visible && event.key === "Escape") {
            event.preventDefault();
            dismiss(selected);
          } else if (typeof event.key === "string" && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            // rc.2 的编辑器有时读不到文字；即使在请求没完成时，也先记录用户开始输入。
            typedSince.current = true;
            bumpEditor();
          }
        },
      };
      useEffect(function () {
        if (unavailable) return;
        var onForward = function (event) { keyHandlers.current.down(event && event.detail && event.detail.native); };
        var onEditorKey = function (event) { keyHandlers.current.down(event); };
        var onKey = function (event) { keyHandlers.current.other(event); };
        var ed = findEditor(sessionId);
        window.addEventListener("dsh-prompt-predict:down", onForward);
        window.addEventListener("keydown", onKey, true);
        if (ed && typeof ed.addEventListener === "function") {
          ed.addEventListener("keydown", onEditorKey, true);
          ed.addEventListener("keyup", onEditorKey, true);
        }
        return function () {
          window.removeEventListener("dsh-prompt-predict:down", onForward);
          window.removeEventListener("keydown", onKey, true);
          if (ed && typeof ed.removeEventListener === "function") {
            ed.removeEventListener("keydown", onEditorKey, true);
            ed.removeEventListener("keyup", onEditorKey, true);
          }
        };
      }, [sessionId, unavailable]);

      // 失败提示的「打开设置」：优先宿主导航，没有就复制路径。
      function findSettingsOpener() {
        var fns = [props.openSettings, props.openSettingsPanel, props.openOptions,
          props.host && props.host.openSettings, window.dsh && window.dsh.openSettings,
          window.__DSH__ && window.__DSH__.openSettings];
        for (var i = 0; i < fns.length; i += 1) if (typeof fns[i] === "function") return fns[i];
        return null;
      }
      function openSettingsFromHint() {
        var opener = findSettingsOpener();
        if (opener) {
          try { opener(); return; } catch { /* 回退到复制路径 */ }
        }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tt(t, "dock.settingsPath"));
        } catch { /* 忽略剪贴板失败 */ }
      }
      function failureHint(text) {
        return h(ComposerHint, {
          sessionId: sessionId, below: true, text: text, t: t,
          actionLabel: tt(t, findSettingsOpener() ? "dock.openSettings" : "dock.copySettingsPath"),
          onAction: openSettingsFromHint,
        });
      }
      if (!enabled || unavailable || sessionRef.current !== sessionId) return null;
      if (pausedUntil > pauseNow) {
        return h(ComposerHint, { sessionId: sessionId, below: true, text: tt(t, "dock.paused", { time: formatLeft(pausedUntil - pauseNow) }), t: t });
      }
      if (draftHidden) return null;
      if (visibleSuggestion) {
        return h(GhostOverlay, {
          suggestion: visibleSuggestion, sessionId: sessionId, truncated: selected.truncated,
          onAccept: accept, onReroll: switchEnabled ? reroll : null, switchEnabled: switchEnabled,
          minimalDisplay: minimalDisplay, canPrev: switchEnabled && Boolean(suggestionHistoryRef.current[prevIndex]),
          nextAction: !switchEnabled ? "off" : (historyIndexRef.current < suggestionHistoryRef.current.length - 1 ? "next" : "regen"),
          notice: switchNotice, t: t,
        });
      }
      if (busyState && busyState.visible) {
        return h(GhostOverlay, { suggestion: tt(t, "dock.generatingAny"), busy: true, sessionId: sessionId, t: t });
      }
      if (switchNotice) return h(ComposerHint, { sessionId: sessionId, below: true, text: switchNotice, t: t });
      if (manualError) return failureHint(tt(t, "dock.manualFailed", { reason: String(manualError).slice(0, 120) }));
      if (showFailure.current && failure && failure.streak >= 2 && failure.sessionId === sessionId) {
        return failureHint(tt(t, "dock.failureHint", { reason: String(failure.reason || "").slice(0, 80) }));
      }
      return null;
    }


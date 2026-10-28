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
      var _notice = useState(null), updateNotice = _notice[0], setUpdateNotice = _notice[1];   // 自动更新提示（版本号）
      var _me = useState(""), manualError = _me[0], setManualError = _me[1];   // 手动换一条失败的原因
      var _mk = useState("failed"), manualErrorKind = _mk[0], setManualErrorKind = _mk[1];
      var currentVersionRef = useRef(null);   // 状态接口拿到的当前版本，供恢复提示时重新比较
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
          // 自动更新检查：拿到当前版本后查一次 registry；发现新版且未忽略过 → 显示提示
          if (j && j.version) currentVersionRef.current = String(j.version);
          if (j && j.version && Date.now() - readLastUpdateCheck() > UPDATE_CHECK_INTERVAL) {
            markUpdateChecked();
            var current = String(j.version);
            fetchLatestVersion().then(function (latest) {
              if (latest && versionNewer(latest, current) && readDismissedUpdate() !== latest) {
                setUpdateNotice(latest);
              }
            }).catch(function () { /* 网络问题静默，不打扰用户 */ });
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

      // 设置页「恢复提示」→ 立刻重新查 registry，满足条件就把提示弹回来
      useEffect(function () {
        var onReset = function () {
          fetchLatestVersion().then(function (latest) {
            if (latest && versionNewer(latest, currentVersionRef.current || "0")) {
              setUpdateNotice(latest);
            }
          }).catch(function () { /* 网络问题静默 */ });
        };
        window.addEventListener("dsh-prompt-predict:update-dismiss-reset", onReset);
        return function () { window.removeEventListener("dsh-prompt-predict:update-dismiss-reset", onReset); };
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
      if (!updateNotice) return dockBody;
      // 自动更新提示：一行版本 + 已按环境填好的命令，可忽略（按版本记本机，不重复烦人）
      return h("div", null,
        h("div", {
          "data-prompt-predict-update-notice": "true",
          style: { fontSize: 12, lineHeight: 1.7, marginBottom: 2, color: colors().muted },
        },
          h("span", null, tt(t, "settings.updateFound", { version: updateNotice })),
          h("button", {
            type: "button", "data-prompt-predict-update-dismiss": "true",
            style: { background: "none", border: 0, color: colors().muted, fontSize: 12, cursor: "pointer", padding: "0 4px", textDecoration: "underline" },
            onClick: function () { setDismissedUpdate(updateNotice); setUpdateNotice(null); },
          }, tt(t, "ghost.dismiss")),
          h("span", { style: { display: "block", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } },
            "dsh plugin --profile " + currentProfileName() + " add dsh-prompt-predict@" + updateNotice)),
        dockBody);
    }


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
    // 自动更新提示的「忽略」状态：按版本号记在本机，同一版本只提醒一次。
    var UPDATE_DISMISS_KEY = "dsh-prompt-predict.updateDismissed";
    function readDismissedUpdate() {
      try { return window.localStorage?.getItem(UPDATE_DISMISS_KEY) || ""; } catch { return ""; }
    }
    function setDismissedUpdate(version) {
      try { window.localStorage?.setItem(UPDATE_DISMISS_KEY, String(version)); } catch { /* 忽略失败就算了 */ }
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


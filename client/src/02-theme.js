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


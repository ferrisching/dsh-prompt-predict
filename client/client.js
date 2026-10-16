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
    var inject = ["slots"];

    var EFFORT_LABELS = {
      off: "关闭", none: "关闭", minimal: "最小", low: "低", medium: "中", high: "高", max: "最大",
    };

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
      var opts = body === undefined ? {} : {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      };
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

    // 行内 ghost text 覆盖层：不写进 Lexical，只有 Tab/点击采纳时才 insertText。
    function GhostOverlay(props) {
      var suggestion = props.suggestion;
      var sessionId = props.sessionId;
      var onAccept = props.onAccept;
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
          title: "Tab 采纳 · Esc 忽略",
          style: {
            pointerEvents: "auto", flex: "none", padding: "0 7px", height: 19, borderRadius: 5,
            border: "1px solid var(--dsw-alias-border-l1, #d1d5db)", background: "var(--dsw-alias-bg-secondary, #f8fafc)",
            color: "#9aa3b2", fontSize: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", cursor: "pointer",
          },
        }, "Tab"),
        h("span", { style: { color: "#b0b7c3", fontSize: 10, whiteSpace: "nowrap" } }, "Esc 忽略"));
    }

    // ================= 建议（composer dock 仅提供生命周期；显示覆盖到输入框内） =================
    function PredictionDock(props) {
      var sessionId = props.sessionId;
      var useSession = props.useSession;
      var useInput = props.useInput;
      var inputActions = props.inputActions;
      var running = useSession(function (value) { return Boolean(value && value.running); });
      var blank = useSession(function (value) { return Boolean(value && value.blank); });
      var removed = useSession(function (value) { return Boolean(value && value.removed); });
      var draft = useInput(function (value) { return String(value && value.draft || ""); });
      var _s = useState(""), suggestion = _s[0], setSuggestion = _s[1];
      var _en = useState(true), enabled = _en[0], setEnabled = _en[1];
      var armed = useRef(true);
      var abortRef = useRef(null);
      var sessionRef = useRef(sessionId);
      var dismissedByDraft = useRef(false);
      if (draft.trim() !== "") dismissedByDraft.current = true;
      var visibleSuggestion = dismissedByDraft.current ? "" : suggestion;

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
        armed.current = true;
        dismissedByDraft.current = false;
        setSuggestion("");
        if (abortRef.current) abortRef.current.abort();
      }, [sessionId]);

      useEffect(function () {
        if (!enabled) return;
        if (running) {
          armed.current = true;
          dismissedByDraft.current = false;
          setSuggestion("");
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
              if (result && result.ok && typeof result.suggestion === "string") setSuggestion(result.suggestion.trim());
            })
            .catch(function () { /* 预测失败静默，不打断正常输入 */ });
        }, 350);
        return function () {
          clearTimeout(timer);
          controller.abort();
          if (abortRef.current === controller) abortRef.current = null;
        };
      }, [sessionId, running, blank, removed, draft, enabled]);

      var accept = useCallback(function () {
        if (!visibleSuggestion || !inputActions || draft.trim() !== "") return false;
        try {
          var span = inputActions.captureInsertion();
          if (!inputActions.insertText(visibleSuggestion, span)) return false;
          setSuggestion("");
          return true;
        } catch { return false; }
      }, [visibleSuggestion, inputActions, draft]);

      useEffect(function () {
        if (!visibleSuggestion) return;
        var onKey = function (event) {
          if (event.isComposing) return;
          if (event.key === "Escape") { event.preventDefault(); setSuggestion(""); return; }
          if (event.key !== "Tab" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
          if (!accept()) return;
          event.preventDefault();
          event.stopPropagation();
        };
        window.addEventListener("keydown", onKey, true);
        return function () { window.removeEventListener("keydown", onKey, true); };
      }, [visibleSuggestion, accept]);

      // 建议直接以灰色 ghost text 覆盖在 Lexical 输入框首字符处。
      if (!enabled || draft.trim() !== "" || !visibleSuggestion) return null;
      return h(GhostOverlay, { suggestion: visibleSuggestion, sessionId: sessionId, onAccept: accept });
    }

    // ================= 设置页 =================
    function SettingsSection() {
      var _st = useState(null), st = _st[0], setSt = _st[1];
      var _cat = useState(null), cat = _cat[0], setCat = _cat[1];
      var _pv = useState(""), provider = _pv[0], setProvider = _pv[1];
      var _md = useState(""), model = _md[0], setModel = _md[1];
      var _to = useState(12), timeoutSec = _to[0], setTimeoutSec = _to[1];
      var _ctx = useState(8), ctxSize = _ctx[0], setCtxSize = _ctx[1];
      var _ef = useState("off"), effort = _ef[0], setEffort = _ef[1];
      var _eo = useState([]), effortOptions = _eo[0], setEffortOptions = _eo[1];
      var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
      var _msg = useState(null), msg = _msg[0], setMsg = _msg[1];
      var _adv = useState(false), adv = _adv[0], setAdv = _adv[1];
      var _dirty = useState(false), dirty = _dirty[0], setDirty = _dirty[1];

      function loadAll() {
        api("status").then(function (j) {
          if (!j || !j.ok) return;
          setSt(j);
          var eff = j.effective || {};
          setProvider(eff.provider || "");
          setModel(eff.model || "");
          setTimeoutSec(Math.round((eff.timeoutMs || 12000) / 1000));
          setCtxSize(eff.maxMessages || 8);
          setEffort(eff.reasoningEffort || "off");
          setDirty(false);
        }).catch(function () { });
        api("catalog").then(function (j) { if (j && j.ok) setCat(j.groups || []); }).catch(function () { });
      }
      useEffect(function () { loadAll(); }, []);

      // 思考档位跟随所选模型动态生成（模型不支持的档位不出现，避免保存被拒）；
      // 选「跟随当前会话模型」时，按当前会话实际使用的模型取档位。
      useEffect(function () {
        var p = provider, m = model;
        if (p === "auto" || m === "auto") {
          var cur = (st && st.current) || {};
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
          reasoningEffort: effort,
        }).then(function (j) {
          if (j && j.ok) { notifySettings(j.effective); setMsg({ ok: true, text: "已保存，立即生效" }); setDirty(false); loadAll(); }
          else setMsg({ ok: false, text: (j && j.reason) || "保存失败" });
        }).catch(function (e) { setMsg({ ok: false, text: String(e) }); })
          .finally(function () { setBusy(false); });
      }
      function toggleEnabled(on) {
        setBusy(true); setMsg(null);
        api("settings", { enabled: on }).then(function (j) {
          if (j && j.ok) { notifySettings(j.effective); setSt(Object.assign({}, st, { effective: j.effective })); loadAll(); setMsg({ ok: true, text: on ? "已开启联想" : "已关闭联想" }); }
          else setMsg({ ok: false, text: (j && j.reason) || "操作失败" });
        }).catch(function (e) { setMsg({ ok: false, text: String(e) }); })
          .finally(function () { setBusy(false); });
      }
      function resetDefaults() {
        setBusy(true); setMsg(null);
        api("settings", { reset: true }).then(function (j) {
          if (j && j.ok) { notifySettings(j.effective); setMsg({ ok: true, text: "已恢复默认" }); loadAll(); }
        }).finally(function () { setBusy(false); });
      }

      if (!st) return h("div", { style: SS.card }, h("p", { style: SS.muted }, "加载中…"));
      var eff = st.effective || {};
      var enabled = eff.enabled !== false;

      return h("div", { style: SS.card },
        h("p", { style: SS.title }, "提示词联想"),
        h("p", { style: SS.muted }, "助手回复结束后，在输入框里直接给出灰色建议（Tab 采纳、Esc 忽略、开始输入自动消失）。"),

        h("div", { style: SS.row },
          h("span", { style: SS.label }, "启用联想"),
          h("button", { type: "button", style: SS.toggleTrack(enabled), onClick: function () { toggleEnabled(!enabled); }, disabled: busy, "aria-pressed": enabled },
            h("span", { style: SS.toggleThumb(enabled) })),
          h("span", { style: SS.muted }, enabled ? "已开启" : "已关闭")),

        h("div", { style: SS.divider }),

        h("div", { style: SS.row },
          h("span", { style: SS.label }, "提供商"),
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
            h("option", { value: "auto" }, "跟随当前会话模型"),
            providerGroups().map(function (g) {
              return h("option", { key: g.id, value: g.id }, g.name + "（" + g.id + "）");
            }))),
        h("div", { style: SS.row },
          h("span", { style: SS.label }, "模型"),
          h("select", {
            style: SS.select, value: model, disabled: !enabled || busy || provider === "auto",
            onChange: function (e) { setModel(e.target.value); setEffort("auto"); setDirty(true); },
          },
            provider === "auto"
              ? h("option", { value: "auto" }, "跟随当前会话模型")
              : modelsOf(provider).map(function (m) {
                  return h("option", { key: m.id, value: m.id }, m.name + "（" + m.id + "）");
                }))),
        h("p", { style: SS.muted }, "默认跟随当前会话模型；也可固定到某个模型——选快模型更省额度。"),

        h("p", null, h("button", { style: SS.advBtn, onClick: function () { setAdv(!adv); } }, (adv ? "▾" : "▸") + " 高级")),
        adv ? h("div", null,
          h("div", { style: SS.row },
            h("span", { style: SS.label }, "响应超时"),
            h("input", { style: SS.input, type: "number", min: 1, max: 60, value: timeoutSec, disabled: !enabled || busy, onChange: function (e) { setTimeoutSec(Number(e.target.value)); setDirty(true); } }),
            h("span", { style: SS.muted }, "秒（1–60）")),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, "上下文规模"),
            h("select", { style: SS.select, value: ctxSize, disabled: !enabled || busy, onChange: function (e) { setCtxSize(Number(e.target.value)); setDirty(true); } },
              h("option", { value: 3 }, "少：最近 3 条消息"),
              h("option", { value: 8 }, "标准：最近 8 条（默认）"),
              h("option", { value: 12 }, "多：最近 12 条")),
            h("span", { style: SS.muted }, "越多越准但越慢")),
          h("div", { style: SS.row },
            h("span", { style: SS.label }, "思考深度"),
            h("select", { style: SS.select, value: effort, disabled: !enabled || busy, onChange: function (e) { setEffort(e.target.value); setDirty(true); } },
              h("option", { value: "auto" }, effortOptions.length === 0 ? "跟随模型默认（该模型未公布可调档位）" : "跟随模型默认"),
              (function () {
                var ids = effortOptions.slice();
                if (effort && effort !== "auto" && ids.indexOf(effort) === -1) ids.push(effort); // 保留当前已保存值，避免下拉显示错位
                return ids.map(function (id) {
                  return h("option", { key: id, value: id }, (EFFORT_LABELS[id] || id) + (id === "off" ? "（最快最省）" : ""));
                });
              })()),
            h("span", { style: SS.muted }, "联想宜浅；过深会把 token 烧在推理上")) ) : null,

        h("div", { style: { display: "flex", gap: 10, marginTop: 16 } },
          h("button", { style: dim(SS.btnPrimary, busy || !dirty), onClick: save, disabled: busy || !dirty }, busy ? "保存中…" : "保存"),
          h("button", { style: dim(SS.btnGhost, busy), onClick: resetDefaults, disabled: busy }, "恢复默认")),
        msg ? h("p", { style: msg.ok ? SS.ok : SS.err }, msg.text) : null);
    }

    function apply(ctx) {
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
          label: function () { return "提示词联想"; },
          inject: function () { return {}; },
        }, SettingsSection);
      });
    }

    module.exports = { name: name, inject: inject, apply: apply };
    return module.exports;
  },
});

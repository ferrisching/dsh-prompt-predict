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
      var _pause = useState(pausedUntil), pauseState = _pause[0], setPauseState = _pause[1];
      var _theme2 = useState(0), themeTick2 = _theme2[0], setThemeTick2 = _theme2[1];
      var _ver = useState(null), pluginVersion = _ver[0], setPluginVersion = _ver[1];
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
          setHistorySize(eff.historySize || 10);
          setSuggestionLanguage(normalizeSavedLanguage(eff.suggestionLanguage || "auto"));
          if (Array.isArray(j.languages) && j.languages.length) setLanguageCodes(j.languages);
          historyLimit = eff.historySize || 10;
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
              setMsg({ ok: false, text: (j && j.reason) || tt(t, "dock.noSuggestion") });
            }
          })
          .catch(function (e) { setMsg({ ok: false, text: String(e) }); })
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
            : null),
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
            }))),
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
            h("input", { style: SS.input, type: "number", min: 1, max: 50, step: 1, value: historySize, "aria-label": tt(t, "settings.historySize"), disabled: !enabled || busy, onChange: function (e) { setHistorySize(Number(e.target.value)); setDirty(true); } }),
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
                      item.suggestion
                        ? h("button", {
                          type: "button", style: SS.copyBtn, "data-prompt-predict-history-copy": "true",
                          onClick: function (event) { if (event) event.stopPropagation(); copySuggestion(key, item.suggestion); },
                          onKeyDown: function (event) { if (event) event.stopPropagation(); },
                        }, copiedKey === key ? tt(t, "settings.historyCopied") : tt(t, "settings.historyCopy"))
                        : null)
                    : null);
              });
            })()),

        h("div", { style: { display: "flex", gap: 10, marginTop: 16 } },
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


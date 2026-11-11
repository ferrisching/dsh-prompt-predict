    function apply(ctx) {
      // 注册词典并绑定翻译函数：DSH 的 locale 服务会把语言切换即时应用到已挂载的界面；
      // 没有该服务（旧运行时）时保持中文兜底，不会退化成显示 key。
      watchTheme();
      // 主题/CSS 缩放可能给 ghost 写入 nowrap 或撑出视口；用最高优先级样式兜底。
      try {
        if (document.head && typeof document.createElement === "function"
          && !document.getElementById("dsh-prompt-predict-style")) {
          var style = document.createElement("style");
          style.id = "dsh-prompt-predict-style";
          style.textContent = [
            '[data-prompt-predict-ghost]{white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;box-sizing:border-box!important;max-width:calc(100vw - 16px)!important;}',
            '[data-prompt-predict-ghost] [data-prompt-predict-text]{white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;}',
          ].join("\n");
          document.head.appendChild(style);
        }
      } catch { /* 无 DOM 环境 */ }
      try {
        if (ctx.locale && typeof ctx.locale.register === "function") {
          // 注册全部语言的词典（漏注册会让该语言的界面整屏退回中文）
          var dicts = {};
          Object.keys(DICT).forEach(function (lang) { dicts[lang] = DICT[lang]; });
          ctx.locale.register(NS, dicts);
          boundTranslate = ctx.locale.bind(NS);
          localeService = ctx.locale;      // currentLang() 要读它的快照
        }
      } catch { /* 保持中文 */ }
      try {
        var navigation = typeof ctx.get === "function" ? ctx.get("pluginNavigation") : null;
        if (navigation && typeof navigation.openBundle === "function") {
          pluginPageOpener = function () { navigation.openBundle("dsh-prompt-predict"); };
        }
      } catch { /* 旧运行时没有插件页导航 */ }
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

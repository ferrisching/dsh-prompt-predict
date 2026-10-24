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

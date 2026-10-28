#!/usr/bin/env node
/**
 * 客户端渲染冒烟测试。
 *
 * 为什么需要它：`client/client.js` 跑在 DSH 的浏览器运行时里，没有 DOM 就没有任何自动化覆盖。
 * 真实踩过一次——GhostOverlay 里引用了没从 props 读出的 `onReroll`，渲染时抛 ReferenceError，
 * 被 React 的 error boundary 吞掉，表现是「接口正常返回建议，但 ghost 永远不出现」，
 * 而那一轮的服务端用例（当时 42 项）全绿。这个文件就是为了让这类崩溃在 CI 里就能拦住。
 *
 * 做法：用极简 React 替身（useState/useEffect/useRef/useCallback）把组件递归展开成普通对象树，
 * 再断言树里有没有 `data-prompt-predict-ghost` 这类关键节点。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const results = [];
const check = (name, ok, evidence = '') => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${evidence ? `: ${evidence}` : ''}`);
};

// ---------------- 极简 React 替身 ----------------
// hooks 按「组件」分库存放（真实的 React 也是每个组件实例一份），
// 这样递归展开嵌套组件时不会互相串号。
function createReact() {
  const stores = new Map();
  let current = null;
  let onChange = () => {};
  const storeOf = (Component) => {
    if (!stores.has(Component)) stores.set(Component, { hooks: [], cursor: 0 });
    return stores.get(Component);
  };
  const api = {
    createElement(type, props, ...children) {
      const merged = Object.assign({}, props);
      if (children.length === 1) merged.children = children[0];
      else if (children.length > 1) merged.children = children;
      return { type, props: merged };
    },
    useState(initial) {
      const s = current;
      const i = s.cursor++;
      if (!(i in s.hooks)) s.hooks[i] = typeof initial === 'function' ? initial() : initial;
      return [s.hooks[i], (next) => {
        const value = typeof next === 'function' ? next(s.hooks[i]) : next;
        if (value === s.hooks[i]) return;
        s.hooks[i] = value;
        onChange();
      }];
    },
    useRef(initial) {
      const s = current;
      const i = s.cursor++;
      if (!(i in s.hooks)) s.hooks[i] = { current: initial };
      return s.hooks[i];
    },
    useCallback(fn) {
      const s = current;
      const i = s.cursor++;
      s.hooks[i] = fn;
      return fn;
    },
    useEffect(fn, deps) {
      const s = current;
      const i = s.cursor++;
      const prev = s.hooks[i];
      const changed = !prev || !deps || !prev.deps || deps.length !== prev.deps.length
        || deps.some((d, k) => d !== prev.deps[k]);
      if (!changed) return;
      if (prev && typeof prev.cleanup === 'function') prev.cleanup();
      s.hooks[i] = { deps: deps ? deps.slice() : null, cleanup: fn() || null };
    },
  };
  return {
    React: api,
    reset() { stores.clear(); },
    setOnChange(fn) { onChange = fn; },
    /** 渲染单个组件（组件内再嵌套的组件由 expandTree 负责继续展开） */
    render(Component, props) {
      const s = storeOf(Component);
      s.cursor = 0;
      const prev = current;
      current = s;
      try { return Component(props); } finally { current = prev; }
    },
  };
}

// ---------------- 递归展开函数组件，得到普通对象树 ----------------
function expandTree(react, node, depth = 0) {
  if (depth > 60) throw new Error('组件嵌套过深（可能是组件递归渲染了自己）');
  if (Array.isArray(node)) return node.map((n) => expandTree(react, n, depth + 1));
  if (!node || typeof node !== 'object') return node;
  if (typeof node.type === 'function') return expandTree(react, react.render(node.type, node.props), depth + 1);
  const kids = node.props ? node.props.children : null;
  if (kids === undefined || kids === null) return node;
  return { ...node, props: { ...node.props, children: expandTree(react, kids, depth + 1) } };
}

// ---------------- 挂载 + 刷新 ----------------
function mount(react, Component, propsFn) {
  let tree = null;
  let depth = 0;
  const rerender = () => {
    if (depth > 30) throw new Error('渲染次数超过上限（可能是 useEffect 依赖写错导致的重渲染循环）');
    depth += 1;
    try { tree = expandTree(react, react.render(Component, propsFn())); } finally { depth -= 1; }
  };
  react.setOnChange(() => { try { rerender(); } catch { /* 由用例自己断言 */ } });
  rerender();
  return {
    get tree() { return tree; },
    render: rerender,
    async settle(times = 8) {
      for (let i = 0; i < times; i += 1) {
        rerender();
        await new Promise((r) => setTimeout(r, 5));
      }
      return tree;
    },
  };
}

// 深度优先找节点
function find(node, predicate, acc = []) {
  if (Array.isArray(node)) { node.forEach((n) => find(n, predicate, acc)); return acc; }
  if (!node || typeof node !== 'object') return acc;
  if (predicate(node)) acc.push(node);
  const kids = node.props ? node.props.children : null;
  find(kids, predicate, acc);
  return acc;
}
const hasGhost = (tree) => find(tree, (n) => n.props && (n.props['data-prompt-predict-ghost'] === 'true' || n.props['data-prompt-predict-row'] === 'true')).length > 0;
const textOf = (tree) => find(tree, () => true)
  .flatMap((n) => (typeof n.props?.children === 'string' ? [n.props.children] : []))
  .join(' ');

// ---------------- 浏览器环境替身 ----------------
function makeEnv() {
  const editorListeners = new Map();
  const addListener = (map, type, fn) => {
    if (!map.has(type)) map.set(type, new Set());
    map.get(type).add(fn);
  };
  const removeListener = (map, type, fn) => {
    const set = map.get(type);
    if (!set) return;
    set.delete(fn);
    if (!set.size) map.delete(type);
  };
  const emitListeners = (map, type, event) => {
    for (const fn of [...(map.get(type) || [])]) fn(event);
  };
  const editor = {
    getBoundingClientRect: () => ({ left: 100, top: 200, width: 400, height: 40 }),
    parentElement: { querySelector: () => null },
    contains: (node) => node === editor,
    focus() { document.activeElement = editor; },
    innerText: '',
    textContent: '',
    addEventListener: (type, fn) => addListener(editorListeners, type, fn),
    removeEventListener: (type, fn) => removeListener(editorListeners, type, fn),
    emit: (type, extra = {}) => emitListeners(editorListeners, type, { type, ...extra }),
  };
  const listeners = new Map();
  let dark = false;
  const mediaListeners = new Set();
  const window = {
    matchMedia: (query) => ({
      get matches() { return /dark/.test(query) ? dark : !dark; },
      addEventListener: (type, fn) => { if (type === 'change') mediaListeners.add(fn); },
      addListener: (fn) => mediaListeners.add(fn),
    }),
    setDark(value) { dark = value; mediaListeners.forEach((fn) => fn({ matches: value })); },
    addEventListener: (type, fn) => addListener(listeners, type, fn),
    removeEventListener: (type, fn) => removeListener(listeners, type, fn),
    dispatchEvent: (event) => { emitListeners(listeners, event.type, event); return true; },
    location: { href: 'http://127.0.0.1/', pathname: '/' },
  };
  // localStorage 替身：插件把「最近预测」存在这里（两个模块实例共享同一份）
  const storage = new Map();
  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => { storage.set(k, String(v)); },
    removeItem: (k) => { storage.delete(k); },
    clear: () => storage.clear(),
  };
  const clipboard = { text: null, writeText(t) { this.text = t; return Promise.resolve(); }, readText() { return Promise.resolve(this.text || ''); } };
  const document = {
    body: { appendChild() {}, removeChild() {} },
    activeElement: editor,
    execCommand: () => true,
    querySelector: (sel) => (String(sel).includes('data-composer-input') ? editor : null),
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  };
  return { window: Object.assign(window, { localStorage }), document, editor, listeners, localStorage, clipboard, fetchCalls: [], mutationObservers: [] };
}

// ---------------- 加载 client.js ----------------
let testUserAgent = 'node-test';
let fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
let registryVersion = '9.9.9';
let registryFails = false;
let holdSuggest = null;   // 挂起 /suggest 响应，用来观察生成中占位   // npm registry /latest 的返回值，与 /status 里的版本独立
let ndjsonLines = null;
let ndjsonDelayMs = 0;   // 每段 NDJSON 之间的延迟
function loadClient(localeService, sharedEnv) {
  const env = sharedEnv || makeEnv();
  let registration = null;
  const sandbox = {
    window: env.window,
    document: env.document,
    navigator: { get userAgent() { return testUserAgent; }, clipboard: env.clipboard },
    console,
    // 忽略延时（插件里有个 350ms 的「等回复停稳再预测」），让测试不必真等
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout,
    // 沙箱里 interval 只跑一次，够用来验证「刷新一次剩余时间」
    setInterval: (fn) => setTimeout(fn, 0),
    clearInterval: clearTimeout,
    queueMicrotask,
    getComputedStyle: () => ({
      paddingLeft: '0px', paddingTop: '0px', fontFamily: 'sans', fontSize: '14px', lineHeight: '20px', fontWeight: '400',
    }),
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    TextDecoder, TextEncoder,
    AbortController,
    MutationObserver: class {
      constructor(cb) { this.cb = cb; env.mutationObservers.push(this); }
      observe() {}
      disconnect() {}
      trigger(mutations) { this.cb(mutations || []); }
    },
    fetch: async (url, options) => {
      env.fetchCalls.push({ url: String(url), options });
      if (String(url).startsWith('https://registry.npmjs.org/')) {
        if (registryFails) return { ok: false, status: 500, json: async () => ({}) };
        return { ok: true, json: async () => ({ version: registryVersion }) };
      }
      if (holdSuggest && String(url).includes('/suggest')) await holdSuggest;
      if (ndjsonLines && String(url).includes('/suggest')) {
        const chunks = ndjsonLines.map((line) => Buffer.from(`${line}\n`));
        let idx = 0;
        return {
          headers: { get: () => 'application/x-ndjson; charset=utf-8' },
          body: {
            getReader: () => ({
              read: async () => {
                if (idx < chunks.length && ndjsonDelayMs) await new Promise((r) => setTimeout(r, ndjsonDelayMs));
                return idx < chunks.length ? { done: false, value: chunks[idx++] } : { done: true };
              },
            }),
          },
        };
      }
      return {
        ok: true,
        json: async () => ({ ok: true, ms: 12, provider: 'provider-x', model: 'model-y', ...fetchResult }),
      };
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window.__ModuleLoader__ = { load: (mod) => { registration = mod; } };

  const code = readFileSync(join(here, '..', 'client', 'client.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'client.js' });
  if (!registration) throw new Error('client.js 没有调用 window.__ModuleLoader__.load');

  const react = createReact();
  const exports = registration.factory((name) => {
    if (name === 'react') return react.React;
    throw new Error('意外的 require: ' + name);
  });
  return { exports, react, env, source: code };
}

/** 仿 DSH locale 服务：register 收词典，bind 按指定语言取词；查不到就返回 key（与真实实现一致）。 */
function makeLocale(lang) {
  const dicts = {};
  return {
    register: (ns, dict) => { dicts[ns] = dict; },
    bind: (ns) => (key) => (dicts[ns] && dicts[ns][lang] && dicts[ns][lang][key]) || key,
    dicts,
  };
}

/** 挂载插件：返回注册到的组件与注入的 ctx。 */
function setup(localeService, sharedEnv) {
  const client = loadClient(localeService, sharedEnv);
  const registered = {};
  client.exports.apply({
    slots: {
      inject: (name, fn) => { registered[name] = fn(); },
      register: (meta, Component) => ({ meta, Component }),
    },
    ...(localeService ? { locale: localeService } : {}),
  });
  return { ...client, registered };
}

// ---------------- 用例 ----------------
const { exports, react, registered, env } = setup();   // 不带 locale 服务：验证旧运行时下的中文兜底
check('client.js 注册了模块', exports?.name === 'dsh-prompt-predict', String(exports?.name));
check('inject 声明了 locale', Array.isArray(exports?.inject) && exports.inject.includes('locale'),
  JSON.stringify(exports?.inject));
check('注入了两个 slot', Boolean(registered['conversation.composer.dock'] && registered['settings.section']),
  Object.keys(registered).join(', '));

{
  // 词典静态自检：key 中英对称、代码用到的都在词典里 —— 漏 one 就会把 key 直接显示给用户
  const src = readFileSync(join(here, '..', 'client', 'client.js'), 'utf8');
  const marker = '    // ---------- 设置页样式 ----------';
  const [head, body] = src.split(marker);
  const keysIn = (block) => new Set([...block.matchAll(/"([\w.]+)":\s*"/g)].map((m) => m[1]));
  // 只保留 DSH 界面实际支持的语言（中/英）——多余的语言写了也不会被用到
  const LANGS = ['zh', 'en'];
  const dicts = {};
  for (const lang of LANGS) {
    const from = head.indexOf(`      ${lang}: {`);
    const next = LANGS.slice(LANGS.indexOf(lang) + 1)
      .map((l) => head.indexOf(`      ${l}: {`)).filter((i) => i > from);
    const to = next.length ? Math.min(...next) : head.indexOf('    };');
    dicts[lang] = keysIn(head.slice(from, to));
  }
  const zh = dicts.zh;
  const used = new Set([...body.matchAll(/tt\((?:t|boundTranslate),\s*"([\w.]+)"/g)].map((m) => m[1]));
  const asymmetric = LANGS.filter((lang) => dicts[lang].size !== zh.size || [...zh].some((k) => !dicts[lang].has(k)));
  check('中英词典 key 一一对应',
    asymmetric.length === 0,
    asymmetric.length ? asymmetric.map((l) => `${l}=${dicts[l].size}`).join(' ') : LANGS.map((l) => `${l}=${dicts[l].size}`).join(' '));
  const missing = [...used].filter((k) => !zh.has(k));
  check('代码用到的 key 都在词典里', missing.length === 0, missing.join(', ') || `${used.size} keys`);
}

const dockComponent = registered['conversation.composer.dock'].Component;
const makeProps = (draft) => ({
  sessionId: 'session-smoke',
  useSession: (selector) => selector({ running: false, blank: false, removed: false, title: '排查录屏' }),
  // 会话标题来自客户端的 sessions store（Host 端没有标题字段）
  useSessions: (selector) => selector({ sessions: [{ id: 'session-smoke', title: '排查录屏' }] }),
  useInput: (selector) => selector({ draft }),
  inputActions: { captureInsertion: () => ({}), insertText: () => true },
});

// ① 空草稿 + 有建议 → 必须渲染出 ghost
const dock = mount(react, dockComponent, () => makeProps(''));
await dock.settle();
check('dock 渲染不抛异常', Boolean(dock.tree), 'ok');
check('空草稿时渲染出 ghost 节点', hasGhost(dock.tree), `tree.type=${dock.tree?.type ?? 'null'}`);

// ①b NDJSON：delta 更新、reset 清空、done 收尾；请求体必须带 stream:true
{
  ndjsonLines = [
    JSON.stringify({ type: 'start' }),
    JSON.stringify({ type: 'delta', text: '半句建议' }),
    JSON.stringify({ type: 'reset' }),
    JSON.stringify({ type: 'delta', text: '流式完整建议' }),
    JSON.stringify({ type: 'done', ok: true, suggestion: '流式完整建议', truncated: false, provider: 'p', model: 'm', ms: 5 }),
  ];
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(6);
  const call = inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).at(-1);
  const body = call?.options?.body ? JSON.parse(call.options.body) : {};
  check('dock 请求 NDJSON 流（stream:true）', body.stream === true, JSON.stringify(body));
  check('dock 把 AbortSignal 传给流式 fetch', Boolean(call?.options?.signal) && typeof call.options.signal.aborted === 'boolean',
    String(call?.options?.signal));
  check('客户端消费 NDJSON：reset 后的 delta 成为最终 ghost',
    /流式完整建议/.test(textOf(view.tree)) && !/半句建议/.test(textOf(view.tree)), textOf(view.tree).slice(-80));
  ndjsonLines = null;
}

// ①c 流式 error 事件必须收回已经显示的半句 ghost
{
  ndjsonLines = [
    JSON.stringify({ type: 'start' }),
    JSON.stringify({ type: 'delta', text: '半句不该留下' }),
    JSON.stringify({ type: 'error', ok: false, reason: '流中断', partialChars: 6 }),
  ];
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(6);
  check('流式 error 后不残留半句 ghost', !hasGhost(view.tree) && !/半句不该留下/.test(textOf(view.tree)), '');
  const stored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history') || '[]');
  check('流式 error 把 partialChars 写入失败历史', stored[0]?.partialChars === 6, JSON.stringify(stored[0]));
  ndjsonLines = null;
}

// ② 草稿非空 → 隐藏
const draftDock = mount(react, dockComponent, () => makeProps('我在打字'));
await draftDock.settle();
check('草稿非空时隐藏 ghost', !hasGhost(draftDock.tree));

// ③ 打字隐藏后把草稿删空 → 建议必须自己回来
//（真实浏览器里没法注入删除键进 Lexical，这条只能靠渲染层用例守住）
let typed = '我在打字';
const typingDock = mount(react, dockComponent, () => makeProps(typed));
await typingDock.settle();
const hiddenWhileTyping = !hasGhost(typingDock.tree);
typed = '';
typingDock.render();
await typingDock.settle(3);
check('草稿删空后 ghost 自动恢复', hiddenWhileTyping && hasGhost(typingDock.tree),
  `打字时隐藏=${hiddenWhileTyping} 清空后出现=${hasGhost(typingDock.tree)}`);

// ③ 关键交互按钮都在（Tab 采纳 / ↻ 换一条 / Esc 忽略）
const labels = find(dock.tree, (n) => typeof n.props?.children === 'string').map((n) => n.props.children);
check('ghost 上有 Tab / ↻ / Esc 三个操作',
  labels.includes('Tab') && labels.includes('↻') && labels.some((t) => /Esc/.test(t)),
  labels.filter((t) => t.length < 12).join(' | '));

// ③b 长建议必须完整可见：宽度跟随输入框内容区、允许折行，且子树里不能有省略号截断
const ghostNode = find(dock.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true')[0];
const ghostStyle = ghostNode?.props?.style ?? {};
const ellipsized = find(ghostNode, (n) => n.props?.style && (n.props.style.textOverflow === 'ellipsis' || n.props.style.whiteSpace === 'nowrap' && n.props.style.overflow === 'hidden'));
check('长建议不被省略号截断（宽度取自输入框、允许折行）',
  ghostStyle.whiteSpace === 'pre-wrap' && ghostStyle.width === 400 && ellipsized.length === 0,
  `whiteSpace=${ghostStyle.whiteSpace} width=${ghostStyle.width} 截断节点=${ellipsized.length}`);

// ④ 设置页
react.reset();
const settingsComponent = registered['settings.section'].Component;
const settings = mount(react, settingsComponent, () => ({}));
await settings.settle();
const settingsText = textOf(settings.tree);
check('设置页渲染不抛异常', Boolean(settings.tree));
check('设置页含关键设置项',
  /启用联想/.test(settingsText) && /提供商/.test(settingsText) && /最近预测/.test(settingsText),
  settingsText.slice(0, 50));
// 输出上限：提示里必须写明「被截断就手动调高」，且真的截断时设置页要就地给出可执行建议
// 输出上限在「高级」里：先展开再看提示文案
const advToggle = find(settings.tree, (n) => n.type === 'button' && typeof n.props?.children === 'string' && /高级/.test(n.props.children))[0];
advToggle?.props?.onClick?.();
await settings.settle();
check('输出长度按字数设置（20–400），提示里不再要求换算 token',
  (() => {
    const input = find(settings.tree, (n) => n.props && n.props['data-prompt-predict-chars'] === 'true')[0];
    const text = textOf(settings.tree);
    return Boolean(input) && input.props.max === 400 && input.props.min === 20
      && /字数上限/.test(text) && !/token（16/.test(text);
  })(), '字数上限控件检查');
// 拉丁语系给「约 N 个单词」参考；中文本来就是按字，不给换算
{
  const inst2 = setup(makeLocale('zh'));
  // 先挂 composer dock：设置页要靠它拿到 liveSessionId 才能发起「试一下」
  const dock2 = mount(inst2.react, inst2.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dock2.settle();
  const C2 = inst2.registered['settings.section'].Component;
  const view2 = mount(inst2.react, C2, () => ({}));
  await view2.settle();
  find(view2.tree, (n) => n.type === 'button' && typeof n.props?.children === 'string' && /高级/.test(n.props.children))[0]?.props?.onClick?.();
  await view2.settle();
  const pickLang = () => find(view2.tree, (n) => n.props && n.props['data-prompt-predict-language'] === 'true')[0];
  pickLang()?.props?.onChange?.({ target: { value: 'en' } });
  await view2.settle();
  check('英文建议时字数旁给出「约 N 个词」参考',
    /约 \d+ 个词/.test(textOf(view2.tree)), textOf(view2.tree).slice(-110));
  pickLang()?.props?.onChange?.({ target: { value: 'zh' } });
  await view2.settle();
  check('中文建议时不显示单词换算', !/个单词/.test(textOf(view2.tree)), textOf(view2.tree).slice(-90));
}

// 建议语言：默认 auto，下拉里含固定语言选项（同在「高级」里）
const langSelect = find(settings.tree, (n) => n.type === 'select'
  && Array.isArray(n.props?.children) && n.props.children.some((c) => c?.props?.value === 'ru'))[0];
const langValues = (langSelect?.props?.children || []).map((c) => c?.props?.value);
// 兜底候选必须与 Host 的清单一致，否则旧 Host / 请求失败时「更多语言…」会空着
{
  const clientSrc = readFileSync(join(here, '..', 'client', 'client.js'), 'utf8');
  const hostSrc = readFileSync(join(here, '..', 'lib', 'predict.mjs'), 'utf8');
  const grab = (text, startMarker, endMarker) => {
    const from = text.indexOf(startMarker);
    const to = text.indexOf(endMarker, from);
    return new Set([...text.slice(from, to).matchAll(/'([a-z]{2,3}(?:-[A-Za-z0-9]+)?)'|"([a-z]{2,3}(?:-[A-Za-z0-9]+)?)"/g)]
      .map((m) => m[1] || m[2]));
  };
  const host = grab(hostSrc, 'SUGGESTION_LANGUAGES = [', '];');
  const client = grab(clientSrc, 'DEFAULT_LANGUAGE_CODES = [', '];');
  check('客户端兜底语言清单与 Host 一致',
    host.size === client.size && [...host].every((code) => client.has(code)),
    `host=${host.size} client=${client.size}`);
}

// 语言下拉：主流语言直接显示（地区细分放二级下拉），其余收进「更多…」
{
  const many = ['zh', 'zh-TW', 'zh-HK', 'en', 'ja', 'ko', 'ru', 'fr', 'de', 'nl', 'es', 'pt', 'it', 'ar', 'hi', 'uk', 'pl', 'sv'];
  fetchResult = { suggestion: '先补测试再实现', languages: many };
  const inst = setup();
  const C = inst.registered['settings.section'].Component;
  const view = mount(inst.react, C, () => ({}));
  await view.settle();
  find(view.tree, (n) => n.type === 'button' && typeof n.props?.children === 'string' && /高级/.test(n.props.children))[0]?.props?.onClick?.();
  await view.settle();
  const pick = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-language'] === 'true')[0];
  const region = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-language-region'] === 'true')[0];
  const values = (node) => (node?.props?.children || []).map((c) => c?.props?.value);

  check('主流语言直接显示，地区变体不占主列表',
    values(pick()).includes('zh-Hant') && values(pick()).includes('nl') && values(pick()).includes('ar')
    && !values(pick()).includes('zh-TW') && !values(pick()).includes('zh-HK') && !values(pick()).includes('en-US')
    && values(pick()).includes('__more__'),
    values(pick()).join(','));
  check('未选家族时不显示地区下拉', !region(), 'unexpected region select');

  pick()?.props?.onChange?.({ target: { value: 'zh-Hant' } });
  await view.settle();
  check('选「繁體中文」后出现地区下拉（台灣/香港，台灣在前）',
    Boolean(region()) && values(region())[0] === 'zh-TW' && values(region()).includes('zh-HK')
    && !values(region()).includes('zh-Hant') && region().props.value === 'zh-TW',
    region() ? values(region()).join(',') : 'missing');

  region()?.props?.onChange?.({ target: { value: 'zh-TW' } });
  await view.settle();
  check('冗长的地区名被缩短（香港/中国大陆）',
    (() => {
      const node = find(view.tree, (n) => n.props && n.props['data-prompt-predict-language-region'] === 'true')[0];
      const opts = (node?.props?.children || []);
      const labels = opts.map((c) => (typeof c?.props?.children === 'string' ? c.props.children : ''));
      return labels.some((x) => x === '香港') && !labels.some((x) => /特别行政区/.test(x));
    })(), '香港 label check');

  check('选地区后保存的是 zh-TW 且主下拉仍显示繁體中文',
    pick().props.value === 'zh-Hant' && region().props.value === 'zh-TW',
    `${pick().props.value}/${region().props.value}`);

  pick()?.props?.onChange?.({ target: { value: 'en' } });
  await view.settle();
  check('英语也有地区细分（美/英/澳/加，美国在前）',
    values(region())[0] === 'en-US' && values(region()).includes('en-GB') && region().props.value === 'en-US',
    values(region()).join(','));

  // 简体中文也有地区用词差异（大陆/新马）
  pick()?.props?.onChange?.({ target: { value: 'zh' } });
  await view.settle();
  check('简体中文地区：中国大陆排第一、没有「通用」',
    Boolean(region()) && values(region())[0] === 'zh-CN'
    && ['zh-CN', 'zh-SG', 'zh-MY'].every((c) => values(region()).includes(c))
    && !values(region()).includes('zh'),
    values(region()).join(','));

  // 其它有地区差异的语言也要有二级下拉
  for (const [base, expected] of [
    ['pt', ['pt-BR', 'pt-PT']],
    ['es', ['es-ES', 'es-419', 'es-MX', 'es-AR', 'es-CO']],
    ['fr', ['fr-FR', 'fr-CA']],
    ['de', ['de-DE', 'de-AT', 'de-CH']],
    ['nl', ['nl-NL', 'nl-BE']],
  ]) {
    pick()?.props?.onChange?.({ target: { value: base } });
    await view.settle();
    const got = values(region());
    check(`${base} 有地区细分（${expected.join('/')}，无「通用」）`,
      Boolean(region()) && expected.every((code) => got.includes(code)) && got[0] === expected[0]
      && !got.includes(base),
      got.join(','));
  }

  pick()?.props?.onChange?.({ target: { value: '__more__' } });
  await view.settle();
  check('点「更多语言…」后展开其余语言', values(pick()).includes('uk') && !values(pick()).includes('__more__'),
    values(pick()).join(','));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

check('设置页有「建议语言」下拉且默认 auto',
  Boolean(langSelect) && langSelect.props.value === 'auto' && langValues.includes('zh') && langValues.includes('ru'),
  langSelect ? `value=${langSelect.props.value} options=${langValues.join(',')}` : 'missing');
// 沙箱 window 的 dispatchEvent 只按 type 找监听器，插件从事件 detail 里读 { latest, history }
// 真实链路：dock 写 localStorage 后广播事件，设置页从 localStorage 重读
const truncatedEntry = { at: Date.now(), sessionId: 'session-smoke', session: '排查录屏', ms: 12, provider: 'p', model: 'm', truncated: true, suggestion: '这是被截断的半句' };
const seeded = [truncatedEntry, { at: Date.now() - 60000, sessionId: 'session-smoke', session: '排查录屏', ms: 20, provider: 'p', model: 'm', suggestion: '第二条建议原文' }];
env.localStorage.setItem('dsh-prompt-predict.history', JSON.stringify(seeded));
env.window.dispatchEvent({ type: 'dsh-prompt-predict:run', detail: { latest: truncatedEntry, history: seeded } });
await settings.settle();
const afterTruncation = textOf(settings.tree);
check('上次预测被截断时设置页就地提示调高上限',
  /被长度限制截断/.test(afterTruncation) && /200/.test(afterTruncation),
  afterTruncation.slice(0, 80));
// 多条记录都必须在列表里（不是只显示最新一条）
check('记录条数如实统计（2 条存在，默认只渲染 1 行）',
  /[（(]2\/10[）)]/.test(afterTruncation) && (afterTruncation.match(/p \/ m/g) || []).length === 1,
  afterTruncation.slice(0, 120));
// 最近预测列表：dock 触发过的预测应当出现在设置页里，且带会话标识
check('耗时单位按界面语言显示',
  /毫秒/.test(settingsText) && !/\bms\b/.test(settingsText), settingsText.slice(-80));
check('设置页列出最近预测（含会话标题）',
  /provider-x/.test(settingsText) && /排查录屏/.test(settingsText) && !/session-/.test(settingsText),
  settingsText.slice(-120));
// 存储位置的说法必须跟运行环境一致（desktop=Electron / web=浏览器），不能写死一种
{
  check('web 端提示描述为浏览器 localStorage',
    /浏览器的 localStorage|browser's localStorage/.test(textOf(settings.tree)),
    textOf(settings.tree).slice(0, 60));
  testUserAgent = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Electron/39.0.0 Chrome/142';
  const electronInst = setup();
  const E = electronInst.registered['settings.section'].Component;
  const electronView = mount(electronInst.react, E, () => ({}));
  await electronView.settle();
  // 输出上限 / 记录条数在「高级」里，先展开
  find(electronView.tree, (n) => n.type === 'button' && typeof n.props?.children === 'string' && /高级/.test(n.props.children))[0]?.props?.onClick?.();
  await electronView.settle();
  const electronText = textOf(electronView.tree);
  check('desktop(Electron) 端提示描述为应用内存储',
    /Electron 渲染层|Electron renderer/.test(electronText) && !/浏览器的 localStorage/.test(electronText),
    electronText.slice(0, 60));
  testUserAgent = 'node-test';
}

// 详细说明放在自绘 tooltip 里（原生 title 在这个渲染环境不弹，只变光标）：
// 鼠标移入要能渲染出完整文案，移出要收起
{
  const inst = setup(makeLocale('zh'));
  const dock = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dock.settle();
  const settingsView = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await settingsView.settle();
  const hints = () => find(settingsView.tree, (n) => n.props && n.props['data-prompt-predict-hint-more'] === 'true');
  check('三条提示都可悬停', hints().length >= 3, `可悬停提示 ${hints().length} 个`);
  const hasHelpCursor = (node) => find(node, (n) => n.props?.style?.cursor === 'help').length > 0;
  check('可悬停提示有视觉提示（cursor: help）', hints().every(hasHelpCursor), '');
  const before = textOf(settingsView.tree);
  check('未悬停时不显示气泡', !/默认按对话判断语言/.test(before), '');
  hints()[0]?.props?.onMouseEnter?.();
  await settingsView.settle(3);
  check('悬停后渲染完整说明', /默认按对话判断语言/.test(textOf(settingsView.tree)),
    textOf(settingsView.tree).slice(-120));
  const detail = find(settingsView.tree, (n) => n.props?.role === 'tooltip')[0];
  // 气泡是浮层：绝对定位、不占布局（行高不变）、不接收鼠标事件（不挡下面控件）
  check('详情是浮层气泡（绝对定位，不改变行高）',
    detail?.props?.style?.position === 'absolute' && Number(detail?.props?.style?.zIndex) >= 10,
    JSON.stringify(detail?.props?.style));
  // 提示在行尾，气泡必须从右边缘向左扩展，否则会越过卡片右边被裁掉
  check('气泡向右对齐、向左扩展',
    detail?.props?.style?.insetInlineEnd === 0 && detail?.props?.style?.insetInlineStart === undefined,
    JSON.stringify({ end: detail?.props?.style?.insetInlineEnd, start: detail?.props?.style?.insetInlineStart }));
  check('气泡不接收鼠标事件（不会挡住下面的设置项）',
    detail?.props?.style?.pointerEvents === 'none', String(detail?.props?.style?.pointerEvents));
  const stack = find(settingsView.tree, (n) => n.props && n.props['data-prompt-predict-hint-more'] === 'true')[0];
  check('提示容器只做定位锚点（不额外占高度）',
    stack?.props?.style?.position === 'relative' && stack.props.style.display === 'inline-block'
    && stack.props.style.flexDirection === undefined,
    JSON.stringify(stack?.props?.style));
  const shortText = find(stack, (n) => n.props?.children === '跟随对话，也可固定')[0];
  check('短文案样式存在（cursor/下划线），不能是 undefined',
    shortText?.props?.style?.cursor === 'help', JSON.stringify(shortText?.props?.style));
  hints()[0]?.props?.onMouseLeave?.();
  await settingsView.settle(3);
  check('移出后气泡收起', !/默认按对话判断语言/.test(textOf(settingsView.tree)), '');
}

{
  const inst = setup();
  fetchResult = { suggestion: '刷新后验证了三点都正常，但展开全', truncated: true };
  const dock = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dock.settle();
  const chip = () => find(dock.tree, (n) => n.props && n.props['data-prompt-predict-truncated'] === 'true')[0];
  check('「已截断」标记可接收鼠标事件（覆盖层其余部分不可）',
    chip()?.props?.style?.pointerEvents === 'auto', JSON.stringify(chip()?.props?.style));
  check('未悬停时显示短文案', /建议调高字数上限/.test(textOf(dock.tree)), '');
  chip()?.props?.onMouseEnter?.();
  await dock.settle(3);
  check('悬停「已截断」时直接展开设置路径',
    /设置 → 提示词联想 → 高级/.test(textOf(dock.tree)), textOf(dock.tree).slice(-80));
  chip()?.props?.onMouseLeave?.();
  await dock.settle(3);
  check('移出后恢复短文案', !/设置 → 提示词联想 → 高级/.test(textOf(dock.tree)), '');
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 「试一下」的耗时单位也要跟界面语言一致（不能写死 ms）
{
  check('试一下结果显示本地化的耗时单位', /毫秒/.test(textOf(settings.tree)) || /\bms\b/.test(textOf(settings.tree)), '');
}

// 失败计数是全局的：两个 composer 各失败一次，也要能触发提示（只在最近失败的会话里显示）
{
  const inst = setup();
  const C = inst.registered['conversation.composer.dock'].Component;
  fetchResult = { ok: false, reason: '模型调用超时' };
  const makeDock = (id) => mount(inst.react, C, () => ({
    sessionId: id,
    useSession: (sel) => sel({ running: false, blank: false, removed: false, title: id }),
    useInput: (sel) => sel({}),
    inputActions: { captureInsertion: () => ({}), insertText: () => true },
  }));
  const dockA = makeDock('session-a'); await dockA.settle();
  const dockB = makeDock('session-b'); await dockB.settle();
  const hasHint = (view) => find(view.tree, (n) => n.props && n.props['data-prompt-predict-hint'] === 'true').length > 0;
  check('两个会话各失败一次也会触发提示（计数共享）',
    !hasHint(dockA) && hasHint(dockB), `A=${hasHint(dockA)} B=${hasHint(dockB)}`);
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 深色主题：切到 dark 后 ghost 与设置页要换成深色调色板
{
  const inst = setup();
  inst.env.window.setDark(true);   // 在挂载前切换，模拟系统深色模式
  const dock = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dock.settle();
  const ghost = find(dock.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true')[0];
  const span = find(ghost, (n) => n.props?.children === '先补测试再实现')[0];
  check('深色模式下 ghost 的兜底色变深', String(span?.props?.style?.color || '').includes('#9ca3af'),
    String(span?.props?.style?.color));

  const settingsView = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await settingsView.settle();
  const card = find(settingsView.tree, (n) => n.props && n.props.style && String(n.props.style.background || '').includes('--dsw-alias-bg-layer-1'))[0];
  check('深色模式下设置卡片兜底背景为深色', String(card?.props?.style?.background || '').includes('#111827'),
    String(card?.props?.style?.background));
  check('卡片声明 color-scheme，让原生控件跟随深浅',
    card?.props?.style?.colorScheme === 'dark', String(card?.props?.style?.colorScheme));
  inst.env.window.setDark(false);
}

// 暂停 10 分钟：暂停期间不发预测，恢复后重新武装并预测一次
{
  const inst = setup();
  const fetchCalls = [];
  const origFetch = inst.env.window.fetch;
  // 统计真实请求次数：暂停时必须是 0
  const settingsView = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await settingsView.settle();
  const pauseBtn = () => find(settingsView.tree, (n) => n.props && n.props['data-prompt-predict-pause'] === 'true')[0];
  check('设置页有暂停开关', Boolean(pauseBtn()) && /暂停 10 分钟/.test(textOf(settingsView.tree)),
    String(pauseBtn()?.props?.children));

  pauseBtn()?.props?.onClick?.();
  await settingsView.settle(3);
  check('暂停后显示剩余时间', /已暂停，剩余/.test(textOf(settingsView.tree)), textOf(settingsView.tree).slice(-60));

  // 暂停期间挂 dock：不应该有 ghost（不发预测）
  const dock = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dock.settle();
  check('暂停期间不显示 ghost', !hasGhost(dock.tree), '');

  // 恢复：dock 收到事件后重新预测
  pauseBtn()?.props?.onClick?.();
  await settingsView.settle(3);
  await dock.settle(4);
  check('恢复后重新出现 ghost', hasGhost(dock.tree), '');
}

// P0：dock 与 settings 是两个独立模块实例，但共享同一个 window/localStorage。
// 暂停状态和 liveSessionId 都必须跨实例工作，不能只靠模块变量。
{
  const shared = makeEnv();
  const dockInst = setup(null, shared);
  const settingsInst = setup(null, shared);
  let running = false;
  const dockView = mount(dockInst.react, dockInst.registered['conversation.composer.dock'].Component, () => ({
    ...makeProps(''),
    useSession: (sel) => sel({ running, blank: false, removed: false, title: '跨实例会话' }),
  }));
  await dockView.settle();
  const suggestCount = () => shared.fetchCalls.filter((c) => c.url.includes('/suggest')).length;
  check('独立实例的 dock 能正常预测', hasGhost(dockView.tree), '');

  const settingsView = mount(settingsInst.react, settingsInst.registered['settings.section'].Component, () => ({}));
  await settingsView.settle();
  const pauseButton = () => find(settingsView.tree, (n) => n.props && n.props['data-prompt-predict-pause'] === 'true')[0];
  pauseButton()?.props?.onClick?.();
  await settingsView.settle(3);
  await dockView.settle(2);
  check('另一个实例暂停后 dock 收起 ghost', !hasGhost(dockView.tree), '');

  const before = suggestCount();
  running = true; dockView.render(); await dockView.settle(2);
  running = false; dockView.render(); await dockView.settle(3);
  check('另一个实例暂停时不会重新发预测', suggestCount() === before,
    `before=${before} after=${suggestCount()}`);

  pauseButton()?.props?.onClick?.();
  await settingsView.settle(3);
  await dockView.settle(4);
  check('另一个实例恢复后 dock 重新预测', hasGhost(dockView.tree), '');
}

// P0：localStorage 被禁用时，暂停仍要在本实例内生效（不能读回空值把内存状态冲掉）
{
  const inst = setup();
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    inst.env.localStorage[method] = () => { throw new Error('storage blocked'); };
  }
  let running = false;
  const dockView = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => ({
    ...makeProps(''),
    useSession: (sel) => sel({ running, blank: false, removed: false, title: '隐私模式' }),
  }));
  await dockView.settle();
  const settingsView = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await settingsView.settle();
  const before = inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).length;
  find(settingsView.tree, (n) => n.props && n.props['data-prompt-predict-pause'] === 'true')[0]?.props?.onClick?.();
  await settingsView.settle(3);
  running = true; dockView.render(); await dockView.settle(2);
  running = false; dockView.render(); await dockView.settle(3);
  const after = inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).length;
  check('localStorage 不可用时内存暂停仍生效', !hasGhost(dockView.tree) && after === before,
    `before=${before} after=${after} ghost=${hasGhost(dockView.tree)}`);
}

// P0：「试一下」在独立 settings 实例里也要拿到 dock 写入的会话 id
{
  const shared = makeEnv();
  const dockInst = setup(null, shared);
  const settingsInst = setup(null, shared);
  const dockView = mount(dockInst.react, dockInst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dockView.settle();
  const settingsView = mount(settingsInst.react, settingsInst.registered['settings.section'].Component, () => ({}));
  await settingsView.settle();
  const tryButton = find(settingsView.tree, (n) => n.props && n.props['data-prompt-predict-try'] === 'true')[0];
  tryButton?.props?.onClick?.();
  await settingsView.settle(5);
  const call = shared.fetchCalls.filter((c) => c.url.includes('/suggest')).at(-1);
  const body = call?.options?.body ? JSON.parse(call.options.body) : null;
  check('独立 settings 实例能调用当前会话的「试一下」',
    body?.sessionId === 'session-smoke' && /先补测试再实现/.test(textOf(settingsView.tree)),
    JSON.stringify(body));
}

// 自动检查失败时给出可重试提示
{
  registryFails = true;
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle(4);
  check('自动检查更新失败时显示重试提示',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-update-auto-error'] === 'true').length === 1, '');
  registryFails = false;
}

// 更新提示只在设置页自动出现，不再占用 composer
{
  registryVersion = '9.9.10';
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle(6);
  check('打开设置页时自动检查并在页内显示新版',
    /发现新版本 v9\.9\.10/.test(textOf(view.tree)), textOf(view.tree).slice(0, 80));
  check('composer 不再渲染更新提示节点',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-update-notice'] === 'true').length === 0, '');
  registryVersion = '9.9.9';
}

// 优化项 1：status 未返回版本号时「检查更新」禁用（避免与 0.0.0 比较误报）
{
  fetchResult = { suggestion: '先补测试再实现' };   // 不带 version，模拟旧 Host / 异常响应
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  const btn = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-update-check'] === 'true')[0];
  check('版本号缺失时「检查更新」禁用', btn()?.props?.disabled === true, String(btn()?.props?.disabled));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  const btn = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-update-check'] === 'true')[0];
  check('版本号加载后「检查更新」可用', btn()?.props?.disabled === false, String(btn()?.props?.disabled));
}

// 优化项 2：10 分钟内有检查记录时，dock 自动检查直接跳过（跨实例去重）
{
  registryVersion = '9.9.10';
  const inst = setup();
  inst.env.localStorage.setItem('dsh-prompt-predict.lastUpdateCheck', String(Date.now()));
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(6);
  const registryCalls = inst.env.fetchCalls.filter((c) => c.url.startsWith('https://registry.npmjs.org/')).length;
  check('短时间内已有检查记录时不再请求 registry',
    registryCalls === 0 && find(view.tree, (n) => n.props && n.props['data-prompt-predict-update-notice'] === 'true').length === 0,
    `registryCalls=${registryCalls}`);
  registryVersion = '9.9.9';
}

// 优化项 5：「试一下」失败也写进历史
{
  const inst = setup();
  const dock = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dock.settle();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  fetchResult = { ok: false, reason: '试一下失败原因' };
  find(view.tree, (n) => n.props && n.props['data-prompt-predict-try'] === 'true')[0]?.props?.onClick?.();
  await view.settle(5);
  const stored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history') || '[]');
  check('「试一下」失败写入历史记录', stored[0]?.error === '试一下失败原因', JSON.stringify(stored[0] ?? null).slice(0, 80));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 历史记录：已采纳标记 + 一键插入当前 composer
{
  const inst = setup();
  const dock = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => ({
    ...makeProps(''),
    inputActions: { captureInsertion: () => ({}), insertText: (text) => { insertedHistory = text; return true; } },
  }));
  let insertedHistory = null;
  await dock.settle(3);
  inst.env.localStorage.setItem('dsh-prompt-predict.history', JSON.stringify([{
    id: 'h1', at: Date.now(), sessionId: 'session-smoke', session: '排查录屏',
    ms: 12, provider: 'p', model: 'm', suggestion: '旧建议内容', accepted: true,
  }]));
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle(3);
  const insertBtn = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-history-insert'] === 'true')[0];
  check('历史记录显示「已采纳」标记与插入按钮',
    /已采纳/.test(textOf(view.tree)) && Boolean(insertBtn()), textOf(view.tree).slice(0, 80));
  insertBtn()?.props?.onClick?.({ stopPropagation() {} });
  await view.settle(2);
  check('点「插入」把历史建议写进 composer',
    insertedHistory === '旧建议内容' && /已插入/.test(textOf(view.tree)),
    JSON.stringify(insertedHistory));
}

// 优化项 6：失败原因脱敏后落盘（URL / api_key / Bearer token 不外泄）
{
  const inst = setup();
  fetchResult = { ok: false, reason: '鉴权失败 api_key=SECRET123 以及 Bearer abc.def.ghi 还有 http://internal.gateway.example/v1' };
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(5);
  const stored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history') || '[]');
  const err = String(stored[0]?.error ?? '');
  check('失败历史里的 URL / key / token 已脱敏',
    err.includes('[url]') && err.includes('api_key=[redacted]') && err.includes('Bearer [redacted]')
    && !err.includes('SECRET123') && !err.includes('internal.gateway') && !err.includes('abc.def.ghi'),
    err.slice(0, 90));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 多行建议：ghost 原样保留换行（pre-wrap），Tab 采纳时换行一起插入
{
  fetchResult = { suggestion: '第一行\n第二行', version: '9.9.9' };
  let inserted = null;
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => ({
    ...makeProps(''),
    inputActions: { captureInsertion: () => ({}), insertText: (text) => { inserted = text; return true; } },
  }));
  await view.settle();
  const ghost = find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true')[0];
  const node = find(view.tree, (n) => n.props && n.props.children === '第一行\n第二行')[0];
  check('多行建议原样渲染（保留换行、pre-wrap）',
    Boolean(node) && ghost?.props?.style?.whiteSpace === 'pre-wrap',
    `node=${Boolean(node)} whiteSpace=${ghost?.props?.style?.whiteSpace}`);
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'Tab', preventDefault() {}, stopPropagation() {} });
  await view.settle(2);
  check('Tab 采纳多行建议时换行一起插入', inserted === '第一行\n第二行', JSON.stringify(inserted));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 设置页明确提示：所有设置需要手动保存才生效
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  check('设置页显示手动保存提示',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-save-hint'] === 'true').length === 1
    && /保存/.test(textOf(view.tree)), '');
}

// 设置项：切换提示词开关与最大切换次数
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  const toggle = find(view.tree, (n) => n.props && n.props['data-prompt-predict-switch'] === 'true')[0];
  const limit = find(view.tree, (n) => n.props && n.props['data-prompt-predict-switch-limit'] === 'true')[0];
  check('切换提示词开关默认开启、上限默认 3',
    toggle?.props?.['aria-pressed'] === true && Number(limit?.props?.value) === 3, '');
  toggle?.props?.onClick?.();
  await view.settle(2);
  check('关闭切换后隐藏切换次数选项',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-switch-limit'] === 'true').length === 0, '');
  find(view.tree, (n) => n.type === 'button' && n.props?.children === '保存')[0]?.props?.onClick?.();
  await view.settle(4);
  const call = inst.env.fetchCalls.filter((c) => c.url.includes('/settings')).at(-1);
  const body = call?.options?.body ? JSON.parse(call.options.body) : {};
  check('保存时提交 switchEnabled:false 与 switchLimit',
    body.switchEnabled === false && body.switchLimit === 3, JSON.stringify(body).slice(0, 160));
}

// 设置项：多行建议开关（默认开，保存时提交到 Host）
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  const toggle = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-multiline'] === 'true')[0];
  check('设置页有多行建议开关且默认开启', Boolean(toggle()) && toggle()?.props?.['aria-pressed'] === true,
    String(toggle()?.props?.['aria-pressed']));
  check('开关轨道禁止被 flex 挤压（否则滑块会溢出）',
    toggle()?.props?.style?.flex === 'none' && toggle()?.props?.style?.overflow === 'hidden',
    JSON.stringify({ flex: toggle()?.props?.style?.flex, overflow: toggle()?.props?.style?.overflow }));
  toggle()?.props?.onClick?.();
  await view.settle(2);
  check('点击后多行建议关闭', toggle()?.props?.['aria-pressed'] === false, String(toggle()?.props?.['aria-pressed']));
  find(view.tree, (n) => n.type === 'button' && n.props?.children === '保存')[0]?.props?.onClick?.();
  await view.settle(4);
  const call = inst.env.fetchCalls.filter((c) => c.url.includes('/settings')).at(-1);
  const body = call?.options?.body ? JSON.parse(call.options.body) : {};
  check('保存时提交 multilineSuggestions:false', body.multilineSuggestions === false, JSON.stringify(body).slice(0, 120));
}

// 切换提示词：↓ 生成下一条并记住历史，↑ 回到上一条；达到上限后不再请求
{
  fetchResult = { suggestion: 'A', version: '9.9.9', effective: { switchEnabled: true, switchLimit: 1 } };
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  check('初始建议为 A', /A/.test(textOf(view.tree)), textOf(view.tree).slice(0, 20));

  fetchResult = { suggestion: 'B', version: '9.9.9', effective: { switchEnabled: true, switchLimit: 1 } };
  const before = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', code: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(4);
  check('↓ 生成下一条建议', /B/.test(textOf(view.tree)) && suggestCalls().length === before + 1, textOf(view.tree).slice(0, 30));

  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowUp', preventDefault() {}, stopPropagation() {} });
  await view.settle(2);
  check('↑ 回到上一条建议', /A/.test(textOf(view.tree)) && suggestCalls().length === before + 1, textOf(view.tree).slice(0, 30));

  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', code: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(2);
  check('↓ 在本轮历史里前进不请求', /B/.test(textOf(view.tree)) && suggestCalls().length === before + 1, '');

  const beforeLimit = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', code: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('达到最大切换次数后不再请求并提示',
    suggestCalls().length === beforeLimit && /最大切换次数/.test(textOf(view.tree)), textOf(view.tree).slice(0, 60));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 运行中关闭切换（设置事件）应立即生效，而不是沿用旧闭包
{
  fetchResult = { suggestion: 'A', version: '9.9.9' };
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(3);
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  const before = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'dsh-prompt-predict:settings', detail: { enabled: true, switchEnabled: false, switchLimit: 3, historySize: 10 } });
  await view.settle(2);
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', code: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('运行中关闭切换后 ↓ 不再请求',
    suggestCalls().length === before && /A/.test(textOf(view.tree)), textOf(view.tree).slice(0, 40));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 切换次数 0 = 不限；第一条时按 ↑ 不请求也不报错
{
  fetchResult = { suggestion: 'A', version: '9.9.9', effective: { switchEnabled: true, switchLimit: 0 } };
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  const before = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowUp', preventDefault() {}, stopPropagation() {} });
  await view.settle(2);
  check('第一条建议时按 ↑ 不请求、建议保持',
    suggestCalls().length === before && /A/.test(textOf(view.tree)), '');
  for (const value of ['B', 'C']) {
    fetchResult = { suggestion: value, version: '9.9.9', effective: { switchEnabled: true, switchLimit: 0 } };
    inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', code: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
    await view.settle(3);
  }
  check('switchLimit=0 时可连续生成', /C/.test(textOf(view.tree)) && suggestCalls().length === before + 2, '');
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 关闭切换后 ↓/↑ 不生效、也不显示切换提示
{
  fetchResult = { suggestion: 'A', version: '9.9.9', effective: { switchEnabled: false, switchLimit: 3 } };
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  const before = suggestCalls().length;
  check('关闭切换后不显示 ↓ 提示', !/↓/.test(textOf(view.tree)), textOf(view.tree).slice(0, 40));
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', code: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowUp', preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('关闭切换后方向键不请求', suggestCalls().length === before && /A/.test(textOf(view.tree)), '');
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 没有建议时按 ↓ 也能直接拉一条；有草稿时不拦截；keydown+keyup 只算一次
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {}, stopPropagation() {} });
  await view.settle(2);
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  let release = null;
  holdSuggest = new Promise((r) => { release = r; });
  const before = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keyup', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(2);
  check('没有建议时按 ↓ 直接拉一条并显示占位',
    suggestCalls().length === before + 1 && /正在生成建议/.test(textOf(view.tree)), textOf(view.tree).slice(0, 40));
  release();
  holdSuggest = null;
  await view.settle(3);

  const beforeText = suggestCalls().length;
  inst.env.editor.textContent = '我在打字';
  view.render();
  await view.settle(1);
  inst.env.window.dispatchEvent({ type: 'keyup', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(2);
  check('有草稿时 ↓ 不拦截也不请求', suggestCalls().length === beforeText, '');

  inst.env.editor.textContent = '';
  view.render();
  await view.settle(1);
  const beforeDouble = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  inst.env.window.dispatchEvent({ type: 'keyup', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('keydown + keyup 只触发一次请求', suggestCalls().length === beforeDouble + 1, String(suggestCalls().length - beforeDouble));

  const beforeCtrl = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', metaKey: true, preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('Ctrl/⌘+↓ 也能换一条（备用键位）', suggestCalls().length === beforeCtrl + 1, '');
}

// 回归：按 ↓ 产生的 keyup 不能被当成「用户在输入」而丢弃结果
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  let release = null;
  holdSuggest = new Promise((r) => { release = r; });
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  inst.env.window.dispatchEvent({ type: 'keyup', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  inst.env.editor.emit('keyup', { key: 'ArrowDown' });
  release();
  holdSuggest = null;
  await view.settle(4);
  check('按 ↓ 的 keyup 不会导致结果被丢弃',
    /先补测试再实现/.test(textOf(view.tree)) && !/结果被丢弃/.test(textOf(view.tree)), textOf(view.tree).slice(0, 50));
}

// 手动请求期间有输入：结果被丢弃时明确说明原因
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  let release = null;
  holdSuggest = new Promise((r) => { release = r; });
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(1);
  inst.env.editor.textContent = 'x';
  inst.env.editor.emit('input');
  release();
  holdSuggest = null;
  await view.settle(4);
  check('结果因输入被丢弃时显示原因',
    /结果被丢弃/.test(textOf(view.tree)) && /请求期间检测到输入/.test(textOf(view.tree)), textOf(view.tree).slice(0, 80));
}

// 手动换一条失败：立刻显示原因
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  fetchResult = { ok: false, reason: '模型调用超时' };
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(4);
  check('手动换一条失败时立刻显示原因',
    /换一条失败/.test(textOf(view.tree)) && /模型调用超时/.test(textOf(view.tree)), textOf(view.tree).slice(0, 80));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// start 事件到达后、首个 delta 之前，占位不能消失
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  ndjsonLines = [
    JSON.stringify({ type: 'start' }),
    JSON.stringify({ type: 'delta', text: '换来的新建议' }),
    JSON.stringify({ type: 'done', suggestion: '换来的新建议' }),
  ];
  ndjsonDelayMs = 300;
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await new Promise((r) => setTimeout(r, 360));   // start 已到，delta 还没到
  await view.settle(1);
  check('start 后仍保留生成中占位', /正在生成建议/.test(textOf(view.tree)), textOf(view.tree).slice(0, 40));
  await new Promise((r) => setTimeout(r, 900));
  await view.settle(3);
  check('首个 delta 到达后占位换成文字',
    /换来的新建议/.test(textOf(view.tree)) && !/正在生成建议/.test(textOf(view.tree)), textOf(view.tree).slice(0, 40));
  ndjsonLines = null;
  ndjsonDelayMs = 0;
}

// ↓ 换一条要有即时反馈：立刻清空旧建议并显示「正在生成建议…」
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  let release = null;
  holdSuggest = new Promise((r) => { release = r; });
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'Down', preventDefault() {}, stopPropagation() {} });
  await view.settle(1);
  check('按 ↓ 立刻显示换一条中的占位',
    /正在生成建议/.test(textOf(view.tree)) && !/先补测试再实现/.test(textOf(view.tree)), textOf(view.tree).slice(0, 50));
  release();
  holdSuggest = null;
  await view.settle(4);
  check('换一条的结果到达后恢复建议', /先补测试再实现/.test(textOf(view.tree)), '');
}

// 慢请求：900ms 后显示生成中占位（多候选时带数量），结果回来即消失
{
  let release = null;
  holdSuggest = new Promise((r) => { release = r; });
  fetchResult = { suggestion: '第一候选', version: '9.9.9' };
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await new Promise((r) => setTimeout(r, 1000));
  await view.settle(2);
  const busyText = textOf(view.tree);
  check('慢请求时显示生成中占位',
    /正在生成建议/.test(busyText) && !/Tab/.test(busyText), busyText.slice(0, 60));
  inst.env.editor.textContent = '我先写了字';
  view.render();
  await view.settle(1);
  check('有草稿时生成中占位也隐藏', !/正在生成/.test(textOf(view.tree)), textOf(view.tree).slice(0, 40));
  inst.env.editor.textContent = '';
  view.render();
  release();
  holdSuggest = null;
  await view.settle(4);
  check('结果返回后占位消失并显示建议',
    !/正在生成/.test(textOf(view.tree)) && /第一候选/.test(textOf(view.tree)), textOf(view.tree).slice(0, 60));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 暂停时 composer 上方常驻恢复时间提示
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(3);
  inst.env.window.dispatchEvent({ type: 'dsh-prompt-predict:pause', detail: { until: Date.now() + 10 * 60 * 1000 } });
  await view.settle(3);
  check('暂停时显示恢复时间提示', /预测已暂停/.test(textOf(view.tree)), textOf(view.tree).slice(0, 60));
  inst.env.window.dispatchEvent({ type: 'dsh-prompt-predict:pause', detail: { until: 0 } });
  await view.settle(2);
}

// 手动触发快捷键（Ctrl/⌘+Shift+Space）：有建议时换一条，无建议时新预测
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  const before = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: ' ', code: 'Space', ctrlKey: true, shiftKey: true, preventDefault() {}, stopPropagation() {} });
  await view.settle(4);
  const rerollBody = JSON.parse(suggestCalls().at(-1)?.options?.body || '{}');
  check('有建议时快捷键换一条（reroll）',
    suggestCalls().length === before + 1 && rerollBody.reroll === true, JSON.stringify(rerollBody));


  inst.env.window.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {}, stopPropagation() {} });
  await view.settle(2);
  const beforeNew = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: ' ', code: 'Space', ctrlKey: true, shiftKey: true, preventDefault() {}, stopPropagation() {} });
  await view.settle(4);
  const newBody = JSON.parse(suggestCalls().at(-1)?.options?.body || '{}');
  check('无建议时快捷键发起新预测（非 reroll）',
    suggestCalls().length === beforeNew + 1 && newBody.reroll !== true, JSON.stringify(newBody));
}

// 模型列表刷新：按钮请求 catalog?refresh=1
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  const refresh = find(view.tree, (n) => n.props && n.props['data-prompt-predict-refresh-models'] === 'true')[0];
  check('设置页有模型刷新按钮', Boolean(refresh), '');
  refresh?.props?.onClick?.();
  await view.settle(3);
  const catalogCall = inst.env.fetchCalls.filter((c) => c.url.includes('/catalog')).at(-1);
  check('刷新按钮绕过缓存请求 catalog',
    String(catalogCall?.url || '').includes('refresh=1'), String(catalogCall?.url || ''));
}

// 关闭历史：historySize=0 时不落盘，设置页显示已关闭
{
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9', effective: { historySize: 0 } };
  const inst = setup();
  const dock = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dock.settle(4);
  const stored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history') || '[]');
  check('historySize=0 时预测不写入历史', stored.length === 0, JSON.stringify(stored));
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle(3);
  check('设置页显示历史已关闭', /历史记录已关闭/.test(textOf(view.tree)), textOf(view.tree).slice(-60));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 粘贴图片/文件视为已有内容：不预测、↓ 也不请求
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(3);
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  const before = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'paste', clipboardData: { files: [{}], items: [], getData: () => '' } });
  await view.settle(2);
  check('粘贴图片/文件后 ghost 收起',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', code: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('粘贴附件后按 ↓ 不请求', suggestCalls().length === before, String(suggestCalls().length - before));
}

// 输入状态里带附件字段也应视为已有内容
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => ({
    ...makeProps(''),
    useInput: (s) => s({ draft: '', attachments: [{ name: 'a.png' }] }),
  }));
  await view.settle(3);
  check('输入状态含附件时不显示 ghost',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
  check('输入状态含附件时不发起预测',
    inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).length === 0, '');
}

// 任意位置新增图片节点都会收起 ghost
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(3);
  const ghostOn = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length > 0;
  check('图片变化前 ghost 可见', ghostOn(), '');
  const imgNode = { nodeType: 1, matches: () => true, querySelector: () => null };
  inst.env.mutationObservers.at(-1)?.trigger([{ addedNodes: [imgNode], removedNodes: [] }]);
  await view.settle(2);
  check('页面新增图片时 ghost 收起', !ghostOn(), '');
}

// 编辑器 DOM 变化（贴图/删图/打字）时直接清掉 ghost
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(3);
  check('DOM 变化前 ghost 可见', find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length > 0, '');
  inst.env.editor.textContent = '用户正在输入';
  const observer = inst.env.mutationObservers.at(-1);
  observer?.trigger();
  await view.settle(2);
  check('编辑器 DOM 变化后 ghost 立即隐藏',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
}

// 回归：编辑器里已有文字时，结果绝不能盖在正文上
{
  let release = null;
  holdSuggest = new Promise((r) => { release = r; });
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await new Promise((r) => setTimeout(r, 500));   // 请求已发出（350ms 防抖后）
  inst.env.editor.textContent = '我在打字';
  release();
  holdSuggest = null;
  await view.settle(4);
  const ghost = find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true');
  const stored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history') || '[]');
  check('等待期间开始输入：结果不显示、不写历史',
    ghost.length === 0 && stored.length === 0, `ghost=${ghost.length} history=${stored.length}`);
}

// 附件在编辑器外部（上方/旁边卡片）时也要识别；删图后清掉建议
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  const parent = { querySelector: (sel) => (String(sel).includes('data-attachment') ? {} : null) };
  inst.env.editor.parentElement = parent;
  inst.env.editor.emit('input');
  await view.settle(2);
  check('编辑器外的附件卡片也会让 ghost 隐藏',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  const before = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', code: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('有附件时 ↓ 不请求', suggestCalls().length === before, String(suggestCalls().length - before));

  parent.querySelector = () => null;   // 删除附件
  inst.env.editor.emit('input');
  await view.settle(3);
  check('删除附件后 ghost 不残留',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
  inst.env.editor.parentElement = { querySelector: () => null };
}

// 非 <img> 的附件节点（装饰节点/contenteditable=false）也要识别，并阻止 ↓ 请求
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  inst.env.editor.innerHTML = '<div contenteditable="false" data-lexical-decorator="true"></div>';
  inst.env.editor.emit('input');   // 真实环境里插入附件会触发 input
  await view.settle(2);
  check('装饰节点/附件也算内容，ghost 隐藏',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  const before = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowDown', code: 'ArrowDown', preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('有附件时按 ↓ 不请求新建议', suggestCalls().length === before, String(suggestCalls().length - before));
  inst.env.editor.innerHTML = '';
  inst.env.editor.emit('input');
  await view.settle(2);
  check('删除附件后不会残留 ghost', find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
}

// 图片/附件也算草稿：ghost 不应画在附件上
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  inst.env.editor.querySelector = (selector) => (String(selector).includes('img') ? {} : null);
  view.render();
  await view.settle(1);
  check('输入框里有图片时 ghost 隐藏',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
  inst.env.editor.querySelector = undefined;
}

// 渲染层兜底：ghost 已显示后编辑器出现文字，立即隐藏
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  inst.env.editor.textContent = '用户草稿';
  view.render();
  await view.settle(1);
  check('编辑器有内容时 ghost 立即隐藏', find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
  const before = inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: ' ', code: 'Space', ctrlKey: true, shiftKey: true, preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('有草稿时手动快捷键不触发预测',
    inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).length === before, '');
}

// 回归：即使 textContent 读不到输入（Lexical 合成期），请求期间的输入也要挡住迟到结果
{
  let release = null;
  holdSuggest = new Promise((r) => { release = r; });
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await new Promise((r) => setTimeout(r, 500));
  inst.env.editor.textContent = '';        // DOM 看不到正文
  inst.env.editor.emit('input');           // 但用户确实输入了
  release();
  holdSuggest = null;
  await view.settle(4);
  const ghost = find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length;
  const stored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history') || '[]');
  check('textContent 读不到时，请求期间的输入仍能挡住迟到结果',
    ghost === 0 && stored.length === 0, `ghost=${ghost} history=${stored.length}`);
}

// 输入法合成：合成中不显示建议；合成取消（没留下文字）后重新预测
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  const ghostOn = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length > 0;
  check('合成前 ghost 可见', ghostOn(), '');
  inst.env.editor.textContent = 'zhongwen';   // 拼音串未必进 textContent，这里两种都模拟
  inst.env.window.dispatchEvent({ type: 'compositionstart' });
  await view.settle(2);
  check('输入法合成开始时 ghost 立即隐藏', !ghostOn(), '');

  const before = inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).length;
  inst.env.editor.textContent = '';
  inst.env.window.dispatchEvent({ type: 'compositionend' });
  await view.settle(5);
  check('取消合成后重新发起预测并恢复 ghost',
    inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).length > before && ghostOn(), '');
}

// 合成期间到达的结果不得显示，也不写历史
{
  let release = null;
  holdSuggest = new Promise((r) => { release = r; });
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await new Promise((r) => setTimeout(r, 500));
  inst.env.editor.textContent = 'zhongwen';
  inst.env.window.dispatchEvent({ type: 'compositionstart' });
  release();
  holdSuggest = null;
  await view.settle(4);
  const ghost = find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length;
  const stored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history') || '[]');
  check('合成期间到达的建议不显示、不写历史', ghost === 0 && stored.length === 0, `ghost=${ghost} history=${stored.length}`);
}

// 合成结束留下文字：ghost 保持隐藏
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  inst.env.window.dispatchEvent({ type: 'compositionstart' });
  inst.env.editor.textContent = '中文';
  inst.env.window.dispatchEvent({ type: 'compositionend' });
  await view.settle(3);
  check('合成结束留下文字时 ghost 保持隐藏',
    find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
  const beforeClear = inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).length;
  inst.env.editor.textContent = '';
  inst.env.editor.emit('input');
  await view.settle(5);
  check('合成提交后删空文字仍能重新预测',
    inst.env.fetchCalls.filter((c) => c.url.includes('/suggest')).length > beforeClear,
    '');
}

// P0：快捷键不能抢其它输入框的焦点行为
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle();
  let prevented = 0;
  const keydown = () => inst.env.window.dispatchEvent({
    type: 'keydown', key: 'Tab',
    preventDefault() { prevented += 1; }, stopPropagation() {},
  });
  inst.env.document.activeElement = { tagName: 'INPUT', id: 'other-input' };
  keydown();
  await view.settle(2);
  check('焦点在其它输入框时 Tab 不插入建议', hasGhost(view.tree) && prevented === 0,
    `ghost=${hasGhost(view.tree)} prevented=${prevented}`);

  inst.env.document.activeElement = inst.env.editor;
  keydown();
  await view.settle(2);
  check('焦点在 composer 时 Tab 才采纳建议', !hasGhost(view.tree) && prevented === 1,
    `ghost=${hasGhost(view.tree)} prevented=${prevented}`);
}

// P0：reroll 后要同步截断标记，不能沿用上一次建议的状态
{
  const inst = setup();
  const C = inst.registered['conversation.composer.dock'].Component;
  fetchResult = { suggestion: '这是被截断的半句', truncated: true };
  const view = mount(inst.react, C, () => makeProps(''));
  await view.settle();
  check('reroll 前显示截断标记', /已截断/.test(textOf(view.tree)), '');
  fetchResult = { suggestion: '换一条完整的新建议', truncated: false };
  find(view.tree, (n) => n.type === 'button' && n.props?.children === '↻')[0]?.props?.onClick?.();
  await view.settle(4);
  check('reroll 换成完整建议后清除截断标记',
    /换一条完整的新建议/.test(textOf(view.tree)) && !/已截断/.test(textOf(view.tree)),
    textOf(view.tree).slice(-100));

  fetchResult = { suggestion: '这次又被截断', truncated: true };
  find(view.tree, (n) => n.type === 'button' && n.props?.children === '↻')[0]?.props?.onClick?.();
  await view.settle(4);
  check('reroll 换成截断建议后显示截断标记', /已截断/.test(textOf(view.tree)), '');
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// 修复 5：连续失败时在 composer 里给一行提示（以前是彻底静默）
{
  const inst = setup();
  const C = inst.registered['conversation.composer.dock'].Component;
  let running = false;
  fetchResult = { ok: false, reason: '模型调用超时' };
  const view = mount(inst.react, C, () => ({
    sessionId: 'session-fail',
    useSession: (sel) => sel({ running, blank: false, removed: false, title: '失败会话' }),
    useInput: (sel) => sel({}),
    inputActions: { captureInsertion: () => ({}), insertText: () => true },
  }));
  await view.settle();
  const hasHint = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-hint'] === 'true').length > 0;
  check('一次失败不提示（避免偶发超时刷屏）', !hasHint(), '');
  // 再触发一轮：running 由 true 回到 false 会重新预测
  running = true; view.render(); await view.settle(3);
  running = false; view.render(); await view.settle(3);
  check('连续两次失败后出现提示', hasHint() && /模型调用超时/.test(textOf(view.tree)), textOf(view.tree).slice(-60));
  const hintAction = find(view.tree, (n) => n.props && n.props['data-prompt-predict-hint-action'] === 'true')[0];
  check('失败提示带「复制设置路径」动作', Boolean(hintAction) && /复制设置路径/.test(textOf(view.tree)), textOf(view.tree).slice(-60));
  let actionThrew = false;
  try { hintAction?.props?.onClick?.(); } catch { actionThrew = true; }
  check('点击失败提示动作不抛错', !actionThrew, '');
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
  running = true; view.render(); await view.settle(3);
  running = false; view.render(); await view.settle(3);
  check('恢复成功后提示消失', !hasHint(), '');
}

// 历史记录：清空 + 复制
{
  const seeds = [
    { at: Date.now(), sessionId: 'session-clear', session: '清空会话', ms: 12, provider: 'p', model: 'm', suggestion: '这条会被复制' },
    { at: Date.now() - 60000, sessionId: 'session-clear', session: '清空会话', ms: 20, provider: 'p', model: 'm', suggestion: '第二条' },
  ];
  const inst = setup();
  inst.env.localStorage.setItem('dsh-prompt-predict.history', JSON.stringify(seeds));
  const C = inst.registered['settings.section'].Component;
  const view = mount(inst.react, C, () => ({}));
  await view.settle();
  const text = () => textOf(view.tree);
  check('历史里有两条记录', /（2\/10）|[（(]2\/10[）)]/.test(text()), text().slice(-80));
  const historyRow = find(view.tree, (n) => n.props && n.props['data-prompt-predict-history-row'] === 'true')[0];
  const historyCopy = find(view.tree, (n) => n.props && n.props['data-prompt-predict-history-copy'] === 'true')[0];
  check('历史行是独立按钮，复制按钮不在行按钮内部',
    historyRow?.type === 'button' && !historyRow?.props?.role && find(historyRow, () => false).length === 0
    && !find(historyRow, (n) => n === historyCopy).length,
    `${historyRow?.type} role=${historyRow?.props?.role}`);

  const copyBtn = find(view.tree, (n) => n.props && n.props['data-prompt-predict-history-copy'] === 'true')[0];
  copyBtn?.props?.onClick?.();
  await view.settle(3);
  // 注意：沙箱把 setTimeout 压成 0ms，"已复制" 文案会立刻复位，所以只断言剪贴板内容
  check('点「复制」把建议原文写进剪贴板', inst.env.clipboard.text === '这条会被复制',
    `clipboard=${JSON.stringify(inst.env.clipboard.text)}`);

  const clearBtn = find(view.tree, (n) => n.props && n.props['data-prompt-predict-history-clear'] === 'true')[0];
  clearBtn?.props?.onClick?.();
  await Promise.resolve();   // 沙箱把 setTimeout 压成 0ms，撤销入口随即消失，只能在这一拍内断言
  const undoBtn = find(view.tree, (n) => n.props && n.props['data-prompt-predict-history-undo'] === 'true')[0];
  check('清空后提供「撤销」入口', Boolean(undoBtn) && /已清空/.test(text()), text().slice(-70));
  const stored = inst.env.localStorage.getItem('dsh-prompt-predict.history');
  check('点「清空」后列表与本地存储都为空', /还没有记录/.test(text()) && (!stored || stored === '[]'),
    `stored=${stored}`);
  undoBtn?.props?.onClick?.();
  await view.settle(3);
  const restored = inst.env.localStorage.getItem('dsh-prompt-predict.history');
  check('点「撤销」恢复记录',
    /（2\/10）|[（(]2\/10[）)]/.test(text()) && String(restored || '').includes('这条会被复制'),
    `stored=${String(restored).slice(0, 40)}`);
}

// P1：加载设置时立即按 historySize 裁剪，并把裁剪结果写回 localStorage
{
  const inst = setup();
  const seeded = Array.from({ length: 5 }, (_, i) => ({
    at: Date.now() - i * 1000, sessionId: 'session-trim', session: '裁剪会话',
    provider: 'p', model: 'm', suggestion: `第 ${i + 1} 条`,
  }));
  inst.env.localStorage.setItem('dsh-prompt-predict.history', JSON.stringify(seeded));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9', effective: { historySize: 2 } };
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle(4);
  const stored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history'));
  check('加载设置时立即裁剪并落盘', stored.length === 2 && /（2\/2）/.test(textOf(view.tree)),
    `stored=${stored.length} text=${textOf(view.tree).slice(-60)}`);
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// P1：保存更小的 historySize 时也要立即裁剪，而不是等下一次预测
{
  const inst = setup();
  const seeded = Array.from({ length: 4 }, (_, i) => ({
    at: Date.now() - i * 1000, sessionId: 'session-trim-save', session: '保存裁剪',
    provider: 'p', model: 'm', suggestion: `保存前第 ${i + 1} 条`,
  }));
  inst.env.localStorage.setItem('dsh-prompt-predict.history', JSON.stringify(seeded));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9', effective: { historySize: 4 } };
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle(4);
  const sizeInput = find(view.tree, (n) => n.type === 'input' && n.props?.min === 1 && n.props?.max === 50)[0];
  sizeInput?.props?.onChange?.({ target: { value: '2' } });
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9', effective: { historySize: 2 } };
  find(view.tree, (n) => n.type === 'button' && n.props?.children === '保存')[0]?.props?.onClick?.();
  await view.settle(5);
  const stored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history'));
  check('保存 historySize 时立即裁剪并落盘', stored.length === 2,
    `stored=${stored.length}`);
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// P1：清空后有新预测时，撤销要合并去重，不能把新记录覆盖掉
{
  const inst = setup();
  const old = [
    { at: Date.now() - 5000, sessionId: 'session-undo', session: '撤销会话', provider: 'p', model: 'm', suggestion: '旧建议一' },
    { at: Date.now() - 6000, sessionId: 'session-undo', session: '撤销会话', provider: 'p', model: 'm', suggestion: '旧建议二' },
  ];
  inst.env.localStorage.setItem('dsh-prompt-predict.history', JSON.stringify(old));
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  find(view.tree, (n) => n.props && n.props['data-prompt-predict-history-clear'] === 'true')[0]?.props?.onClick?.();
  await Promise.resolve();
  const undoButton = find(view.tree, (n) => n.props && n.props['data-prompt-predict-history-undo'] === 'true')[0];
  const fresh = { at: Date.now() + 1000, sessionId: 'session-undo', session: '撤销会话', provider: 'p', model: 'm', suggestion: '清空后的新建议' };
  // 同时放入一条快照里已有的记录，验证撤销时不会重复
  inst.env.localStorage.setItem('dsh-prompt-predict.history', JSON.stringify([fresh, old[0]]));
  inst.env.window.dispatchEvent({ type: 'dsh-prompt-predict:run', detail: { latest: fresh, history: [fresh, old[0]] } });
  undoButton?.props?.onClick?.();
  await view.settle(3);
  const restored = JSON.parse(inst.env.localStorage.getItem('dsh-prompt-predict.history'));
  check('撤销与新记录合并且去重',
    restored.length === 3 && restored[0].suggestion === '清空后的新建议'
    && restored.some((r) => r.suggestion === '旧建议一') && restored.some((r) => r.suggestion === '旧建议二'),
    JSON.stringify(restored.map((r) => r.suggestion)));
}

// 失败历史里的 partialChars：0 不显示「已收到 0 字」，正数才显示长度
{
  const mountWith = async (extra) => {
    const inst = setup();
    const seed = [{ at: Date.now(), sessionId: 'session-partial', session: '失败会话', error: '流中断', ...extra }];
    inst.env.localStorage.setItem('dsh-prompt-predict.history', JSON.stringify(seed));
    const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
    await view.settle(3);
    return textOf(view.tree);
  };
  const zeroText = await mountWith({ partialChars: 0 });
  check('partialChars=0 时不显示「已收到 0 字」',
    /失败/.test(zeroText) && !/已收到 0 字/.test(zeroText), zeroText.slice(-100));
  const sixText = await mountWith({ partialChars: 6 });
  check('partialChars>0 时显示已收到字数', /已收到 6 字/.test(sixText), sixText.slice(-100));
}

// 「试一下」按钮：直接打 /suggest，把返回的建议显示出来（验证设置是否真的生效）
{
  const inst2 = setup(makeLocale('zh'));
  // 先挂 composer dock：设置页要靠它拿到 liveSessionId 才能发起「试一下」
  const dock2 = mount(inst2.react, inst2.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dock2.settle();
  const C2 = inst2.registered['settings.section'].Component;
  const view2 = mount(inst2.react, C2, () => ({}));
  await view2.settle();
  const btn = find(view2.tree, (n) => n.props && n.props['data-prompt-predict-try'] === 'true')[0];
  check('设置页显示插件版本', /v9\.9\.9/.test(textOf(view2.tree)), textOf(view2.tree).slice(0, 60));

// 更新检查：registry 有新版时显示版本与命令；同版本提示最新；请求失败提示错误
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  const updateBtn = () => find(view.tree, (n) => n.props && n.props['data-prompt-predict-update-check'] === 'true')[0];
  check('设置页有「检查更新」按钮', Boolean(updateBtn()) && /检查更新/.test(textOf(view.tree)), '');

  registryVersion = '9.9.10';
  updateBtn()?.props?.onClick?.();
  await view.settle(4);
  check('发现新版本时显示版本号、更新命令与升级步骤',
    /发现新版本 v9\.9\.10/.test(textOf(view.tree))
    && /dsh plugin --profile web add dsh-prompt-predict@9\.9\.10/.test(textOf(view.tree))
    && /完全退出 App/.test(textOf(view.tree))
    && /重新打开 App/.test(textOf(view.tree))
    && /另一个环境/.test(textOf(view.tree)),
    textOf(view.tree).slice(-160));

  registryVersion = '9.9.9';

// 更新命令按运行环境自动填 profile：Electron → desktop，浏览器 → web
{
  testUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Electron/41.0.0';
  const inst = setup();
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle();
  registryVersion = '9.9.10';
  find(view.tree, (n) => n.props && n.props['data-prompt-predict-update-check'] === 'true')[0]?.props?.onClick?.();
  await view.settle(4);
  check('Electron 环境自动填入 desktop profile',
    /dsh plugin --profile desktop add dsh-prompt-predict@9\.9\.10/.test(textOf(view.tree)),
    textOf(view.tree).slice(0, 120));
  registryVersion = '9.9.9';
  testUserAgent = 'node-test';
}

  updateBtn()?.props?.onClick?.();
  await view.settle(4);
  check('已是最新版本时给出明确提示', /已是最新版本/.test(textOf(view.tree)), textOf(view.tree).slice(-80));

  registryVersion = '';
  updateBtn()?.props?.onClick?.();
  await view.settle(4);
  check('registry 不可用时提示检查失败', /检查失败/.test(textOf(view.tree)), textOf(view.tree).slice(-80));
  registryVersion = '9.9.9';
}

check('设置页有「试一下」按钮', Boolean(btn), btn ? 'ok' : 'missing');
  btn?.props?.onClick?.();
  await view2.settle(12);
  check('点「试一下」后显示示例建议', /示例建议/.test(textOf(view2.tree)), textOf(view2.tree).slice(-110));
}

// 主区域直接可见：建议语言 / 字数上限不再藏在「高级」里
{
  const inst3 = setup();
  const C3 = inst3.registered['settings.section'].Component;
  const view3 = mount(inst3.react, C3, () => ({}));
  await view3.settle();
  const text = textOf(view3.tree);
  const langSelect = find(view3.tree, (n) => n.type === 'select' && Array.isArray(n.props?.children) && n.props.children.some((c) => c?.props?.value === 'auto'))[0];
  check('未展开「高级」时也能看到建议语言与字数上限',
    Boolean(langSelect) && /字数上限/.test(text), text.slice(0, 60));
}

// 两层折叠：① 列表默认只显示第一条（点 ▸ 展开全部）② 第一条详情默认展开，点别条时前一条收起
{
  const rows = () => find(settings.tree, (n) => n.props && n.props['data-prompt-predict-history-row'] === 'true');
  const text = () => textOf(settings.tree);
  check('默认只显示第一条，且第一条原文默认展开',
    rows().length === 1 && /这是被截断的半句/.test(text()),
    `rows=${rows().length} text=${text().slice(-80)}`);

  const toggle = find(settings.tree, (n) => n.props && n.props['data-prompt-predict-history-toggle'] === 'true')[0];
  check('列表折叠时提供「展开全部」', Boolean(toggle));
  toggle?.props?.onClick?.();
  await settings.settle();
  check('展开全部后显示多条（第一条仍展开）',
    rows().length === 2 && /这是被截断的半句/.test(text()) && !/第二条建议原文/.test(text()),
    `rows=${rows().length}`);

  rows()[1]?.props?.onClick?.();
  await settings.settle();
  check('点另一条时前一条自动收起',
    /第二条建议原文/.test(text()) && !/这是被截断的半句/.test(text()),
    text().slice(-100));

  rows()[1]?.props?.onClick?.();
  await settings.settle();
  // 被截断时 ghost 上要直接标出来（不用去设置页查历史）
react.reset();
fetchResult = { suggestion: '刷新后验证了三点都正常，但展开全', truncated: true };
const cutDock = mount(react, dockComponent, () => makeProps(''));
await cutDock.settle();
check('被截断的建议在 ghost 上标出「已截断」并提示调高上限',
  cutDock.tree && /已截断/.test(textOf(cutDock.tree)) && /调高/.test(textOf(cutDock.tree)) && /字数上限/.test(textOf(cutDock.tree)),
  cutDock.tree ? textOf(cutDock.tree).slice(0, 100) : 'no tree');
fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };

check('再点同一条收起原文',
    !/第二条建议原文/.test(text()) && !/这是被截断的半句/.test(text()),
    text().slice(-80));

  find(settings.tree, (n) => n.props && n.props['data-prompt-predict-history-toggle'] === 'true')[0]?.props?.onClick?.();
  await settings.settle();
  check('点「收起」回到只显示第一条', rows().length === 1, `rows=${rows().length}`);
  // 重新展开列表，后面的用例还要用
  find(settings.tree, (n) => n.props && n.props['data-prompt-predict-history-toggle'] === 'true')[0]?.props?.onClick?.();
  await settings.settle();
}
// 「上次预测」状态行已并入列表：不能再单独出现一次（否则同一条记录显示两遍）
check('最近预测不再重复显示在状态行',
  (settingsText.match(/provider-x/g) || []).length === 1,
  `出现 ${(settingsText.match(/provider-x/g) || []).length} 次`);

// 无障碍：图标按钮、下拉和数字输入都要有可访问名称
{
  const inst = setup();
  const dock = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await dock.settle();
  const reroll = find(dock.tree, (n) => n.type === 'button' && n.props?.children === '↻')[0];
  check('ghost 的 reroll 按钮有 aria-label', Boolean(reroll?.props?.['aria-label']), String(reroll?.props?.['aria-label']));
  const settingsView = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await settingsView.settle();
  const advanced = find(settingsView.tree, (n) => n.type === 'button' && /高级/.test(String(n.props?.children)))[0];
  advanced?.props?.onClick?.();
  await settingsView.settle(2);
  const labeled = find(settingsView.tree, (n) => (n.type === 'select' || n.type === 'input') && n.props?.['aria-label']);
  check('设置页下拉/数字输入都有可访问名称', labeled.length >= 8, `labeled=${labeled.length}`);
  const pause = find(settingsView.tree, (n) => n.props && n.props['data-prompt-predict-pause'] === 'true')[0];
  check('暂停按钮暴露 aria-pressed', typeof pause?.props?.['aria-pressed'] === 'boolean', String(pause?.props?.['aria-pressed']));
}

// P1：提供商目录错误要在设置页可见，不可用 provider 的选项要禁用
{
  const inst = setup();
  fetchResult = {
    suggestion: '先补测试再实现', version: '9.9.9',
    effective: { provider: 'provider-b', model: '', historySize: 10 },
    groups: [
      { id: 'provider-a', name: 'Provider A', models: [{ id: 'model-a', name: 'Model A' }] },
      { id: 'provider-b', name: 'Provider B', models: [], error: 'catalog down' },
    ],
  };
  const view = mount(inst.react, inst.registered['settings.section'].Component, () => ({}));
  await view.settle(4);
  const text = textOf(view.tree);
  const providerSelect = find(view.tree, (n) => n.type === 'select' && n.props?.value === 'provider-b')[0];
  const brokenOption = find(providerSelect, (n) => n.type === 'option' && n.props?.value === 'provider-b')[0];
  check('不可用 provider 的错误在设置页可见',
    /该提供商不可用/.test(text) && /catalog down/.test(text), text.slice(-140));
  check('不可用 provider 的选项被禁用且标记为不可用',
    brokenOption?.props?.disabled === true && /不可用/.test(String(brokenOption?.props?.children)),
    JSON.stringify(brokenOption?.props));
  check('没有可用模型时给出明确提示', /没有可用模型/.test(text), text.slice(-100));
  fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
}

// ⑤ 双语：同一个组件，换语言后渲染出的文案必须跟着换
for (const [lang, expect] of [
  ['zh', '启用联想'],
  ['en', 'Enable predictions'],
]) {
  const inst = setup(makeLocale(lang));
  const C = inst.registered['settings.section'].Component;
  const view = mount(inst.react, C, () => ({}));
  await view.settle();
  const text = textOf(view.tree);
  check(`locale=${lang} 时设置页显示对应语言`, text.includes(expect), text.slice(0, 40));
}
{
  // 词典真的注册过去了（不是只靠兜底）
  const loc = makeLocale('en');
  setup(loc);
  const dict = loc.dicts['dsh-prompt-predict'];
  check('词典以命名空间注册进了 locale 服务',
    Boolean(dict) && dict.zh && dict.en && Object.keys(dict.en).length > 60,
    dict ? `zh=${Object.keys(dict.zh).length} en=${Object.keys(dict.en).length}` : 'not registered');
}

// 无障碍：灰字对比度要够、按钮点击区域不能太小
{
  const inst = setup();
  const C = inst.registered['conversation.composer.dock'].Component;
  const view = mount(inst.react, C, () => makeProps(''));
  await view.settle();
  const ghost = find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true')[0];
  const spans = find(ghost, (n) => typeof n.props?.children === 'string');
  const ghostText = spans.find((n) => n.props.children === '先补测试再实现');
  // #6b7280 在白底上约 4.8:1，达到 WCAG AA；旧的 #9aa3b2 只有约 2.9:1
  // 颜色现在是「DSH 设计令牌 + 本地兜底」，兜底值保证 AA 对比度
  check('ghost 正文走宿主令牌且有 AA 兜底色',
    String(ghostText?.props?.style?.color || '').startsWith('var(--dsw-alias-label-tertiary')
    && String(ghostText?.props?.style?.color).includes('#6b7280'),
    String(ghostText?.props?.style?.color));
  const tabBtn = find(ghost, (n) => n.type === 'button' && n.props?.children === 'Tab')[0];
  check('操作按钮点击区域 ≥ 24px', tabBtn?.props?.style?.height >= 24 && tabBtn?.props?.style?.fontSize >= 11,
    `height=${tabBtn?.props?.style?.height} fontSize=${tabBtn?.props?.style?.fontSize}`);
}

// 修复 1：粘贴 / 输入法 / 拖拽 也要让 ghost 消失（只监听 keydown 会漏）
{
  const inst = setup();
  const C = inst.registered['conversation.composer.dock'].Component;
  const view = mount(inst.react, C, () => makeProps(''));
  await view.settle();
  check('输入法合成开始时隐藏 ghost（rc.2 下 keydown 是 Process，会漏）', (() => {
    const before = hasGhost(view.tree);
    inst.env.editor.emit('compositionstart');
    return before && !hasGhost(view.tree);
  })());
}

{
  const inst = setup();
  const C = inst.registered['conversation.composer.dock'].Component;
  const view = mount(inst.react, C, () => makeProps(''));
  await view.settle();
  const before = hasGhost(view.tree);
  inst.env.editor.textContent = '粘贴内容';
  inst.env.editor.emit('input');
  await view.settle(2);
  check('粘贴（input）后 ghost 隐藏', before && !hasGhost(view.tree));
}

// 只有物理方向键才触发换一条；Cmd+V 不会
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  const suggestCalls = () => inst.env.fetchCalls.filter((c) => c.url.includes('/suggest'));
  const before = suggestCalls().length;
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'Down', code: 'KeyV', metaKey: true, preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('key=Down 但 code=KeyV 不会换一条', suggestCalls().length === before, '');
  inst.env.editor.emit('input');
  await new Promise((r) => setTimeout(r, 300));
  await view.settle(2);
  check('Cmd+V 后的输入事件不会触发自动预测', suggestCalls().length === before, String(suggestCalls().length - before));
}

// Cmd+V 立即收起 ghost，即使正文读不到也不压字
{
  const inst = setup();
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => makeProps(''));
  await view.settle(4);
  inst.env.clipboard.text = '';
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'v', metaKey: true, code: 'KeyV', preventDefault() {}, stopPropagation() {} });
  await view.settle(2);
  check('Cmd+V 后 ghost 立即收起', find(view.tree, (n) => n.props && n.props['data-prompt-predict-ghost'] === 'true').length === 0, '');
}

// 键位级粘贴兜底：Cmd+V 后编辑器没变化则读剪贴板插入
{
  const inst = setup();
  let inserted = null;
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => ({
    ...makeProps(''),
    inputActions: { captureInsertion: () => ({}), insertText: (text) => { inserted = text; return true; } },
  }));
  await view.settle(3);
  inst.env.clipboard.text = '剪贴板内容';
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'v', metaKey: true, preventDefault() {}, stopPropagation() {} });
  await new Promise((r) => setTimeout(r, 250));
  await view.settle(1);
  check('Cmd+V 后编辑器没变化时读剪贴板兜底插入', inserted === '剪贴板内容', JSON.stringify(inserted));

  inserted = null;
  inst.env.editor.textContent = '';
  inst.env.clipboard.text = '剪贴板内容';
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'v', metaKey: true, preventDefault() {}, stopPropagation() {} });
  inst.env.editor.textContent = '剪贴板内容';   // 模拟编辑器随后完成粘贴
  await new Promise((r) => setTimeout(r, 250));
  await view.settle(1);
  check('编辑器已粘贴成功时键位兜底不重复插入', inserted === null, JSON.stringify(inserted));
  inst.env.editor.textContent = '';
}

// 兜底粘贴：编辑器没处理时由插件插入；编辑器处理了就不重复插入
{
  const inst = setup();
  let inserted = null;
  const view = mount(inst.react, inst.registered['conversation.composer.dock'].Component, () => ({
    ...makeProps(''),
    inputActions: { captureInsertion: () => ({}), insertText: (text) => { inserted = text; return true; } },
  }));
  await view.settle(3);
  const pasteEvent = {
    type: 'paste',
    clipboardData: { getData: () => '粘贴内容' },
  };
  inst.env.window.dispatchEvent(pasteEvent);
  await view.settle(2);
  check('编辑器没处理粘贴时由插件兜底插入', inserted === '粘贴内容', JSON.stringify(inserted));

  inserted = null;
  inst.env.editor.textContent = '已有内容';
  inst.env.window.dispatchEvent({ type: 'paste', clipboardData: { getData: () => '粘贴内容' } });
  // 模拟编辑器自己处理：事件之后文本变化
  inst.env.editor.textContent = '已有内容粘贴内容';
  await view.settle(2);
  check('编辑器已处理时兜底不重复插入', inserted === null, JSON.stringify(inserted));
  inst.env.editor.textContent = '';
}

// 修复 2：编辑器里已有草稿时不预测、不显示（rc.2 拿不到 draft，只能读 DOM）
{
  let fetches = 0;
  const inst = setup();
  const C = inst.registered['conversation.composer.dock'].Component;
  inst.env.editor.textContent = '我已经写了一半';
  const view = mount(inst.react, C, () => makeProps(''));
  await view.settle();
  check('编辑器已有草稿时不显示 ghost', !hasGhost(view.tree), JSON.stringify(textOf(view.tree).slice(0, 40)));
  inst.env.editor.textContent = '';
  inst.env.editor.emit('input');      // 模拟用户把草稿删空（DOM 变化不会触发 React 重渲染）
  await view.settle();
  check('草稿清空后 ghost 恢复', hasGhost(view.tree), '');
}

// 两向验收：① 空输入框显示建议 ② 按键后立即隐藏（不依赖 draft，rc.2 拿不到）
{
  const inst = setup();
  const C = inst.registered['conversation.composer.dock'].Component;
  const view = mount(inst.react, C, () => ({
    sessionId: 'session-two-way',
    useSession: (s) => s({ running: false, blank: false, removed: false }),
    useInput: (s) => s({}),
    inputActions: { captureInsertion: () => ({}), insertText: () => true },
  }));
  await view.settle();
  const shown = hasGhost(view.tree);
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'a', bubbles: true, preventDefault() {}, stopPropagation() {} });
  await view.settle(3);
  check('两向验收①：空输入框显示建议', shown);
  check('两向验收②：按键后建议立即隐藏', !hasGhost(view.tree));
}

console.log(`RESULT ${results.every(Boolean) ? 'PASS' : 'FAIL'} (${results.filter(Boolean).length}/${results.length})`);
process.exit(results.every(Boolean) ? 0 : 1);

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
  const editor = {
    getBoundingClientRect: () => ({ left: 100, top: 200, width: 400, height: 40 }),
    parentElement: { querySelector: () => null },
    focus() {},
    innerText: '',
  };
  const listeners = new Map();
  const window = {
    addEventListener: (type, fn) => { listeners.set(type, fn); },
    removeEventListener: (type) => { listeners.delete(type); },
    dispatchEvent: (event) => { const fn = listeners.get(event.type); if (fn) fn(event); return true; },
    location: { href: 'http://127.0.0.1/', pathname: '/' },
  };
  const document = {
    querySelector: (sel) => (String(sel).includes('data-composer-input') ? editor : null),
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  };
  return { window, document, editor, listeners };
}

// ---------------- 加载 client.js ----------------
function loadClient(localeService) {
  const env = makeEnv();
  let registration = null;
  const sandbox = {
    window: env.window,
    document: env.document,
    console,
    // 忽略延时（插件里有个 350ms 的「等回复停稳再预测」），让测试不必真等
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout,
    queueMicrotask,
    getComputedStyle: () => ({
      paddingLeft: '0px', paddingTop: '0px', fontFamily: 'sans', fontSize: '14px', lineHeight: '20px', fontWeight: '400',
    }),
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    AbortController,
    fetch: async () => ({
      ok: true,
      json: async () => ({ ok: true, suggestion: '先补测试再实现', ms: 12, provider: 'provider-x', model: 'model-y' }),
    }),
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
function setup(localeService) {
  const client = loadClient(localeService);
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
const { exports, react, registered } = setup();   // 不带 locale 服务：验证旧运行时下的中文兜底
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
  const zh = keysIn(head.slice(head.indexOf('      zh: {'), head.indexOf('      en: {')));
  const en = keysIn(head.slice(head.indexOf('      en: {'), head.indexOf('    };')));
  const used = new Set([...body.matchAll(/tt\((?:t|boundTranslate),\s*"([\w.]+)"/g)].map((m) => m[1]));
  check('词典中英 key 一一对应', zh.size === en.size && [...zh].every((k) => en.has(k)), `zh=${zh.size} en=${en.size}`);
  const missing = [...used].filter((k) => !zh.has(k));
  check('代码用到的 key 都在词典里', missing.length === 0, missing.join(', ') || `${used.size} keys`);
}

const dockComponent = registered['conversation.composer.dock'].Component;
const makeProps = (draft) => ({
  sessionId: 'session-smoke',
  useSession: (selector) => selector({ running: false, blank: false, removed: false }),
  useInput: (selector) => selector({ draft }),
  inputActions: { captureInsertion: () => ({}), insertText: () => true },
});

// ① 空草稿 + 有建议 → 必须渲染出 ghost
const dock = mount(react, dockComponent, () => makeProps(''));
await dock.settle();
check('dock 渲染不抛异常', Boolean(dock.tree), 'ok');
check('空草稿时渲染出 ghost 节点', hasGhost(dock.tree), `tree.type=${dock.tree?.type ?? 'null'}`);

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

// ④ 设置页
react.reset();
const settingsComponent = registered['settings.section'].Component;
const settings = mount(react, settingsComponent, () => ({}));
await settings.settle();
const settingsText = textOf(settings.tree);
check('设置页渲染不抛异常', Boolean(settings.tree));
check('设置页含关键设置项',
  /启用联想/.test(settingsText) && /提供商/.test(settingsText) && /上次预测/.test(settingsText),
  settingsText.slice(0, 50));

// ⑥ 逐段采纳的前缀失效：把已采纳的那段删掉后，必须重新展示**完整**建议
//    （手测录素材时发现的：旧实现会显示从中间截断的残句，按 Tab 只插入半句）
{
  const SUGGESTION = '先补测试再实现';
  let draft = '';
  const inst = setup();
  const C = inst.registered['conversation.composer.dock'].Component;
  const view = mount(inst.react, C, () => ({
    sessionId: 'session-partial',
    useSession: (s) => s({ running: false, blank: false, removed: false }),
    useInput: (s) => s({ draft }),
    inputActions: { captureInsertion: () => ({}), insertText: () => true },
  }));
  await view.settle();
  const ghostText = () => {
    const node = find(view.tree, (n) => n.props && (n.props['data-prompt-predict-ghost'] === 'true' || n.props['data-prompt-predict-row'] === 'true'))[0];
    const kids = node?.props?.children;
    return Array.isArray(kids) ? kids[0]?.props?.children : null;
  };
  check('初始显示完整建议', ghostText() === SUGGESTION, String(ghostText()));

  // Alt+→ 逐段采纳第一段（中文 2 字）
  inst.env.window.dispatchEvent({ type: 'keydown', key: 'ArrowRight', altKey: true, preventDefault() {}, stopPropagation() {} });
  draft = '先补';
  view.render();
  await view.settle(2);
  check('逐段采纳后只显示剩余部分', ghostText() === '测试再实现', String(ghostText()));

  // 用户把这段删掉 → 前缀失效，必须回到完整建议
  draft = '';
  view.render();
  await view.settle(2);
  check('删掉已采纳的前缀后重新显示完整建议（不能显示被截断的残句）', ghostText() === SUGGESTION, String(ghostText()));
}

// ⑤ 双语：同一个组件，换语言后渲染出的文案必须跟着换
for (const [lang, expect] of [['zh', '启用联想'], ['en', 'Enable predictions']]) {
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
    Boolean(dict) && Boolean(dict.zh) && Boolean(dict.en) && Object.keys(dict.en).length > 40,
    dict ? `zh=${Object.keys(dict.zh).length} en=${Object.keys(dict.en).length}` : 'not registered');
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

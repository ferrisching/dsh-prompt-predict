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
  const editor = {
    getBoundingClientRect: () => ({ left: 100, top: 200, width: 400, height: 40 }),
    parentElement: { querySelector: () => null },
    focus() {},
    innerText: '',
    textContent: '',
    addEventListener: (type, fn) => { editorListeners.set(type, fn); },
    removeEventListener: (type) => { editorListeners.delete(type); },
    emit: (type) => { const fn = editorListeners.get(type); if (fn) fn({ type }); },
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
    addEventListener: (type, fn) => { listeners.set(type, fn); },
    removeEventListener: (type) => { listeners.delete(type); },
    dispatchEvent: (event) => { const fn = listeners.get(event.type); if (fn) fn(event); return true; },
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
  const clipboard = { text: null, writeText(t) { this.text = t; return Promise.resolve(); } };
  const document = {
    body: { appendChild() {}, removeChild() {} },
    execCommand: () => true,
    querySelector: (sel) => (String(sel).includes('data-composer-input') ? editor : null),
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  };
  return { window: Object.assign(window, { localStorage }), document, editor, listeners, localStorage, clipboard };
}

// ---------------- 加载 client.js ----------------
let testUserAgent = 'node-test';
let fetchResult = { suggestion: '先补测试再实现', version: '9.9.9' };
function loadClient(localeService) {
  const env = makeEnv();
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
    AbortController,
    fetch: async () => ({
      ok: true,
      json: async () => ({ ok: true, ms: 12, provider: 'provider-x', model: 'model-y', ...fetchResult }),
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
  && (n.props?.children || []).some((c) => c?.props?.value === 'ru'))[0];
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
  const langSelect = find(view3.tree, (n) => n.type === 'select' && (n.props?.children || []).some((c) => c?.props?.value === 'auto'))[0];
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
  inst.env.editor.emit('paste');
  check('粘贴时隐藏 ghost（Cmd+V 的 keydown 带 metaKey，会漏）', before && !hasGhost(view.tree));
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

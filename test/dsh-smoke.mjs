#!/usr/bin/env node
/**
 * 真实 DSH 冒烟测试（可选，不进入 npm test）
 *
 * 需要本机安装：
 *   - DeepSeek Harness.app（含 runtime/cli/bin/dsh）
 *   - Microsoft Edge（或设置 DSH_SMOKE_EDGE）
 *
 * 流程：临时 DSH_HOME → 建 smoke profile → 装本仓库 tgz → 启动 dsh web →
 *       启动本地 mock LLM + 无头 Edge → 用 CDP 驱动真实 composer。
 * 只使用隔离 profile，不碰用户数据和真实模型。
 */
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const DSH_CLI = process.env.DSH_SMOKE_DSH
  || '/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh';
const EDGE = process.env.DSH_SMOKE_EDGE
  || '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const KEEP = process.env.DSH_SMOKE_KEEP === '1';
const SIDEBAR = process.env.DSH_SMOKE_SIDEBAR === '1';
const tmp = mkdtempSync(join(tmpdir(), 'dsh-smoke-'));
const children = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
};

function start(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  children.push(child);
  return child;
}
function stopAll() {
  for (const child of children.reverse()) {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch {} }
  }
}
process.on('exit', stopAll);

function freePort() {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

async function waitFor(fn, { timeout = 15000, interval = 250 } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try { last = await fn(); if (last) return last; } catch (e) { last = e; }
    await sleep(interval);
  }
  throw new Error(`timeout: ${last}`);
}

// ---------- mock LLM ----------
const llmPort = await freePort();
const llmCalls = [];
let rerollCount = 0;
const llm = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let parsed = {}; try { parsed = JSON.parse(body || '{}'); } catch {}
    const text = JSON.stringify(parsed);
    const predict = /Conversation so far|Predict the user's next message|prompt-prediction/i.test(text);
    const reroll = /Give a DIFFERENT suggestion/i.test(text);
    rerollCount += reroll ? 1 : 0;
    const rerollText = rerollCount === 1 ? '换个思路：先补测试再实现' : `第${rerollCount}版建议：先补测试再实现`;
    const multiline = /MULTILINE_CODE/.test(text);
    const codeText = '```js\nfunction demo() {\n  return 42;\n}\n```';
    const answer = predict ? (multiline ? codeText : (reroll ? rerollText : '先补测试再实现')) : '已完成。';
    llmCalls.push({ predict, reroll, at: Date.now() });
    if (String(req.url).endsWith('/chat/completions')) {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
      send({ id: 'mock', object: 'chat.completion.chunk', model: 'smoke-1', choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] });
      send({ id: 'mock', object: 'chat.completion.chunk', model: 'smoke-1', choices: [{ index: 0, delta: { content: answer }, finish_reason: null }] });
      send({ id: 'mock', object: 'chat.completion.chunk', model: 'smoke-1', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 } });
      res.write('data: [DONE]\n\n'); res.end(); return;
    }
    res.writeHead(404); res.end();
  });
});
await new Promise((r) => llm.listen(llmPort, '127.0.0.1', r));

// ---------- disposable DSH profile ----------
const home = join(tmp, 'home');
execFileSync(DSH_CLI, ['--profile', 'smoke', '--from-default-profile', 'web', '--dump-config'], {
  env: { ...process.env, DSH_HOME: home }, stdio: 'ignore',
});
const packOut = execFileSync('npm', ['pack', '--pack-destination', tmp], { cwd: repo, encoding: 'utf8' });
const tgz = join(tmp, packOut.trim().split('\n').pop());
execFileSync(DSH_CLI, ['plugin', '--profile', 'smoke', 'add', tgz], {
  env: { ...process.env, DSH_HOME: home }, stdio: 'ignore',
});

if (SIDEBAR) {
  try {
    execFileSync(DSH_CLI, ['plugin', '--profile', 'smoke', 'add', 'dsh-better-sidebar@0.30.1', '--config.minimumReleaseAge=0'], {
      env: { ...process.env, DSH_HOME: home }, stdio: 'ignore',
    });
    const profilePkgPath = join(home, 'profiles', 'smoke', 'package.json');
    const profilePkg = JSON.parse(readFileSync(profilePkgPath, 'utf8'));
    profilePkg.dsh = profilePkg.dsh || {};
    profilePkg.dsh.profile = profilePkg.dsh.profile || {};
    profilePkg.dsh.profile.bundles = profilePkg.dsh.profile.bundles || [];
    if (!profilePkg.dsh.profile.bundles.includes('dsh-better-sidebar')) {
      profilePkg.dsh.profile.bundles.push('dsh-better-sidebar');
    }
    writeFileSync(profilePkgPath, JSON.stringify(profilePkg, null, 2) + '\n');
    console.log('SIDEBAR_INSTALL ok');
  } catch (error) {
    console.log('SIDEBAR_INSTALL_FAIL', String(error && error.message || error).slice(0, 300));
  }
}
writeFileSync(join(home, 'profiles', 'smoke', 'cordis.patch.yml'), `- id: agent-default-model
  config:
    provider: smoke
    model: smoke-1
- id: llm-pi-ai
  config:
    providers:
      smoke:
        displayName: Smoke
        api: openai-completions
        baseURL: http://127.0.0.1:${llmPort}/v1
        apiKeyEnv: SMOKE_API_KEY
        models:
          - id: smoke-1
            name: Smoke One
            contextWindow: 128000
            maxTokens: 4096
            input:
              - text
- id: deepseek-account
  disabled: true
- id: llm-deepseek-account
  disabled: true
`);

let output = '';
const dsh = start(DSH_CLI, ['--profile', 'smoke', '--no-open', '--port', '0'], {
  env: { ...process.env, DSH_HOME: home, SMOKE_API_KEY: 'dummy' }, cwd: tmp,
});
dsh.stdout.on('data', (c) => { output += c; });
dsh.stderr.on('data', (c) => { output += c; });
const url = await waitFor(() => {
  const m = output.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+/);
  return m && m[0];
}, { timeout: 20000 });
const port = new URL(url).port;

// ---------- headless Edge + CDP ----------
const edgePort = await freePort();
const edge = start(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${edgePort}`, `--user-data-dir=${join(tmp, 'edge')}`, 'about:blank',
]);
await waitFor(async () => (await fetch(`http://127.0.0.1:${edgePort}/json/version`)).ok, { timeout: 15000 });
const tab = await (await fetch(`http://127.0.0.1:${edgePort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (!m.id || !pending.has(m.id)) return;
  const p = pending.get(m.id); pending.delete(m.id);
  m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
});
const evalInPage = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};
const state = () => evalInPage(`(() => {
  const ed = document.querySelector('[contenteditable="true"]');
  const g = document.querySelector('[data-prompt-predict-ghost]');
  const gt = g && g.querySelector('[data-prompt-predict-text]');
  return { text: ed && ed.textContent, ghost: gt ? gt.textContent : null };
})()`);
const ghostSuggestion = () => evalInPage(`(() => {
  const g = document.querySelector('[data-prompt-predict-ghost]');
  const span = g && g.querySelector('[data-prompt-predict-text]');
  return span ? span.textContent : null;
})()`);
const pressTab = async () => {
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
    });
  }
};
const focusEditor = () => evalInPage(`document.querySelector('[contenteditable="true"]')?.focus()`);
const pressArrow = async (key, code, vk) => {
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk,
    });
  }
};

await waitFor(() => evalInPage(`!!document.querySelector('[contenteditable="true"]')`), { timeout: 20000 });
// 首次启动有「预览版说明 → 继续」引导，先关掉
await evalInPage(`(() => { const b=[...document.querySelectorAll('button')].find((x)=>x.textContent.trim()==='继续'); b?.click(); })()`);
await sleep(2000);
await waitFor(() => evalInPage(`!!document.querySelector('button[aria-label="发送消息"]')`), { timeout: 20000 });
await focusEditor();
await send('Input.insertText', { text: '跑一次真实冒烟测试' });
await evalInPage(`document.querySelector('button[aria-label="发送消息"]')?.click()`);
try {
  await waitFor(async () => {
    const s = await state();
    return s.ghost === '先补测试再实现' && s.text === '';
  }, { timeout: 20000 });
} catch (error) {
  console.log('state:', JSON.stringify(await state()));
  console.log('llmCalls:', JSON.stringify(llmCalls));
  throw error;
}
check('真实 DSH：mock LLM 回复后出现 ghost', true, '先补测试再实现');

// 窄 composer：ghost 宽度必须跟随容器收缩，不能横向溢出（issue #5）
await evalInPage(`(() => {
  const ed = document.querySelector('[contenteditable="true"]');
  const scope = ed.closest('[class*="composer"], [data-composer]') || ed.parentElement;
  window.__ppScope = scope;
  window.__ppScopeWidth = scope.style.width;
  window.__ppScopeMax = scope.style.maxWidth;
  scope.style.width = '260px';
  scope.style.maxWidth = '260px';
  window.dispatchEvent(new Event('resize'));
})()`);
await sleep(700);
const narrow = await evalInPage(`(() => {
  const g = document.querySelector('[data-prompt-predict-ghost]');
  const ed = document.querySelector('[contenteditable="true"]');
  if (!g || !ed) return null;
  const gr = g.getBoundingClientRect();
  const er = ed.getBoundingClientRect();
  return { ghostLeft: gr.left, ghostRight: gr.right, editorLeft: er.left, editorRight: er.right, width: gr.width };
})()`);
check('真实 DSH：窄 composer 中 ghost 不横向溢出',
  narrow && narrow.ghostLeft >= narrow.editorLeft - 2 && narrow.ghostRight <= narrow.editorRight + 2,
  JSON.stringify(narrow));
// 叠加祖先缩放：模拟侧边栏/UI 缩放，ghost 仍应在编辑器范围内
await evalInPage(`(() => {
  window.__ppScopeTransform = window.__ppScope.style.transform;
  window.__ppScope.style.transformOrigin = 'top left';
  window.__ppScope.style.transform = 'scale(0.8)';
  window.dispatchEvent(new Event('resize'));
})()`);
await sleep(700);
const scaled = await evalInPage(`(() => {
  const g = document.querySelector('[data-prompt-predict-ghost]');
  const ed = document.querySelector('[contenteditable="true"]');
  if (!g || !ed) return null;
  const gr = g.getBoundingClientRect();
  const er = ed.getBoundingClientRect();
  return { ghostLeft: gr.left, ghostRight: gr.right, editorLeft: er.left, editorRight: er.right, width: gr.width };
})()`);
check('真实 DSH：缩放 + 窄容器中 ghost 不溢出',
  scaled && scaled.ghostLeft >= scaled.editorLeft - 3 && scaled.ghostRight <= scaled.editorRight + 3,
  JSON.stringify(scaled));
await evalInPage(`(() => {
  window.__ppScope.style.transform = window.__ppScopeTransform || '';
})()`);
await sleep(300);
await evalInPage(`(() => {
  window.__ppScope.style.width = window.__ppScopeWidth;
  window.__ppScope.style.maxWidth = window.__ppScopeMax;
  window.dispatchEvent(new Event('resize'));
})()`);
await sleep(500);


// 几何矩阵：不同宽度/缩放、连续 resize、以及页面存在诱饵 composer
const ghostBounds = () => evalInPage(`(() => {
  const g = document.querySelector('[data-prompt-predict-ghost]');
  const ed = document.querySelector('[contenteditable="true"]');
  if (!g || !ed) return null;
  const gr = g.getBoundingClientRect();
  const er = ed.getBoundingClientRect();
  return { ghostLeft: gr.left, ghostRight: gr.right, editorLeft: er.left, editorRight: er.right, width: gr.width, height: gr.height };
})()`);
const withinEditor = (m, tolerance = 4) =>
  Boolean(m && m.ghostLeft >= m.editorLeft - tolerance && m.ghostRight <= m.editorRight + tolerance);

for (const scenario of [
  { width: '260px', scale: 1.25 },
  { width: '180px', scale: 1.5 },
  { width: '600px', scale: 1 },
  { width: '220px', scale: 1 },
]) {
  await evalInPage(`(() => {
    const scope = window.__ppScope;
    scope.style.transformOrigin = 'top left';
    scope.style.transform = ${JSON.stringify(`scale(${scenario.scale})`)};
    scope.style.width = ${JSON.stringify(scenario.width)};
    scope.style.maxWidth = ${JSON.stringify(scenario.width)};
    window.dispatchEvent(new Event('resize'));
  })()`);
  await sleep(650);
  const m = await ghostBounds();
  check(`真实 DSH：宽度 ${scenario.width} + scale(${scenario.scale}) 中 ghost 不溢出`,
    withinEditor(m), JSON.stringify(m));
}

// 页面插入一个位于最左侧的诱饵 composer；ghost 必须仍跟随自己的 composer
await evalInPage(`(() => {
  const decoy = document.createElement('div');
  decoy.id = 'pp-decoy-composer';
  decoy.setAttribute('data-composer-input', 'true');
  decoy.setAttribute('contenteditable', 'true');
  decoy.style.cssText = 'position:fixed;left:0;top:0;width:160px;height:32px;opacity:0;pointer-events:none;';
  document.body.appendChild(decoy);
  window.dispatchEvent(new Event('resize'));
})()`);
await sleep(650);
const withDecoy = await ghostBounds();
check('真实 DSH：存在诱饵 composer 时 ghost 仍跟随自己的输入框',
  withinEditor(withDecoy), JSON.stringify(withDecoy));
await evalInPage(`document.getElementById('pp-decoy-composer')?.remove(); window.dispatchEvent(new Event('resize'));`);
await sleep(400);

// 恢复原始几何
await evalInPage(`(() => {
  const scope = window.__ppScope;
  scope.style.transform = window.__ppScopeTransform || '';
  scope.style.transformOrigin = '';
  scope.style.width = window.__ppScopeWidth;
  scope.style.maxWidth = window.__ppScopeMax;
  window.dispatchEvent(new Event('resize'));
})()`);
await sleep(500);

// 外部输入框聚焦时 Tab 不应采纳
await evalInPage(`(() => {
  let i = document.getElementById('dsh-smoke-input');
  if (!i) { i = document.createElement('input'); i.id = 'dsh-smoke-input'; document.body.appendChild(i); }
  i.focus();
})()`);
await pressTab();
await sleep(600);
let s = await state();
check('真实 DSH：焦点在外部输入框时 Tab 不采纳', s.text === '' && s.ghost === '先补测试再实现', JSON.stringify(s));

// composer 聚焦时 Tab 采纳
await focusEditor();
await pressTab();
await waitFor(async () => {
  const t = await state();
  return t.text === '先补测试再实现' && !t.ghost;
}, { timeout: 5000 });
check('真实 DSH：composer 聚焦时 Tab 采纳', true);

// 重新加载后再清空草稿（采纳后 dock 已 disarm，刷新才会重新武装）
await send('Page.reload');
await sleep(5000);
await waitFor(() => evalInPage(`!!document.querySelector('[contenteditable="true"]')`), { timeout: 20000 });
await focusEditor();
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 4 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 4 });
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
await waitFor(async () => Boolean((await state()).ghost), { timeout: 10000 });
const beforeReroll = (await state()).ghost;
await evalInPage(`(() => { const b=[...document.querySelectorAll('button')].find((x)=>x.textContent.trim()==='↻'); b?.click(); })()`);
await waitFor(async () => { const s2 = await state(); return s2.ghost && s2.ghost !== beforeReroll && !/^正在生成/.test(s2.ghost); }, { timeout: 10000 });
check('真实 DSH：reroll 后 ghost 换成新建议', true, `${beforeReroll} -> ${(await state()).ghost}`);

// ↓ 生成下一条、↑ 回到上一条（本轮历史）
const afterReroll = (await state()).ghost;
await focusEditor();
await pressArrow('ArrowDown', 'ArrowDown', 40);
await waitFor(async () => { const s3 = await state(); return s3.ghost && s3.ghost !== afterReroll && !/^正在生成/.test(s3.ghost); }, { timeout: 10000 });
const afterDown = (await state()).ghost;
check('真实 DSH：↓ 生成下一条建议', true, `${afterReroll} -> ${afterDown}`);
await focusEditor();
await pressArrow('ArrowUp', 'ArrowUp', 38);
await waitFor(async () => (await state()).ghost === afterReroll, { timeout: 5000 });
check('真实 DSH：↑ 回到上一条建议', true, `${afterDown} -> ${(await state()).ghost}`);

// 暂停事件：隐藏 ghost；恢复后重新预测
await evalInPage(`(() => {
  const until = Date.now() + 60000;
  localStorage.setItem('dsh-prompt-predict.pausedUntil', String(until));
  window.dispatchEvent(new CustomEvent('dsh-prompt-predict:pause', { detail: { until } }));
})()`);
await waitFor(async () => !(await state()).ghost, { timeout: 5000 });
check('真实 DSH：暂停后 ghost 消失', true);
await evalInPage(`(() => {
  localStorage.removeItem('dsh-prompt-predict.pausedUntil');
  window.dispatchEvent(new CustomEvent('dsh-prompt-predict:pause', { detail: { until: 0 } }));
})()`);
await waitFor(async () => Boolean((await state()).ghost), { timeout: 10000 });
check('真实 DSH：恢复后重新出现 ghost', true);

// 多行代码预测：再发一条带标记的消息，mock 对这次预测返回代码块
await focusEditor();
await send('Input.insertText', { text: 'MULTILINE_CODE 给我一段示例代码' });
await evalInPage(`document.querySelector('button[aria-label="发送消息"]')?.click()`);
await waitFor(async () => {
  const t = await ghostSuggestion();
  return Boolean(t && t.includes('function demo()'));
}, { timeout: 20000 });
const codeGhost = await ghostSuggestion();
check('真实 DSH：多行代码建议保留换行与缩进',
  codeGhost === 'function demo() {\n  return 42;\n}',
  JSON.stringify(codeGhost));

await focusEditor();
await pressTab();
await sleep(1000);
const editorAfterCode = await evalInPage(`(() => {
  const ed = document.querySelector('[contenteditable="true"]');
  return ed ? { text: ed.textContent, inner: ed.innerText } : null;
})()`);
check('真实 DSH：Tab 采纳多行代码后换行/缩进进入编辑器',
  Boolean(editorAfterCode)
  && /function demo\(\)/.test(editorAfterCode.text)
  && /return 42/.test(editorAfterCode.text)
  && /\n\s*return 42/.test(editorAfterCode.inner || editorAfterCode.text),
  JSON.stringify(editorAfterCode).slice(0, 300));

check('mock LLM 至少收到 2 次预测请求', llmCalls.filter((c) => c.predict).length >= 2, String(llmCalls.length));

if (SIDEBAR) {
  const dom = await evalInPage(`(() => ({
    buttons: [...document.querySelectorAll('button')].map((b) => ({
      text: (b.textContent || '').trim().slice(0, 40),
      aria: b.getAttribute('aria-label'),
      title: b.getAttribute('title'),
      cls: String(b.className || '').slice(0, 80),
    })).filter((b) => b.text || b.aria || b.title),
    text: document.body.innerText.slice(0, 2000),
    rightbar: [...document.querySelectorAll('[class*="sidebar" i], [data-sidebar], [data-dock]')].map((e) => ({
      tag: e.tagName, cls: String(e.className || '').slice(0, 100), attrs: [...e.attributes].slice(0, 8).map((a) => a.name + '=' + a.value).join(' '),
    })).slice(-40),
  }))()`);
  console.log('SIDEBAR_DEBUG', JSON.stringify(dom, null, 2).slice(0, 12000));

  const opened = await evalInPage(`(() => {
    const card = [...document.querySelectorAll('button, [role="button"], [title]')]
      .find((el) => (el.textContent || '').trim() === '侧边对话(beta)' || el.getAttribute('title') === '侧边对话(beta)');
    if (!card) return false;
    card.click();
    return true;
  })()`);
  await sleep(1200);
  const created = await evalInPage(`(() => {
    const b = [...document.querySelectorAll('button')].find((el) => el.getAttribute('aria-label') === '新建对话');
    if (!b) return false;
    b.click();
    return true;
  })()`);
  await sleep(1500);
  const side = await evalInPage(`(() => ({
    opened: ${opened},
    created: ${created},
    editors: [...document.querySelectorAll('[contenteditable="true"]')].map((ed) => {
      const r = ed.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height, text: (ed.textContent || '').slice(0, 40), attrs: [...ed.attributes].slice(0, 5).map((a) => a.name + '=' + a.value).join(' ') };
    }),
    buttons: [...document.querySelectorAll('button')].map((b) => ({ text: (b.textContent || '').trim().slice(0, 30), aria: b.getAttribute('aria-label') })).filter((b) => b.text || b.aria),
    text: document.body.innerText.slice(0, 1500),
  }))()`);
  console.log('SIDEBAR_AFTER_CLICK', JSON.stringify(side, null, 2).slice(0, 12000));

  const deep = await evalInPage(`(() => {
    const editors = [];
    const seen = new Set();
    const walk = (root, path) => {
      if (!root || seen.has(root)) return;
      seen.add(root);
      try {
        for (const el of root.querySelectorAll('[data-composer-input], [contenteditable], textarea, iframe')) {
          const r = el.getBoundingClientRect();
          editors.push({ path, tag: el.tagName, cls: String(el.className || ''), top: r.top, left: r.left, width: r.width, height: r.height, attrs: [...el.attributes].slice(0, 8).map((a) => a.name + '=' + a.value).join(' ') });
        }
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot) walk(el.shadowRoot, path + '>#shadow');
          if (el.tagName === 'IFRAME') { try { walk(el.contentDocument, path + '>iframe'); } catch { /* cross-origin */ } }
        }
      } catch { /* ignore */ }
    };
    walk(document, 'doc');
    const sideEls = [...document.querySelectorAll('[class*="side" i], [data-sidebar], [class*="dock"]')].slice(-30).map((el) => ({ tag: el.tagName, cls: String(el.className || '').slice(0, 100), text: (el.innerText || '').slice(0, 80) }));
    return { editors, sideEls };
  })()`);
  console.log('SIDEBAR_DEEP', JSON.stringify(deep, null, 2).slice(0, 15000));

  await evalInPage(`document.querySelector('._4BEzFa_sidechatComposerInput')?.focus()`);
  await send('Input.insertText', { text: '侧边栏测试' });
  await sleep(300);
  await evalInPage(`document.querySelector('._4BEzFa_sidechatSendBtn')?.click()`);
  await sleep(3000);
  const sideGhost = await evalInPage(`(() => {
    const g = document.querySelector('[data-prompt-predict-ghost]');
    const composer = document.querySelector('._4BEzFa_sidechat');
    const input = document.querySelector('._4BEzFa_sidechatComposerInput');
    const gr = g && g.getBoundingClientRect();
    const cr = composer && composer.getBoundingClientRect();
    const ir = input && input.getBoundingClientRect();
    return {
      ghosts: document.querySelectorAll('[data-prompt-predict-ghost]').length,
      ghostText: g && (g.querySelector('[data-prompt-predict-text]')?.textContent || g.textContent),
      ghost: gr && { top: gr.top, left: gr.left, right: gr.right, width: gr.width },
      composer: cr && { top: cr.top, left: cr.left, right: cr.right, width: cr.width },
      input: ir && { top: ir.top, left: ir.left, right: ir.right, width: ir.width },
      sideText: composer && (composer.innerText || '').slice(0, 300),
    };
  })()`);
  console.log('SIDEBAR_GHOST', JSON.stringify(sideGhost, null, 2).slice(0, 8000));
}

ws.close();
llm.close();
stopAll();
await sleep(500);
if (!KEEP) {
  try { rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { /* 浏览器/宿主可能还在退出 */ }
}
console.log(`RESULT ${results.every(Boolean) ? 'PASS' : 'FAIL'} (${results.filter(Boolean).length}/${results.length})`);
process.exitCode = results.every(Boolean) ? 0 : 1;

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
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const DSH_CLI = process.env.DSH_SMOKE_DSH
  || '/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh';
const EDGE = process.env.DSH_SMOKE_EDGE
  || '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const KEEP = process.env.DSH_SMOKE_KEEP === '1';
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
    const rerollText = rerollCount === 1 ? '换个思路：先补测试再实现' : '第二版建议：先补测试再实现';
    const answer = predict ? (reroll ? rerollText : '先补测试再实现') : '已完成。';
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
  return { text: ed && ed.textContent, ghost: g ? g.innerText.split('\\n')[0] : null };
})()`);
const pressTab = async () => {
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
    });
  }
};
const focusEditor = () => evalInPage(`document.querySelector('[contenteditable="true"]')?.focus()`);

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
await waitFor(async () => { const s2 = await state(); return s2.ghost && s2.ghost !== beforeReroll; }, { timeout: 10000 });
check('真实 DSH：reroll 后 ghost 换成新建议', true, `${beforeReroll} -> ${(await state()).ghost}`);

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

check('mock LLM 至少收到 2 次预测请求', llmCalls.filter((c) => c.predict).length >= 2, String(llmCalls.length));

ws.close();
llm.close();
stopAll();
await sleep(500);
if (!KEEP) {
  try { rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { /* 浏览器/宿主可能还在退出 */ }
}
console.log(`RESULT ${results.every(Boolean) ? 'PASS' : 'FAIL'} (${results.filter(Boolean).length}/${results.length})`);
process.exitCode = results.every(Boolean) ? 0 : 1;

// 用户设置持久化（~/.dsh/dsh-prompt-predict/config.json，600）。
// 只存用户覆盖的字段；未覆盖的走 cordis patch 部署默认 → 内置默认。
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

export function configFilePath() {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-prompt-predict', 'config.json');
}

export function readSettings() {
  try {
    const raw = JSON.parse(readFileSync(configFilePath(), 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch { return {}; }
}

export function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  for (const key of Object.keys(next)) if (next[key] === undefined || next[key] === null) delete next[key];
  mkdirSync(dirname(configFilePath()), { recursive: true, mode: 0o700 });
  writeFileSync(configFilePath(), JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
}

export function clearSettings() {
  try { rmSync(configFilePath()); } catch { /* 不存在 */ }
}

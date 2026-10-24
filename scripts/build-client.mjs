#!/usr/bin/env node
// client/client.js 由这些源码片段按顺序拼接生成。DSH 只加载单个客户端脚本，
// 所以不能用原生 import；拆分只影响开发，构建产物仍是原来的单体文件。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const parts = [
  '00-prelude.js',
  '01-dictionary.js',
  '02-theme.js',
  '03-core.js',
  '04-composer.js',
  '05-settings.js',
  '06-apply.js',
];
const out = parts.map((name) => readFileSync(join(root, 'client', 'src', name), 'utf8')).join('');
writeFileSync(join(root, 'client', 'client.js'), out);
console.log(`built client/client.js from ${parts.length} parts (${out.length} bytes)`);

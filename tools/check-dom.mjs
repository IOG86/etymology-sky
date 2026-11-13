// 简单检查 index.html 的 id 唯一性，以及 JS 引用的 id 是否存在
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);

const jsFiles = ['js/app.js', 'js/panel.js'];
const refs = new Set();
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of src.matchAll(/getElementById\('([^']+)'\)/g)) refs.add(m[1]);
  for (const m of src.matchAll(/\$\('([^']+)'\)/g)) refs.add(m[1]);
}
const missing = [...refs].filter((r) => !ids.includes(r));
console.log(`html ids: ${ids.length}, duplicates: ${dup.length ? dup.join(', ') : 'none'}`);
console.log(`js referenced ids: ${refs.size}, missing: ${missing.length ? missing.join(', ') : 'none'}`);
if (dup.length || missing.length) process.exit(1);

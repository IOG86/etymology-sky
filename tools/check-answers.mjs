// 词源星图 · 答案一致性抽检（form / cloze 的正确项应与语段中被挖空的词形一致）
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {} };
for (const f of ['js/data.part1.js', 'js/data.part2.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}
const roots = sandbox.window.ETYMOLOGY_ROOTS || [];
let total = 0;
const issues = [];
for (const r of roots) {
  for (const w of r.words) {
    const token = (w.passage.text.match(/\[\[([^\]]+)\]\]/) || [])[1] || '';
    for (const q of w.questions) {
      total++;
      if (q.type === 'form' || q.type === 'cloze') {
        // form 题若干自带「______」例句（与语段挖空无关），跳过与语段 token 的比对
        if (q.type === 'form' && /_{3,}/.test(q.question)) continue;
        const ans = q.options[q.answer];
        const ok = ans.toLowerCase() === token.toLowerCase() ||
          token.toLowerCase().includes(ans.toLowerCase()) ||
          ans.toLowerCase().includes(token.toLowerCase());
        if (!ok) issues.push(`${w.id} [${q.type}] token="${token}" answer="${ans}" options=${JSON.stringify(q.options)}`);
      }
      if (q.type === 'meaning') {
        const ans = q.options[q.answer];
        const wordMeaning = w.meaning || '';
        const shared = [...ans].filter((ch) => /[\u4e00-\u9fa5]/.test(ch) && wordMeaning.includes(ch));
        if (shared.length === 0) issues.push(`${w.id} [meaning] answer="${ans}" wordMeaning="${wordMeaning}"`);
      }
    }
  }
}
console.log(`checked ${total} questions`);
if (issues.length) {
  console.log(`issues: ${issues.length}`);
  issues.forEach((x) => console.log('  ' + x));
} else {
  console.log('all answer keys look consistent');
}

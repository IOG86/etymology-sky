// 词源星图 · 数据校验器
// 用法：node tools/validate-data.mjs            （校验 part1 + part2）
//       node tools/validate-data.mjs js/data.part1.js  （只校验某个 part）
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argFiles = process.argv.slice(2);
const files = argFiles.length ? argFiles : ['js/data.part1.js', 'js/data.part2.js'];

const sandbox = { window: {} };
const errors = [];
const warnings = [];

for (const rel of files) {
  const abs = path.resolve(projectRoot, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`缺少文件 ${rel}`);
    continue;
  }
  try {
    vm.runInNewContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: rel });
  } catch (err) {
    errors.push(`${rel} 语法错误：${err.message}`);
  }
}

const roots = sandbox.window.ETYMOLOGY_ROOTS || [];
const ROOT_IDS = ['spect', 'port', 'tract', 'dict', 'graph', 'bio'];
const ROOT_COLORS = {
  spect: '#7fd4ff', port: '#ffd479', tract: '#a8ffcf',
  dict: '#c9a7ff', graph: '#ff9ec7', bio: '#ffb38a',
};
const TYPES = ['meaning', 'form', 'cloze'];

const isStr = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;
const wordCount = (s) => (s.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length;

const rootIds = new Set();
const wordIds = new Set();
let wordTotal = 0;
let questionTotal = 0;

if (roots.length !== 6) {
  errors.push(`词根数量应为 6，当前 ${roots.length}（若另一个 part 尚未完成，属正常）`);
}

for (const [ri, root] of roots.entries()) {
  const tag = `roots[${ri}](${root && root.id})`;
  if (!root || typeof root !== 'object') { errors.push(`${tag} 不是对象`); continue; }
  if (!isStr(root.id) || !/^[a-z]+$/.test(root.id)) errors.push(`${tag}.id 必须是小写英文字母`);
  else if (rootIds.has(root.id)) errors.push(`${tag}.id 重复：${root.id}`);
  else rootIds.add(root.id);
  if (!ROOT_IDS.includes(root.id)) errors.push(`${tag}.id 不在规定名单中（${ROOT_IDS.join('/')}）`);
  if (!isStr(root.root)) errors.push(`${tag}.root 为空`);
  if (!isStr(root.meaning)) errors.push(`${tag}.meaning 为空`);
  if (!isStr(root.origin, 4)) errors.push(`${tag}.origin 太短`);
  if (!isStr(root.story, 30)) errors.push(`${tag}.story 应至少 30 字，当前 ${root.story ? root.story.length : 0}`);
  if (!/^#[0-9a-fA-F]{6}$/.test(root.color || '')) errors.push(`${tag}.color 不是 #hex 颜色`);
  else if (ROOT_COLORS[root.id] && root.color.toLowerCase() !== ROOT_COLORS[root.id]) {
    errors.push(`${tag}.color 应为 ${ROOT_COLORS[root.id]}，当前 ${root.color}`);
  }
  if (!Array.isArray(root.words) || root.words.length !== 6) {
    errors.push(`${tag}.words 应为 6 个，当前 ${Array.isArray(root.words) ? root.words.length : '非数组'}`);
  }

  for (const [wi, word] of (root.words || []).entries()) {
    const wtag = `${tag}.words[${wi}](${word && word.id})`;
    if (!word || typeof word !== 'object') { errors.push(`${wtag} 不是对象`); continue; }
    if (!isStr(word.id) || !/^[a-z]+$/.test(word.id)) errors.push(`${wtag}.id 必须是小写英文字母`);
    else if (wordIds.has(word.id)) errors.push(`${wtag}.id 重复：${word.id}`);
    else wordIds.add(word.id);
    for (const f of ['word', 'meaning', 'literal']) if (!isStr(word[f])) errors.push(`${wtag}.${f} 为空`);
    if (word.word && word.id && word.word.toLowerCase() !== word.id) warnings.push(`${wtag} id 与 word 不一致`);
    if (!/^\/.+\/$/.test(word.phonetic || '')) errors.push(`${wtag}.phonetic 必须形如 /.../`);
    if (!['v.', 'n.', 'adj.', 'adv.'].includes(word.pos)) errors.push(`${wtag}.pos 应为 v./n./adj./adv.`);
    if (typeof word.prefix !== 'string' || typeof word.prefixMeaning !== 'string') errors.push(`${wtag}.prefix/prefixMeaning 必须是字符串`);
    if (typeof word.suffix !== 'string' || typeof word.suffixMeaning !== 'string') errors.push(`${wtag}.suffix/suffixMeaning 必须是字符串`);

    const p = word.passage;
    if (!p || typeof p !== 'object') {
      errors.push(`${wtag}.passage 缺失`);
    } else {
      if (!isStr(p.scene, 2)) errors.push(`${wtag}.passage.scene 太短`);
      if (!isStr(p.text, 100)) errors.push(`${wtag}.passage.text 太短或缺失`);
      if (!isStr(p.cn, 20)) errors.push(`${wtag}.passage.cn 中文翻译太短`);
      if (typeof p.text === 'string') {
        if (/<[a-zA-Z/][^>]*>/.test(p.text)) errors.push(`${wtag}.passage.text 含 HTML 标签`);
        const marks = p.text.match(/\[\[([^\]]+)\]\]/g) || [];
        if (marks.length !== 1) errors.push(`${wtag}.passage.text 必须恰好一处 [[...]]，当前 ${marks.length}`);
        const token = (p.text.match(/\[\[([^\]]+)\]\]/) || [])[1] || '';
        if (token && word.word && !token.toLowerCase().startsWith(word.word.toLowerCase())) {
          warnings.push(`${wtag} 标记词 "${token}" 与 word "${word.word}" 不是同一词干`);
        }
        const wc = wordCount(p.text);
        if (wc < 40) warnings.push(`${wtag}.passage 仅 ${wc} 词，建议 45–90 词`);
        if (wc > 100) warnings.push(`${wtag}.passage ${wc} 词，偏长（建议 ≤ 90）`);
      }
    }

    const qs = word.questions;
    if (!Array.isArray(qs) || qs.length !== 3) {
      errors.push(`${wtag}.questions 应为 3 道，当前 ${Array.isArray(qs) ? qs.length : '非数组'}`);
    } else {
      qs.forEach((q, qi) => {
        const qtag = `${wtag}.questions[${qi}]`;
        if (!q || typeof q !== 'object') { errors.push(`${qtag} 不是对象`); return; }
        if (q.type !== TYPES[qi]) errors.push(`${qtag}.type 应为 ${TYPES[qi]}，当前 ${q.type}`);
        if (!isStr(q.label, 2)) errors.push(`${qtag}.label 太短`);
        if (!isStr(q.question, 5)) errors.push(`${qtag}.question 太短`);
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          errors.push(`${qtag}.options 应为 4 个，当前 ${Array.isArray(q.options) ? q.options.length : '非数组'}`);
        } else {
          if (q.options.some((o) => !isStr(o, 1))) errors.push(`${qtag}.options 存在空项`);
          if (new Set(q.options).size !== 4) errors.push(`${qtag}.options 存在重复项`);
        }
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${qtag}.answer 必须是 0-3 整数`);
        if (!isStr(q.explanation, 10)) errors.push(`${qtag}.explanation 太短`);
        if (q.type === 'meaning' && Array.isArray(q.options) && q.options.every((o) => /^[A-Za-z]/.test(o))) {
          warnings.push(`${qtag} 是词义题，但选项看起来是英文`);
        }
        questionTotal++;
      });
    }
    wordTotal++;
  }
}

const missingRoots = ROOT_IDS.filter((id) => !rootIds.has(id));
if (missingRoots.length) warnings.push(`尚未包含词根：${missingRoots.join(', ')}`);
if (wordTotal !== 36) warnings.push(`单词总数 ${wordTotal}/36（若另一 part 未完成，属正常）`);

for (const w of warnings) console.warn('WARN  ' + w);
for (const e of errors) console.error('ERROR ' + e);
console.log(`\n统计：${roots.length} 个词根 / ${wordTotal} 个单词 / ${questionTotal} 道题 / ${warnings.length} warning / ${errors.length} error`);
if (errors.length) {
  console.error('校验未通过');
  process.exit(1);
}
console.log('校验通过 ✦');

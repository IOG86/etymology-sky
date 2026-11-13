# 词源星图 · 数据规范（DATA_SCHEMA v1）

本文件是内容创作的唯一契约。两位内容作者分别写 `js/data.part1.js`（spect / port / tract）与
`js/data.part2.js`（dict / graph / bio），最后由 `js/data.js` 合并。所有文字面向中国大学生英语学习者
（四六级 / 考研 / 雅思托福入门），风格：准确、克制、有画面感，拒绝机翻腔和鸡汤。

## 1. 文件格式

每个 part 文件都必须是一段**经典脚本**（不是 ES module），形如：

```js
// js/data.part1.js
window.ETYMOLOGY_ROOTS = (window.ETYMOLOGY_ROOTS || []).concat([
  { /* root 对象 */ },
  { /* root 对象 */ },
  { /* root 对象 */ }
]);
```

- 只用 `var` / `window` 全局，不要 `import/export`。
- 字符串用双引号（或反引号），注意转义；中文标点正常使用。
- 文件编码 UTF-8，无 BOM。
- 不要写 `<script>` 标签、HTML、Markdown 代码围栏。

## 2. 词根 Root 对象

```js
{
  "id": "spect",                       // 小写 ascii，唯一
  "root": "spect",                     // 展示用词根
  "variants": "spec / spic",           // 变体，可空字符串
  "meaning": "看",                     // 一个中文词组
  "origin": "拉丁语 specere（看、注视）",
  "story": "古罗马的占卜官……",          // 60-110 字，讲清词根从哪来、怎么变成今天的意思
  "color": "#7fd4ff",                  // 星座主色，见下方分配表
  "words": [ /* 恰好 6 个 word 对象 */ ]
}
```

## 3. 单词 Word 对象（6 个/词根）

```js
{
  "id": "inspect",                     // 小写 ascii，全局唯一（直接用小写单词）
  "word": "inspect",
  "phonetic": "/ɪnˈspekt/",            // 必须 /.../ 包裹
  "pos": "v.",                         // v. / n. / adj. / adv.
  "meaning": "检查；视察",
  "prefix": "in-",                     // 没有前缀就写 ""
  "prefixMeaning": "向内",             // 与 prefix 对应，无前缀写 ""
  "suffix": "",                        // 没有后缀就写 ""
  "suffixMeaning": "",                 // 与 suffix 对应
  "literal": "向内看 → 检查",           // 字面义 → 实际义，一句话
  "passage": { /* 见 3.1 */ },
  "questions": [ /* 恰好 3 个，顺序必须是 meaning, form, cloze */ ]
}
```

### 3.1 语段 passage

```js
{
  "scene": "海关故事",                  // 4-8 字场景标签
  "text": "The customs officer [[inspect]]ed every suitcase before ...",
  "cn": "海关官员在放行前检查了每一个手提箱……"
}
```

- 原创英文，**45–90 词**，B1–B2 难度，真实语境（新闻 / 校园 / 职场 / 科学 / 历史 / 日常），
  有具体的人物、场景或细节，不要空洞说理。
- 目标词必须在文中**自然出现且是理解关键**，用 `[[...]]` 包住它在文中**实际出现的完整单词**
  （可以带时态/单复数变化，如 `[[inspect]]ed` 应写成 `[[inspected]]`）。全文恰好一处 `[[...]]`。
- 目标词之外的句子不能出现明显语法错误；避免生僻专有名词堆砌。
- `cn`：完整、忠实、流畅的中文翻译。

### 3.2 三个题型 questions

每个 word 恰好 3 题，`type` 固定依次为 `meaning` → `form` → `cloze`。

```js
{
  "type": "meaning",
  "label": "词义辨识",
  "question": "语段中 [[inspect]] 最接近的意思是？",
  "options": ["检查，查看", "怀疑，猜想", "尊重，敬重", "展望，前景"],
  "answer": 0,                         // 正确项下标 0-3
  "explanation": "in-（向内）+ spect（看）→ 向内仔细看，就是检查。"
}
```

- **meaning（词义辨识）**：4 个中文选项，1 正 3 误。干扰项要「形近 / 义近 / 同词根」，比如
  inspect 的干扰项给 suspect、respect、prospect 的意思，逼迫学习者回到语段语境判断。
- **form（词形变换）**：4 个选项为**同一词干的 4 种词形**（如 inspect / inspected / inspection /
  inspector），只有 1 个能在语段空缺处语法成立。question 写「根据语段，空缺处应填入哪个词形？」。
- **cloze（语境填空）**：4 个选项为**同词根家族的不同单词**（含目标词），且与空缺处的时态/单复数/
  词性保持一致，只有 1 个符合语境。question 写「填入空缺处，语段最通顺的是？」。
- `explanation`：30–70 字，把「前缀方向 + 词根 + 语境」一次讲透，像老师一句话点醒。
- `question` 里可以出现 `[[word]]` 标记，渲染端会高亮。

## 4. 词根分配与配色（不得更改）

| part | root id | 词根 | 中文义 | 颜色 | 6 个单词（顺序即星图顺序） |
|---|---|---|---|---|---|
| part1 | spect | spect | 看 | `#7fd4ff` | inspect, respect, suspect, prospect, spectacle, perspective |
| part1 | port | port | 携带；运送 | `#ffd479` | transport, import, export, support, portable, report |
| part1 | tract | tract | 拉；拖 | `#a8ffcf` | attract, contract, distract, extract, subtract, abstract |
| part2 | dict | dict | 说 | `#c9a7ff` | predict, dictate, dictionary, contradict, verdict, dedicate |
| part2 | graph | graph | 写；画 | `#ff9ec7` | photograph, biography, geography, paragraph, autograph, graphic |
| part2 | bio | bio | 生命 | `#ffb38a` | biology, antibiotic, biodiversity, autobiography, symbiosis, biosphere |

单词的构词拆解要与公认词源一致：

- spect：inspect = in（向内）+ spect；respect = re（回、再）+ spect；suspect = sus(sub 下)+spect；
  prospect = pro（向前）+ spect；spectacle = spect + -acle（看的东西）；perspective = per（穿过）+ spect + -ive。
- port：transport = trans（穿过）+ port；import = im(in 入)+port；export = ex（出）+port；
  support = sup(sub 下)+port（从下面托住）；portable = port + -able；report = re（回）+port。
- tract：attract = at(ad 向)+tract；contract = con（一起）+tract；distract = dis（分开）+tract；
  extract = ex（出）+tract；subtract = sub（下）+tract；abstract = abs（离开）+tract。
- dict：predict = pre（前）+dict；dictate = dict + -ate；dictionary = dict + -ionary；
  contradict = contra（相反）+dict；verdict = ver（真实）+dict；dedicate = de（完全）+dic（说）+ -ate。
- graph：photograph = photo（光）+graph；biography = bio（生命）+graph；geography = geo（大地）+graph；
  paragraph = para（旁边）+graph；autograph = auto（自己）+graph；graphic = graph + -ic。
- bio：biology = bio + -logy；antibiotic = anti（反）+bio+ -tic；biodiversity = bio + diversity；
  autobiography = auto（自己）+bio+graphy；symbiosis = sym（一起）+bio+ -sis；biosphere = bio + sphere（球）。

## 5. 校验

```powershell
cd C:\Users\liqin\Desktop\大肥鱼\etymology-sky
node tools\validate-data.mjs
```

校验通过会打印 6 个词根 / 36 个单词 / 108 道题，并给少量警告（如语段过短）。**必须 0 error。**
写完一个 part 可以先跑校验看该 part 的结构错误（另一个 part 缺失会报总数不足，属正常）。

## 6. 质量红线

1. 词源解释必须可信；不确定的表达宁可朴素，不要编造典故。
2. 语段必须是原创英文，不得摘抄真题、新闻原文或歌词。
3. 干扰项不能有第二个可成立答案；form / cloze 题必须结合空缺处的语法形式。
4. 中文自然，不出现「的的」「进行了一个」之类的翻译腔。
5. 音标用英式或美式均可，但必须存在且在 `/.../` 内。

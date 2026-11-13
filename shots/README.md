# 截图索引 · shots/

## 一、作品运行截图（可直接用于参赛帖、README、路演 PPT）

| 文件 | 内容 | 建议用途 |
|---|---|---|
| `01-intro.png` | 开场页：标题、副标题、6/36/108 规模 | 作品封面图 |
| `02-overview.png` | 星海总览：6 片词根星座 | 首图 / 功能总览 |
| `03-root.png` | 词根聚焦：spect 星区、前缀连线、暗行星 | 展示「思维导图式星图」 |
| `04-word.png` | 词星聚焦：inspect 与三颗题型行星、左侧拆解卡 | 展示词形拆解 |
| `04b-hover-tooltip.png` | 鼠标悬停行星时的题型提示 | 展示交互细节 |
| `05-panel-meaning.png` | 语段 + 词义辨识题（桌面右侧抽屉） | 核心答题界面 |
| `06-answered.png` | 答对后行星点亮、解析、进度更新 | 展示即时反馈 |
| `07-panel-form.png` | 词形变换题：语段挖空 | 展示三种题型 |
| `07b-panel-form2.png` | 带独立例句的词形题（part2 风格） | 展示题型多样性 |
| `08-overview-lit.png` | 答完一题后的星图状态 | 展示进度留在星图 |
| `09-lit-constellation.png` | 预置 9 颗行星点亮后的 spect 星座 | 最推荐的视觉主图 |
| `10-help.png` | 玩法说明与重置进度弹窗 | 展示引导与设置 |
| `10-m-intro.png` ~ `18-m-lit-root.png` | 移动端（390×844）同流程截图 | 响应式证明 |

生成方式：

```powershell
cd etymology-sky
node tools/qa.mjs           # 桌面 1600×1000
node tools/qa.mjs --mobile  # 手机 390×844
```

## 二、参赛帖要求的 Qoder 过程截图（待作者补）

`参赛帖.md` 第五部分保留了 9 个占位：

- `shots/01-qoder-schema.png`
- `shots/02-qoder-validator.png`
- `shots/03-qoder-starmap.png`
- `shots/04-qoder-hit-test.png`
- `shots/05-qoder-prefix-label.png`
- `shots/06-qoder-question-flow.png`
- `shots/07-qoder-passage-progress.png`
- `shots/08-qoder-mobile.png`
- `shots/09-qoder-sites.png`

这些必须来自作者真实的 Qoder 会话与发布页面，**不要用本目录的运行截图冒充**。截图前确认画面里没有密钥、手机号、学校账号等隐私信息。

> 注意：运行截图命名为 `01-intro.png` 等，与 Qoder 占位 `01-qoder-schema.png` 不冲突，但上传论坛时建议分成两组或加前缀以免评委混淆。

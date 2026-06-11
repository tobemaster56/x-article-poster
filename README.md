# xPoster

> 用 Markdown 写长文，用 X Articles 发布，不再把文章重新排一遍。
>
> Chrome 扩展 / Tampermonkey 用户脚本 | Markdown 到 X Articles | 图片 | 原生表格 | LaTeX 公式 | 推文嵌入 | 多草稿队列 | 本地优先 | 仅简体中文

xPoster 是一个免费开源的工具，给习惯先写 Markdown、最后发到 X 的人用。它提供一个暂存界面，检查当前打开的 X Article 编辑器，把草稿、图片、表格、公式和嵌入内容写入 X，并把最后的发布按钮留给你自己。

提供两种形态：**Chrome 扩展**（功能完整：侧边栏、批量队列、记录历史、预检、阅读预览）和 **Tampermonkey 用户脚本**（精简的核心导入）。**本项目不上架 Chrome 应用商店**，请按下面的「安装」自行加载。

[使用指南](docs/usage.zh-CN.md) · [隐私说明](docs/privacy.zh-CN.md)

![xPoster Markdown 到 X Articles 概览](docs/images/github-hero.zh-CN.svg)

## 为什么需要它

X Articles 适合发长文，但很多人并不想在 X 编辑器里完成写作。你可能在 Obsidian、Typora、Notion、VS Code、iA Writer 或其他 Markdown 工具里写完文章，最后发布时却还要手动搬运：

- 一段段复制正文，尽量不弄乱结构
- 重新设置标题、列表、引用、链接、加粗、斜体、删除线和行内代码
- 按正确位置上传图片
- 把 Markdown 表格、公式在 X 里重新排一遍
- 把推文链接变成真正的 X 嵌入
- 检查当前 X 编辑器是否还能被脚本访问
- 防止导入一半失败后找不到原稿

xPoster 解决的就是这段交接。Markdown 继续作为你的原始稿，X 继续作为最终发布界面。

## 它能做什么

- **Markdown 写入 X Article**：把标题、段落、列表、引用、行内格式、链接、代码块、分割线、图片、**原生表格**、**LaTeX 公式**和 X/Twitter 推文嵌入写进 X 编辑器。
- **原生表格**：直接写入 X 的表格块（X 现已原生支持表格），不再渲染成图片，可正常编辑。
- **LaTeX 公式**：识别 `$$...$$` 块级公式（以及 `$...$` 行内写法）并写入 X 的公式块。X 仅支持块级公式，行内写法也会作为公式块导入。
- **删除线 / 智能标点**：支持 `~~删除线~~`；可选「智能标点」把中文里的半角标点规范成全角，同时不动代码、链接和 URL。
- **单篇或多篇队列（扩展）**：可以粘贴一篇草稿，选择一个 `.md` 文件，拖入 Markdown，也可以一次排队多篇再逐篇写入。
- **图片导入**：支持本地图片（按需选择本地图片文件夹）、网页图片（按需授权图片网站）和 data URI。
- **标题和封面辅助**：可以从 frontmatter、第一个 H1、第一张图片里识别文章标题和封面（封面在所有图片上传后再设置，避免打乱连续上传）。
- **写入前检查（扩展）**：检查当前标签页、X Articles 页面、编辑器桥接、Draft.js 编辑器、媒体上传器、图片准备状态和编辑器已有内容。
- **阅读预览（扩展）**：侧边栏用 KaTeX 把公式渲染成数学排版，所见即所得地确认草稿。
- **可恢复记录（扩展）**：保存本地导入记录，之前用过的 Markdown 可以搜索、复制、编辑并再次写入。
- **本地优先**：没有后台服务、账号系统、订阅、许可证服务器、付费墙或统计分析。

## 适合 / 不适合

**适合**

- 用 Markdown 写 X 长文的人
- 想把 Obsidian、Notion 导出、博客草稿或本地 `.md` 文件搬到 X Articles 的人
- 文章里有图片、表格、公式、代码块、推文嵌入和多级结构的人
- 一次准备多篇草稿，不想反复复制粘贴的人（用扩展）
- 想使用可审计、可修改开源工具的人

**不适合**

- 自动发布、定时发布或代替你点击 Publish
- 绕过 X 的限制、审核或账号规则
- X threads、Newsletter 或普通推文编辑器
- 追求在每一次 X 编辑器改版后都 100% 视觉一致
- 无法被授权读取的私有图床或内网图片

## 安装

本项目不在 Chrome 应用商店上架，二选一自行安装。

### A. Chrome 扩展（功能完整）

![Chrome 加载解包扩展步骤](docs/images/install-steps.zh-CN.svg)

1. 下载或 clone 这个仓库。
2. 打开 Chrome 的 `chrome://extensions`。
3. 打开右上角 **开发者模式**。
4. 点击 **加载已解压的扩展程序**。
5. 选择包含 `manifest.json` 的 xPoster 项目文件夹。
6. 打开或新建一篇 X Article（`https://x.com/compose/articles`），点开 xPoster 侧边栏即可使用。

### B. Tampermonkey 用户脚本（精简核心导入）

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展。
2. 把仓库里的 `xposter.user.js` 拖进 Tampermonkey（或新建脚本粘贴其内容）安装。
3. 打开 X 文章编辑器页面，右下角会出现 xPoster 浮动面板：粘贴 Markdown 或选 `.md` 文件 → 选图片文件夹（如有本地图）→ 写入。
4. 用户脚本用 `GM_xmlhttpRequest` 下载网页图片（首次可能弹站点授权）；不含批量队列、记录历史、阅读预览等扩展专有功能。

## 30 秒开始（扩展）

1. 打开或新建一篇 X Article：`https://x.com/compose/articles`。
2. 打开 xPoster 侧边栏。
3. 粘贴 Markdown，选择 `.md` 文件，或把 Markdown 文件拖进侧边栏。
4. 点击 **检查文章**。
5. 点击 **写入 X 草稿**。
6. 回到 X 里检查效果，确认无误后手动发布。

![xPoster 发布流程](docs/images/publishing-flow.zh-CN.svg)

## 导入时发生了什么

当你点击 **写入 X 草稿** 时，xPoster 不只是把整篇文章粘贴进去：

1. 先把 Markdown 解析成标题、封面候选、正文块、图片、表格、公式、推文、代码块和分割线。
2. 准备 X 不能直接接收的媒体（本地图片、网页图片、data URI）。
3. 确认当前标签页仍然是刚刚通过 **检查文章** 的那篇 X Article（扩展）。
4. 把正文、表格、公式、嵌入写进 X 的 Draft.js 编辑器，再逐个上传图片、替换占位符。
5. 在所有图片上传完成后再设置标题和封面。
6. 保存本地记录（扩展），并提示哪些内容没有成功上传或放置。

所以 **检查文章** 不只是让按钮变亮，它是在正式导入前先确认 xPoster 能锁定真实的 X 编辑器。

## Markdown 示例

```md
---
title: 我如何写一篇 X 长文
cover: ./images/cover.png
---

# 我如何写一篇 X 长文

我先用 Markdown 写草稿，再用 xPoster 做最后的搬运，连 ~~重排~~ 都省了。

![工作台](./images/workspace.png)

| 步骤 | 工具 |
| --- | --- |
| 写作 | Obsidian |
| 发布 | X Articles |

$$
E = mc^2
$$

https://x.com/Twitter/status/1234567890
```

在这个例子里，xPoster 会读取 frontmatter 标题、尝试设置封面、上传正文图片、写入原生表格、把公式写成 X 的公式块，并在 X 支持时把推文链接插入成嵌入块。

## Markdown 和媒体支持

| 输入 | xPoster 会怎么处理 |
| --- | --- |
| `--- title: 标题 ---` | 尽量用 frontmatter 设置 X 文章标题。 |
| `# 一级标题` | 没有 frontmatter 标题时，尽量用第一个 H1 当标题。 |
| 段落、标题、列表、引用 | 转成 X Article 能接受的富文本。 |
| `**加粗**`、`*斜体*`、`~~删除线~~`、`` `代码` ``、链接 | 在 X 支持的范围内保留行内格式。 |
| `![alt](image.png)` / `![[图片.png]]` | 上传本地、网页或 data URI 图片；支持 Obsidian 行内与列表项里的图片。 |
| `cover:` frontmatter 或第一张图片 | 开启设置后用于文章封面（所有图片上传后再设置）。 |
| Markdown 表格 | 写入 X 的原生表格块。 |
| `$$ 公式 $$`（及 `$ 公式 $`） | 写入 X 的 LaTeX 公式块。 |
| X/Twitter 推文链接 | 尽量通过 X 编辑器模型插入为推文嵌入块。 |
| 代码块、分割线 | 转成 X Article 支持的特殊内容块。 |

测试草稿在这里：[fixtures/live-x-smoke.md](fixtures/live-x-smoke.md)。

## 图片说明

**本地图片**：把图片文件放在 Markdown 附近，并在 xPoster 提示时选择对应的本地图片文件夹。像 `./images/photo.png` 或 Obsidian 的 `![[图片.png]]`（纯文件名）这样的引用，需要先授权 xPoster 读取图片实际所在的文件夹。

**网页图片**：扩展会按需请求读取图片所在网站；用户脚本用 `GM_xmlhttpRequest` 下载。下载失败的网页图片会保留为 Markdown 链接，不会悄悄消失。

**私有图床**：公开源码版本不会暴露私人图床域名。如需固定支持某个图片网站，请只在自己的 fork 里声明可信域名。

## 稳定性与恢复

xPoster 的设计前提是：浏览器自动化一定可能失败。X 可能改编辑器，文件可能不存在，网页图片可能被拦截，上传也可能中途停住。这个工具尽量让失败变得可见、可恢复：

- **导入前（扩展）**：预检查会确认页面、编辑器桥接、Draft.js 编辑器、媒体上传通道和当前草稿状态是否可用。
- **导入中**：进度信息会显示当前阶段（解析、准备媒体、写入正文、上传媒体、设置标题封面等）。
- **导入后**：警告会告诉你哪些图片或封面没有成功上传，只保留成了 Markdown。
- **重新尝试（扩展）**：记录会在本地保留原始 Markdown，你可以复制、编辑，或在一篇干净的 X Article 里再次写入。

最稳妥的习惯是：先运行 **检查文章**，写入一篇干净的 X Article 草稿，在 X 里完整检查结果，确认无误后再手动发布。

## 为什么这样设计

- **写入真实 X 编辑器**：不假装有发布 API，最终检查和发布都留在 X 里。
- **先检查再写入**：X 编辑器经常变化，提前失败比写一半卡住更好。
- **保存本地记录**：媒体、嵌入和编辑器状态都可能中途失败，记录能让你快速恢复。
- **不点击发布**：工具负责搬运和排版，不替你做最后的编辑判断。
- **依赖尽量少**：方便审计、维护和自己修改。

## 隐私与安全

- 草稿和导入记录保存在你自己的浏览器本地存储里。
- xPoster 运行在 `x.com` 和 `twitter.com`，因为它需要填写 X Article 编辑器。
- 扩展使用 `tabs` 权限，是为了找到并检查当前 X Article 标签页。
- 只有当草稿里有需要下载的网页图片时，才会请求对应图片网站的权限。
- xPoster 没有分析统计、后台服务、许可证验证或付费墙。
- xPoster 不会点击发布。最终发布永远由你自己在 X 中确认。

更多隐私说明见：[docs/privacy.zh-CN.md](docs/privacy.zh-CN.md)。

## 开发者检查

这个项目依赖很轻。Node 只用于本地校验。

```bash
npm run check
npm test
npm run verify
```

`npm run check` 会检查 JavaScript 语法、`manifest.json` 和 i18n 覆盖。`npm test` 会检查测试草稿、manifest 引用、图标和 Markdown 解析/写入行为。

> 注意：`xposter.user.js` 内联了 `src/shared.js` 和 `src/main-world.js` 的副本。改动这两个源文件后，需要把对应改动同步进 `xposter.user.js`（解析层做相同修改，引擎部分重新内联 `src/main-world.js`）。

## 项目结构

```text
manifest.json          Chrome 扩展 manifest
sidepanel.html         主侧边栏界面
sidepanel.css          侧边栏样式
sidepanel.js           侧边栏流程、记录、队列、预览和导入控制
diagnostics.html       工具栏诊断弹窗
diagnostics.js         诊断界面逻辑
xposter.user.js        独立的 Tampermonkey 用户脚本（精简核心导入）
src/background.js      MV3 service worker 和图片下载代理
src/content.js         X 页面脚本、页面状态与导入协调
src/main-world.js      MAIN world Draft.js / X 编辑器适配
src/shared.js          Markdown 解析、写入计划、本地图片工具
src/sidepanel-*.js     侧边栏配置、元素、编辑器命令、文案、模式
src/i18n.js            运行时界面文案（简体中文）
vendor/                MiniGFM（预览）、KaTeX（公式渲染）
fixtures/              用于检查和演示的 Markdown 示例
docs/                  使用指南、图片和隐私说明
scripts/               本地校验脚本
```

## 常见问题

**我在 Chrome 里看不到 xPoster。**
本项目不在应用商店，请用源码安装：打开开发者模式，加载包含 `manifest.json` 的文件夹。

**写入 X 草稿按钮不能点。**
先载入或编辑 Markdown 草稿，再打开 X Article 标签页，然后点击 **检查文章**。

**图片没有变成 X 里的图片。**
本地图片需要选择图片实际所在的文件夹（尤其 Obsidian 的纯文件名引用）。网页图片需要授权后能公开下载。

**用户脚本提示「X 编辑器不可达」。**
请先打开或新建一篇具体文章（地址是 `x.com/compose/articles/edit/数字`、能看到正文光标）再写入；用户脚本也会尝试自动新建文章。

**导入后看起来不对。**
先不要发布。可以在 X 里手动修改，或从保存的 Markdown 记录重新开始（扩展）。

**X 改版导致失效。**
欢迎在 [GitHub](https://github.com/tobemaster56/x-article-poster/issues) 提 issue，并附上浏览器版本、xPoster 版本和工具栏诊断弹窗里的 JSON。

## 参与贡献

欢迎提交 issue 和 pull request。可以先看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开源协议

MIT，见 [LICENSE](LICENSE)。本项目基于 [nevertoday/xposter](https://github.com/nevertoday/xposter) 二次开发（MIT）。

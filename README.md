# PiscesCup · 个人主页

介绍自己与开源项目的中英文静态网站：Java 开发库、Minecraft 模组，以及一份 Fabric 模组开发教程。使用原生 HTML、CSS 和 JavaScript，不依赖前端框架或在线接口，适合 GitHub Pages。

站点由 `scripts/` 中的 Node 脚本生成：页面骨架（页头、页脚、导航、目录页、分类页、项目页）都来自同一套模板与数据，改内容只需要改 `data/` 和 `locales/`。

## 设计

主题为「午夜星图 · 玫瑰金」：近黑紫底、星点与极光、玫瑰金强调色，标题用衬线字，正文用系统无衬线，数据与标签用等宽字。所有颜色、字体、圆角与间距集中在 `css/styles.css` 的 `:root` 变量里，改主题只需要改这一处。

- `css/styles.css`：设计变量、页头页脚、首页（Hero、三个方向、项目卡片、关于）、终端入场动画与响应式规则。
- `css/projects.css`：项目介绍页（Hero、本页导航、特性、步骤、代码块、依赖组件、README 示例、信息侧栏）。
- `css/catalog.css`：目录、分类、标签、下载与 Javadoc 页。
- `css/tutorials.css`：教程阅读布局，与全站共用同一套颜色变量。

首页首次访问会播放一段终端开场：任意键、点击或「跳过开场」都会进入正文；同一标签页内再次访问会自动跳过（`sessionStorage`），关闭 JavaScript 时直接显示正文。相关文件为 `js/intro-boot.js`（首帧判断）与 `js/intro.js`（动画与关闭逻辑）。

## 页面结构

```text
index.html                     首页（源文件与生成结果共用，见下）
projects/
  index.html                   项目目录（分类入口 + 全部项目）
  <slug>.html                  每个项目的介绍页，均由统一模板生成
categories/
  index.html  minecraft.html  general.html
tags/index.html                按标签浏览
downloads/<slug>.html          Mod 下载页（Modrinth / CurseForge）
javadoc/<slug>.html            Javadoc 导航页（版本查询由 js/javadoc.js 完成）
tutorials/
  index.html  chapter-00.html  教程首页与章节
404.html
css/  js/  assets/
data/                          项目、示例、教程清单
locales/                       中英文文案
templates/                     项目页模板与教程正文模板
scripts/                       生成、检查、预览与构建脚本
```

`dist/` 是构建产物，不提交。

## 内容模型

一个项目只在一处定义：`data/projects.json`。

```json
{
  "slug": "commons-lib",
  "name": "Commons Lib",
  "heading": "Commons Lib",
  "category": "general",
  "tags": ["java", "library"],
  "summaryKey": "commons-lib.summary",
  "eyebrowKey": "commons-lib.eyebrow",
  "leadKey": "commons-lib.lead",
  "overviewKey": "commons-lib.overview",
  "glyph": "{ commons }",
  "features": [{ "titleKey": "...", "descriptionKey": "..." }],
  "steps": [{ "titleKey": "...", "descriptionKey": "..." }],
  "facts": [{ "labelKey": "project.runtime", "value": "Java 21" }],
  "sections": [],
  "sourceLinks": [{ "url": "https://...", "labelKey": "..." }],
  "repository": "https://github.com/Piscescup/commons-lib",
  "downloads": {},
  "javadoc": { "status": "available", "url": "https://javadoc.io/..." },
  "dependency": { "groupId": "io.github.piscescup", "artifactId": "commons-lib" }
}
```

- `heading` 是页面标题；`glyph` 是 Hero 右侧的等宽装饰。
- `features` / `steps` / `facts` 决定正文小节与右侧信息栏。
- `sections` 支持两种额外小节：`cards`（如 LINQ 的序列类型）与 `code`（如 MC Wiki 的命令示例）。
- `downloads` 存在即生成下载页（允许为空对象，此时页面显示“链接待补”）。
- `javadoc` 存在即生成 Javadoc 导航页；`dependency` 存在即渲染依赖配置组件并挂载复制脚本。

页面由 `templates/project.html` 与 `scripts/project-pages.mjs` 绘制。模板使用 `{{TOKEN}}` 占位符，脚本负责填充分节、面包屑、操作按钮、侧栏与脚本引用。新增项目时：

1. 在 `data/projects.json` 增加一条，并用到的键写进 `locales/zh-CN.json` 与 `locales/en.json`；
2. 需要示例代码时，在 `examples/<slug>/` 放可独立编译的 Java 类，并在 `data/examples.json` 登记；
3. 运行 `npm run generate`，项目页、首页卡片、目录、分类、标签与下载页会一起更新。

## 中英文

中文直接写在 HTML 与 `zh-CN.json` 中，带有 `data-i18n` 标记的文字会在生成阶段被替换成对应语言；`js/i18n.js` 在浏览器里用 `querySelectorAll('[data-i18n]')` 切换语言，`?lang=en` 可直达英文。两份 `locales` 的键必须完全一致，`scripts/check-site.mjs` 会校验缺失键、残留中文和未翻译的可见文字。

代码、命令与项目名视为不翻译内容，模板生成时会加上 `translate="no"`。

## 教程区

教程首页为 `tutorials/index.html`。`Chapter 00 · 开发环境配置` 按 Minecraft 26.3、JDK 25、IntelliJ IDEA 2026.3 编写，资料核对日期为 2026-11-05。

- `data/tutorials.json`：章节顺序、标题键、正文状态与本页目录。
- `templates/tutorials/chapter-00.html`：章节正文模板。
- `locales/*.json`：以 `tutorial.`、`chapter00.` 开头的文案。
- `examples/tutorials/VocabularySparkModReferences.java`：作者示例源码，生成时嵌入正文并提供复制按钮。
- `data/tutorials/*.references.json`：参考文献；正文用 `data-cite="来源ID"` 标注，生成时统一编号并生成返回链接。
- `scripts/tutorials.mjs`、`scripts/tutorial-references.mjs`：教程页与引用渲染。

新增章节时，扩展清单、增加正文模板与双语文案，把状态从 `content-pending` 改为 `published` 并配置真实锚点即可；目录与检查会跟随清单更新。

## 本地预览与检查

需要 Node.js 18 或更新版本，无第三方依赖。

```sh
npm run dev        # 生成站点并启动本地服务器（默认 http://localhost:4173）
npm run generate   # 只重新生成页面
npm run check      # 单元测试 + 全站检查（资源、内链、锚点、翻译、页面数量）
npm run build      # 生成 + 检查 + 输出 dist/
```

`npm run check` 会验证：

- 每个页面的标题层级、语言标记、描述、语言切换按钮与 `hreflang`；
- 所有本地链接与锚点存在，外链带 `rel="noopener"`；
- 每个 `data-i18n` 键在两种语言中都存在，英文版不残留中文；
- 项目页、目录、分类、标签、下载页与 Javadoc 页的数量与项目清单一致；
- 依赖组件、代码示例与教程引用的数量与源数据一致。

## GitHub Pages

仓库根目录已包含可直接发布的页面和 `.nojekyll`。把改动推送到 GitHub 后，在仓库 **Settings → Pages** 中选择 **Deploy from a branch**，分支选默认分支，目录选 **/(root)**。站点地址为 `https://piscescup.github.io/`。

## 内容来源

项目说明依据各公开仓库的 README 与源码整理：

- [PC Develop Lib V2](https://github.com/Piscescup/PiscesCup-Develop-Lib-Ver_2)
- [Pisces Cup Easy](https://github.com/Piscescup/pisces-cup-easy-fabric-1.21.4)
- [More Advancements](https://github.com/Piscescup/More-Advancement-fabric-1.21.4)
- [MC Wiki](https://github.com/Piscescup/mc-wiki-mod)
- [Commons Lib](https://github.com/Piscescup/commons-lib)
- [LINQ for Java](https://github.com/Piscescup/linq-for-java)
- 头像：[GitHub 公开头像](https://avatars.githubusercontent.com/u/108559501?v=4)

页面版式参考 [philia-093.com](https://philia-093.com/) 的星空与终端开场氛围，以及 [Eclipse Collections](https://eclipse.dev/collections/index.html) 的项目页信息组织方式；代码与文案为本项目原创。

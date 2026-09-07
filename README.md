# PiscesCup · 个人主页

原生 HTML、CSS、JavaScript 静态站点，适用于 GitHub Pages。中英文共用同一套页面，通过翻译键切换语言。首页提供 Minecraft 项目、通用项目两个入口，点击后进入分类内容；通用库另有 Javadoc 文档导航。

## 目录结构

```text
index.html                       首页（完整中文正文 + 翻译键）
projects/
  index.html                     两大项目分类入口，自动生成
  pc-develop-lib.html             PC Develop Lib V2
  piscescup-easy.html             Pisces Cup Easy
  more-advancements.html          More Advancements
  commons-lib.html               Commons Lib
  linq-for-java.html              LINQ for Java，自动生成
categories/
  index.html                     两大分类总览，自动生成
  minecraft.html                 Minecraft 开发库与模组，自动生成
  general.html                   通用 Java 项目，自动生成
javadoc/
  commons-lib.html               Commons Lib 在线 API 文档导航，自动生成
  linq-for-java.html              LINQ 文档状态与相关入口，自动生成
tags/index.html                  按技术标签浏览，自动生成
locales/
  zh-CN.json                     中文文案
  en.json                        英文文案
data/projects.json               项目信息、分类、标签、Javadoc 与依赖版本元数据
data/examples.json               README 示例标题键、来源章节与预期输出
examples/                        按项目保存的完整 Java 示例源文件
templates/linq-for-java.html      LINQ 详情页正文模板
css/                            首页、项目页与目录样式
js/
  i18n.js                        翻译、语言偏好与 URL
  script.js                      手机导航、导航状态与年份
  translations.js                语言字典的浏览器包，自动生成
  legacy-routes.js                旧英文 URL 的兼容跳转
  dependency-formats.js           生成端和浏览器共用的依赖格式
  dependencies.js                 依赖选项卡、版本切换和一键复制
  clipboard.js                    依赖和示例共用的剪贴板兼容处理
  code-examples.js                完整示例复制与反馈
assets/                          头像与图标
404.html                         未找到页面与旧 URL 兼容入口，自动生成
scripts/                         生成、检查、预览和构建工具
dist/                            构建产物，不提交 Git
```

页面保留原有的项目详情 URL。没有单独的 `en/` 页面目录；英文使用同一 URL 的 `?lang=en` 参数，例如：

- 中文：`/projects/linq-for-java.html?lang=zh-CN`
- 英文：`/projects/linq-for-java.html?lang=en#enumerables`

## 本地开发

需要 Node.js 18 或更新版本，无需安装第三方运行依赖。

```sh
npm run dev
```

默认地址为 `http://localhost:4173`。页面也可以直接用浏览器打开，语言包通过普通脚本载入，不依赖 fetch 或服务器接口。

```sh
npm run generate  # 修改语言字典、项目清单或模板后重新生成
npm run check     # 检查翻译键、正文、资源、目录、内部链接与章节锚点
npm run build     # 生成、检查并将公共资源输出至 dist/
```

本地预览没有文件监听器；修改字典后运行 `npm run generate` 并刷新。新增公共文件后重启预览服务器。

## 用翻译键维护内容

例如，共用页面中写：

```html
<a href="./projects/index.html" data-i18n="nav.directory">目录</a>
<p data-i18n="linq.lead">用熟悉的 LINQ 风格，把数据处理写成可组合的查询。</p>
```

在 `locales/zh-CN.json` 和 `locales/en.json` 中维护相同的键：

```json
{
  "nav.directory": "Directory",
  "linq.lead": "Turn data processing into composable queries with a familiar LINQ style."
}
```

- `data-i18n` 替换元素的纯文本。保留图标、链接等子元素时，把待翻译文字单独包在带翻译键的 `span` 中。
- `data-i18n-aria-label`、`data-i18n-alt`、`data-i18n-content`、`data-i18n-placeholder` 和 `data-i18n-title` 翻译对应属性。
- 语言字典保存纯文本，不保存 HTML；浏览器使用 `textContent` 更新内容。
- `npm run generate` 自动更新 HTML 的中文默认正文和 `js/translations.js`。请编辑 JSON 文案源，而非手动改生成的语言包。
- 切换会更新文档语言、标题、描述和辅助功能标签，保留当前路径、查询参数与章节，并将语言带到站内链接。
- 语言优先级为 URL 参数、已保存的偏好、中文默认值。非法参数回退中文；禁用本地存储不影响切换。浏览器前进和后退会恢复相应语言。
- 禁用 JavaScript 时仍可阅读中文全文；英文切换需要 JavaScript。中英文不再拥有独立的静态 HTML 文件。

类型名、API 名称、Maven 坐标与代码不进入翻译键。使用 `translate="no"` 和 `notranslate` 标记专有词，只给周围说明加键，例如：

```html
<h3><span translate="no" class="notranslate">Long</span> <span data-i18n="linq.sequences">序列</span></h3>
```

这样切换后是 `Long sequences`，`Long` 始终不变。不要在包含这些子元素的父元素上设置 `data-i18n`，否则纯文本翻译会替换其全部内容。代码块由生成器统一标记为不翻译；代码中的 `long`、`double` 等基本类型也保持原样和大小写。

## 可选择、可复制的依赖

Commons Lib 和 LINQ for Java 的“开始使用”提供 Maven、Gradle、Gradle Kotlin、Ivy 和 Download 选项卡。支持版本选择、复制按钮、键盘方向键 / Home / End 切换。换语言不会重置工具或版本。剪贴板不可用时尝试兼容复制；仍失败则选中代码并提示手动复制，不会误报成功。禁用 JavaScript 时显示默认版本的全部格式。

在项目清单中加入 `dependency`，并在详情 HTML 或模板里放置 `<!-- dependency:start --><!-- dependency:end -->`，生成器就会填入组件及脚本：

```json
{
  "dependency": {
    "groupId": "io.github.piscescup",
    "artifactId": "commons-lib",
    "defaultVersion": "1.1.6",
    "versions": ["1.1.6", "1.1.5", "1.1.4", "1.1.3", "1.1.2"],
    "status": "published",
    "checkedAt": "2026-09-07",
    "sourceUrl": "https://repo.maven.apache.org/maven2/io/github/piscescup/commons-lib/maven-metadata.xml"
  }
}
```

`versions` 只填写已经核实的版本。`status: "published"` 提供所选版本的 JAR / POM 外链；`status: "source"` 显示未确认发布的提示，Download 仅提供 README，不生成可能失效的下载直链。仅有一个版本时选择框禁用。版本列表为人工核实的静态快照，构建和浏览器都不会自动联网查询；更新元数据后运行 `npm run generate`。

2026-09-07 核对 Maven Central：Commons Lib 版本列表包含 1.0.0 至 1.1.6 共 10 个版本，默认 1.1.6，其 POM 要求 Java 21，JAR 地址可访问。LINQ for Java 的版本元数据返回 404，因此 1.0.0 仅作为源码版本示例，需要确认发布或先在本地构建安装。Javadoc 的已验证版本单独维护，不假定和默认依赖版本同步。

组件 HTML 来自 `scripts/dependencies.mjs`，依赖字符串由 `js/dependency-formats.js` 统一生成，避免模板与浏览器的格式不一致。不要手工修改 `dependency:start/end` 中的生成内容。

## README 代码示例

两个通用库详情页都提供独立的“代码示例”章节，默认展开第一例，其余可按需展开；禁用 JavaScript 仍可阅读、展开和手动复制。

- Commons Lib：README 的五组 Quick Examples，分别为命名转换、区间检查、计数器、TriFunction 与 Pair 映射。
- LINQ for Java：筛选、投影、多级排序、聚合、集合运算，以及 Student 组合查询，共六例。

源代码位于 `examples/<project>/<ClassName>.java`，统一包含 `import`、完整类与 `main`。生成器将源码直接嵌入页面，复制按钮只复制 Java 代码，不包含标题和输出。`data/examples.json` 保存标题与说明翻译键、README URL / 章节、核对日期和输出；`scripts/examples.mjs` 负责校验与渲染。更新示例时修改 Java 源文件和元数据，再运行 `npm run generate`，不要手动编辑页面的 `examples:start/end` 区间。

2026-09-07 使用 JDK 25 实际编译运行了全部 11 个示例：Commons Lib 使用 1.1.6、编译目标为 Java 21；LINQ 使用仓库 1.0.0 源码和 Java 25。输出与页面逐一比对。相对于 README，只补充了独立运行所需的结构和输出语句；排序示例省略可选的 NotNull 注解，聚合示例的打印标签由 age 修正为 avg，页面说明中标明了这些调整。示例版本不随依赖选择器自动切换。

常规 `npm run check` 会检查生成的示例与源码一致、翻译完整、来源与导航链接存在。可选的实际 Java 运行检查为 `npm run check:java`，需要本机 JDK 25，并配置以下环境变量（classpath 按操作系统使用分号或冒号分隔）：

- `EXAMPLE_COMMONS_CLASSPATH`：已有的 Commons Lib、JetBrains annotations、Gson JAR 路径。
- `EXAMPLE_LINQ_SOURCE`：已有 LINQ 仓库的 `src/main/java` 路径；或使用 `EXAMPLE_LINQ_CLASSPATH` 指定编译后的类或 JAR。

检查器不会下载依赖、修改库源码或发布任何内容；编译产物与参数文件保存在它打印的临时目录中，不进入站点构建产物。

## 修改或新增项目

`data/projects.json` 是分类内容、首页分类卡片与 Javadoc 导航的数据源。`category` 取 `minecraft` 或 `general`，不再为工具库或 LINQ 单独设置大类。通用库可以通过 `javadoc` 字段配置文档：

```json
{
  "slug": "commons-lib",
  "name": "Commons Lib",
  "category": "general",
  "tags": ["java", "library"],
  "summaryKey": "commons-lib.summary",
  "repository": "https://github.com/Piscescup/commons-lib",
  "javadoc": {
    "status": "available",
    "url": "https://javadoc.io/doc/io.github.piscescup/commons-lib",
    "version": "1.1.2",
    "versionUrl": "https://javadoc.io/doc/io.github.piscescup/commons-lib/1.1.2",
    "checkedAt": "2026-09-07"
  }
}
```

新增项目时，在清单中添加条目、在两份字典中添加摘要和正文翻译，再建立一个 `projects/<slug>.html` 详情页。首页分类卡片中的名称和数量、分类内容、标签列表、详情页面包屑与返回分类链接会自动更新。两大分类和技术标签定义在 `scripts/generate-site.mjs`。

配置 `javadoc` 后，会生成 `javadoc/<slug>.html`，并在通用项目列表、详情页顶部和侧栏加入入口；请在两份字典中添加 `javadoc.<slug>.title`。导航页提供明确的外链按钮，不嵌入或复制第三方 API 文档，也不会强制自动跳转。

2026-09-07 已核实 Commons Lib 1.1.2 的实际 Javadoc 可访问。LINQ for Java 的 javadoc.io 版本查询当时返回空列表，因此其配置为 `status: "unavailable"`，并使用 `versionsUrl` 提供查询入口，另保留 README 链接。未来确认文档可用后，将状态改为 `available`，填入已验证的 `url`、`version`、`versionUrl` 和 `checkedAt`，再运行生成命令。构建不会联网探测文档状态。

现有四个项目详情的结构直接编辑各自 HTML；LINQ 页面正文编辑 `templates/linq-for-java.html`，公共页头和页脚由首页复用。请不要手动编辑生成的分类页、Javadoc 导航页、LINQ 输出页或首页的 `project-categories:start/end` 区间；这些内容会在下次生成时更新。详情页中带 `data-project-javadoc` 的链接也由生成脚本维护。

LINQ for Java 页面包含项目简介、四种序列类型、查询操作、Java 25 环境要求、Maven/Gradle 依赖、可直接放入 Java 类的示例，以及关联项目入口。

## GitHub Pages

运行 `npm run build` 验证后，可以提交根目录的网页和生成资源，使用 GitHub Pages 的分支根目录发布方式；也可以将 `dist/` 交给支持静态文件的托管服务。网站不需要服务器 API、密钥或在线翻译服务。

原来的 `/en/`、`/en/index.html` 及四个英文详情页由统一的 `404.html` 跳转到对应页面的 `?lang=en`，同时保留已有查询参数与章节。这依赖托管服务的自定义 404 页面支持；本地预览服务器已提供同样行为。其他未知路径显示正常的未找到页面。

构建只公开网站文件，不包含源码模板、开发脚本、语言 JSON 源文件、编辑器配置或 Git 数据。本地的 `.openai/hosting.json` 托管配置继续使用 `dist`。修改网页不会自动提交、推送或发布。

## 内容来源

- [LINQ for Java](https://github.com/Piscescup/linq-for-java)：2026-09-07 核对 README、pom.xml 与 Linq 工厂源码；源码版本为 1.0.0，要求 Java 25。页面中的版本不是自动更新的发布声明。
- [Commons Lib Javadoc](https://javadoc.io/doc/io.github.piscescup/commons-lib)：核对到 1.1.2 的包、类和方法文档；[LINQ for Java 文档版本查询](https://javadoc.io/versions/io.github.piscescup/linq-for-java) 当时未返回版本。
- [linq-in-java](https://github.com/Piscescup/linq-in-java)：作为独立关联仓库链接；未将其 Java 21、1.0.2 配置套用到 LINQ for Java。
- [PC Develop Lib V2](https://github.com/Piscescup/PiscesCup-Develop-Lib-Ver_2)、[PiscesCup Easy](https://github.com/Piscescup/pisces-cup-easy-fabric-1.21.4)、[More Advancements](https://github.com/Piscescup/More-Advancement-fabric-1.21.4)、[Commons Lib](https://github.com/Piscescup/commons-lib)：保留此前按公开仓库整理的说明。
- 项目目录参考 [BeiShanair 的站点仓库](https://github.com/BeiShanair/BeiShanair.github.io) 的分类和标签组织方式。页面保留 PiscesCup 的作品集视觉样式。

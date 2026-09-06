# PiscesCup · 个人主页

介绍自己与 GitHub 项目的中英文静态网站。使用原生 HTML、CSS 和 JavaScript，不依赖前端框架或在线接口，适合 GitHub Pages。

## 页面结构

```text
index.html                         中文首页
projects/
  pc-develop-lib.html               PC Develop Lib V2
  piscescup-easy.html               PiscesCup Easy
  more-advancements.html            More Advancements
  commons-lib.html                  Commons Lib
en/
  index.html                       English home
  projects/                        上述四个项目的英文页面，文件名相同
styles.css                         全站共享样式与语言导航
projects.css                       项目介绍页共享样式
script.js                          导航、语言切换和年份
assets/                            头像和图标
```

每个 HTML 都包含完整正文，可以直接打开。首页项目标题和“项目介绍”进入站内详情；详情页包含项目简介、主要功能、开始使用和 GitHub 入口。

中文与英文使用独立文件和 URL。右上角的语言切换前往当前页面的另一语言版本；启用 JavaScript 时会保留正在阅读的章节。站内导航会继续使用当前语言，不依赖浏览器存储、在线翻译或服务器重定向。

## 本地预览

需要 Node.js 18 或更新版本，无第三方依赖。

```sh
npm run dev
```

打开终端显示的本地地址，默认是 `http://localhost:4173`。也可以直接打开 `index.html`。

```sh
npm run build
```

构建结果位于 `dist/`，只包含可公开的网页文件，不会包含开发脚本、Git 数据或个人编辑器配置。

构建前会自动检查全部页面的资源、内部链接、章节锚点、语言元数据与语言切换对应关系，也可以单独运行 `npm run check`。本地服务器支持 `/`、`/en/` 以及所有项目 HTML 的直接访问。

## 修改内容

- `index.html` 与 `en/index.html`：各语言的首页欢迎语、关于我、四个项目的摘要与链接。自我介绍为可替换的欢迎语。
- `projects/*.html` 与 `en/projects/*.html`：项目详情。修改中文后，请同步修改对应英文文件，正文直接写在 HTML 中。
- `styles.css`：颜色在开头的 `:root` 中设置；文件后半部分为平板、手机与语言切换规则。
- `projects.css`：项目封面、功能介绍、上手步骤、代码区块和项目信息侧栏。
- `assets/avatar.jpg`：来自 PiscesCup 的 GitHub 头像，可替换为自己的图片。
- `assets/favicon.svg`：浏览器标签页图标。
- `script.js`：手机导航、当前导航提示、切换语言时保留章节、页脚年份。

项目列表是手动精选的静态内容，不会实时同步 GitHub。新增项目时，在两个首页的 `project-list` 中各复制一个 `article`，更换标题、介绍、标签和本地详情链接；在两个 `projects/` 目录中各添加对应页面，并同步更新项目计数。新页面也需要正确的 `lang`、`hreflang` 和语言切换链接。`scripts/check-site.mjs` 末尾的预期页面数需随之更新；本地服务器需重启以纳入新文件。

## GitHub Pages

仓库根目录已包含可直接发布的页面和 `.nojekyll`，无需服务器、密钥或额外构建工作流。将更改推送到 GitHub 后，在仓库 **Settings → Pages** 中选择 **Deploy from a branch**，选择存放网页的分支和 **/(root)**。网站地址为 `https://piscescup.github.io/`。

本次制作不会自动更改 GitHub Pages 设置或推送到 GitHub。

## 内容来源

项目说明于 2026-09-06 按公开仓库 README 或源代码整理：

- [PC Develop Lib V2](https://github.com/Piscescup/PiscesCup-Develop-Lib-Ver_2)：依据源码目录及 Fabric 配置。旧版库的版本与能力未直接套用到 V2。
- [PiscesCup Easy](https://github.com/Piscescup/pisces-cup-easy-fabric-1.21.4)：玩家白名单、OP、封禁名单及语言切换。仓库名带有 1.21.4，实际已支持多个版本，页面因此未限定版本。
- [More Advancements](https://github.com/Piscescup/More-Advancement-fabric-1.21.4)：额外进度挑战，未虚构数量。
- [Commons Lib](https://github.com/Piscescup/commons-lib)：Java 21 通用工具库。
- 头像：[GitHub 公开头像](https://avatars.githubusercontent.com/u/108559501?v=4)。

首页布局参考 [Tomorrow-Land](https://beishanair.github.io/) 的封面、内容卡片和个人资料侧栏结构。项目页的信息组织参考 [Eclipse Collections](https://eclipse.dev/collections/index.html) 的简介、功能和开始使用区块。页面样式与排版为本项目独立编写。

详情页中，V2 的功能依据注册模块、示例目录与数据生成入口；More Advancements 的功能依据进度数据和语言文件；Easy 的命令示例与 Commons Lib 的 Maven 依赖依据各自 README。没有为未发布 GitHub Release 的项目添加下载按钮。

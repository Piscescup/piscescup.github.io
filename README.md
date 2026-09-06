# PiscesCup · 个人主页

介绍自己与 GitHub 项目的中文静态主页。使用原生 HTML、CSS 和 JavaScript，不依赖前端框架或在线接口，适合 GitHub Pages。

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

## 修改内容

- `index.html`：首页欢迎语、关于我、四个项目的描述与链接。项目介绍根据公开仓库整理，自我介绍为可替换的欢迎语。
- `styles.css`：颜色在开头的 `:root` 中设置；文件后半部分为平板和手机适配规则。
- `assets/avatar.jpg`：来自 PiscesCup 的 GitHub 头像，可替换为自己的图片。
- `assets/favicon.svg`：浏览器标签页图标。
- `script.js`：手机导航、当前导航提示、页脚年份。

项目列表是手动精选的静态内容，不会实时同步 GitHub。新增项目时，在 `index.html` 的 `project-list` 中复制一个 `article`，更换标题、介绍、标签及两个仓库链接，同时修改项目序号和标题旁的计数。

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

布局参考 [Tomorrow-Land](https://beishanair.github.io/) 的封面、内容卡片和个人资料侧栏结构。页面样式与排版为本项目独立编写，未复制对方文章、头像或背景图。

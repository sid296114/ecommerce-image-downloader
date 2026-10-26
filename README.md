# 电商图片提取下载（Chrome 扩展）

一键提取淘宝 / 天猫、京东、拼多多商家版商品详情页图片，集中勾选并批量下载为 PNG。

## 项目结构

```
ecommerce-image-downloader/
├── extension/                 # Chrome 扩展（可直接「加载已解压的扩展程序」）
│   ├── manifest.json          # MV3 声明、权限、content_scripts、service worker
│   ├── content.js             # 注入悬浮按钮 + 提取图片
│   ├── content.css            # 按钮样式
│   ├── background.js          # service worker：消息转发 + 转 PNG + 下载
│   ├── gallery.html/.css/.js  # 新标签页：网格展示、勾选、下载
│   └── icons/                 # 扩展图标（由 scripts/gen-icons.js 生成）
├── website/                   # 官网展示页（React + Vite + Tailwind）
├── test/mock-page.html        # 本地模拟商品详情页，用于测试提取逻辑
├── scripts/
│   ├── gen-icons.js           # 生成占位图标（纯 Node，无依赖）
│   └── validate.js            # 校验 manifest 与 JS 语法
└── README.md
```

## 安装（加载到 Chrome）

1. 打开 Chrome，地址栏输入 `chrome://extensions` 并回车。
2. 打开右上角「开发者模式」开关。
3. 点击「加载已解压的扩展程序」，选择本项目下的 `extension` 目录。
4. 打开任意支持的电商商品详情页，页面右下角会出现「获取图片」悬浮按钮。

> 若 `extension/icons/` 图标缺失，可先运行 `node scripts/gen-icons.js` 生成；
> 不生成图标扩展也能正常加载（Chrome 显示默认拼图图标）。

## 使用方法

1. 进入商品详情页（淘宝 / 天猫 / 京东 / 拼多多商家版）。
2. 点击右下角「获取图片」按钮，等待提示「提取中…」。
3. 扩展会自动滚动页面触发懒加载、扫描图片，并在新标签页打开 `gallery` 网格。
4. 勾选所需图片（支持全选 / 反选），顶部显示已选数量。
5. 点击「下载选中」，图片统一转换为 PNG 并保存到浏览器默认下载目录。
6. 下载过程有进度条，完成后提示成功 / 失败数量。

## 支持的图片来源

- `<img>` 的 `src`、`currentSrc`
- `srcset` / `data-srcset`（自动取最大分辨率）
- 懒加载属性：`data-src`、`data-lazy-src`、`data-original`、`data-url`、`data-echo`、`data-actualsrc`
- `<picture><source>` 的 `srcset`
- 内联与计算样式的 `background-image`

## 过滤规则

- 自动排除明显的小图标 / logo / 占位图（URL 关键词，见 `content.js` 的 `JUNK_RE`）
- 排除 1x1 像素图
- 排除宽高都小于 100px 的小图
- 相对路径补全为绝对 URL，并按 URL 去重

## 关于跨域与权限说明

商品图通常托管在 CDN 域名（如 `alicdn.com`、`360buyimg.com`、`pddpic.com` 等），
不在淘宝 / 京东 / 拼多多主域名下。为保证图片能在扩展内部被 `fetch` 并转换为 PNG，
`manifest.json` 的 `host_permissions` 声明为 `https://*/*` 与 `http://*/*`（等效 `<all_urls>`）。

`content_scripts.matches` 仍严格限定三大平台域名，因此悬浮按钮只会出现在目标商品详情页，
其他页面不会注入。

## 官网展示页（website/）

```bash
cd website
npm install        # 已内置 .npmrc，规避部分镜像源下 npm 10 的 peer 解析报错
npm run dev        # 本地开发，打开 http://localhost:5173
npm run build      # 构建到 dist/
npm run preview    # 预览构建结果
```

## 校验与测试

```bash
node scripts/gen-icons.js   # 生成扩展图标
node scripts/validate.js    # 校验 manifest 与 JS 语法
```

`test/mock-page.html` 是一个本地模拟商品详情页，覆盖了 `srcset`、`data-src`、
`background-image` 与小图标 / 1x1 干扰项，用于直观验证提取与过滤逻辑。
由于 `content_scripts.matches` 默认不含 `file://`，若要在此页实测 `content.js`，
请临时把 `"file:///*"` 加入 `extension/manifest.json` 的 `content_scripts.matches`。

> 真实站点（淘宝 / 京东 / 拼多多）的端到端验证需要登录后的详情页，建议按上述安装步骤
> 到真实商品页手动测试。

## 技术栈

- Manifest V3 + Service Worker
- `chrome.downloads` / `chrome.storage` / `chrome.runtime` API
- `fetch` + `createImageBitmap` + `OffscreenCanvas` 实现无跨域限制的 PNG 转换
- 官网：React 19 + Vite 8 + Tailwind CSS 4

# CHIM Branding Portfolio handoff

## Canonical source

GitHub `SenTomoHiro/chim-branding-portfolio` 的 `main` 分支是项目唯一正式源。正式案例数据、排序、媒体、PDF cache 和生成 PDF 都只存在 GitHub；本地只保留程序代码。

允许使用 Codex Desktop 本地开发，但必须使用 `--filter=blob:none` partial clone + sparse checkout 的 code-only workspace。从一个干净的官方仓库执行 `npm run setup:local-code-only -- /absolute/destination` 可创建这个工作副本；它不 checkout `data/**`、`public/media/**`、`case-production/**` 或生成 PDF。不得用同步脚本把正式业务数据镜像到项目目录。

## Three-layer architecture

1. **Program** — GitHub Pages 只部署静态应用壳。首页、分类、详情和 Print 都是固定路由；只有应用代码、UI、样式、构建脚本或 PDF 模板变化才运行 `deploy-pages.yml`。Pages artifact 不包含案例媒体或生成 PDF，也不安装 Playwright 浏览器。
2. **Content** — `data/content.json` 是唯一正式案例数据，`public/media/cases/**` 是后台新增媒体位置。浏览器通过 `NEXT_PUBLIC_CONTENT_ORIGIN` 在运行时读取内容和媒体；保存案例、排序、发布状态或上传媒体均不部署 Pages。`/work/?id=<case-id>` 与固定 Print 壳可立即展示新案例。
3. **PDF Cache** — PDF 只由管理员主动按 target 生成。`generate-pdf.yml` 复用已部署 Print 壳，一次只生成一个 target，并把二进制覆盖到稳定的 `pdf-cache` GitHub Release。`data/pdf-cache.json` 只记录该 target 的 canonical JSON + SHA-256 `sourceHash`、稳定文件名和生成时间；内容未变时直接复用，相关内容变化时显示过期。manifest-only 提交不部署 Pages。

## Content and admin

- 每个案例只有一个 `media` 顺序。前两张图片分别派生为列表封面与详情 Hero；视频不占用这两个角色；其余媒体进入详情正文。
- PDF 精选、章节、Full / Half 都记录在同一媒体项上，网站与对应 PDF 共享顺序。
- 本地与 GitHub Pages 后台使用同一个 `GitHubAdmin`、`AdminDashboard`、`CaseForm` 和 `PdfAdmin`；不存在本地 persistence 或本地业务 API。
- 后台只在当前页面内存保存 GitHub Token，通过 GitHub Contents API 写入 `main` 并读取 `data/pdf-cache.json`；不得写入 `.env`、localStorage、sessionStorage、cookie 或仓库文件，也不得轮询 GitHub Actions API。
- Fine-grained PAT 最小权限仍只有该仓库的 `Contents: Read and write`。PDF workflow 内部使用 `GITHUB_TOKEN` 更新 Release 与 manifest。

## PDF render version

`lib/pdf-cache.ts` 中的 `PDF_RENDER_VERSION` 是 PDF 模板缓存版本。任何会改变 PDF 输出的字体、版式、PDF component、Print CSS 或渲染规则变更都必须 bump 这个数字。不要用 Git commit SHA，否则无关代码会使所有 PDF 过期。

Case 与 Portfolio PDF 共用 `layoutPdfMasonry` 的确定性双列布局：DOM 保持正式媒体顺序，每张图按真实宽高比进入当前较短列，章节边界会重置布局。历史媒体缺少尺寸元数据时，Print 页会在标记 ready 前读取远程图片的 intrinsic size，不允许回退到假定尺寸。

## Provider boundary

GitHub 只是当前 provider，不是业务结构的一部分。业务组件只能使用统一的 runtime content/media 与 PDF URL helper；GitHub raw、Release 和 Pages host 只允许出现在 `lib/origins.ts`、workflow、部署配置或本文档。未来迁移腾讯 COS、阿里 OSS 或其他静态站点时，只替换 `CONTENT_ORIGIN`、`PDF_ORIGIN` 与站点部署 origin，不改案例数据模型、页面路由或后台业务逻辑。

## Verification

正式变更至少运行：

```sh
npm ci
npm run typecheck
npm test
npm run test:official
npm run test:e2e
npm run build
npm run build:pages
npm run test:e2e:pages
```

发布后还要确认 GitHub Actions Pages workflow 成功、线上 commit 对应 `main`，并从另一个全新 clone 完成 `npm ci`、typecheck、tests 与 `build:pages`。

本地推送代码前先 `git fetch origin main` 并安全同步远程内容提交；禁止 force push 或 `reset --hard`。sparse workspace 只能明确 `git add` 代码路径，commit 前必须检查 `git diff --cached --name-status`，决不能提交 `data/**` 或 `public/media/**` 的删除。

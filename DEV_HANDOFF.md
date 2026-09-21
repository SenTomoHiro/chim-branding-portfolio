# CHIM Branding Portfolio handoff

## Canonical source

GitHub `SenTomoHiro/chim-branding-portfolio` 的 `main` 分支是项目唯一正式源。禁止把任何电脑上的目录当作正式代码、案例数据或媒体源；本地目录和 Codex 工作区都只是可随时丢弃的临时环境。

以后维护统一从 GitHub 的全新环境开始：clone / Codex 云端临时工作区 → 修改与完整测试 → commit / push `main` → GitHub Actions → GitHub Pages。部署不得依赖某台电脑上的未提交文件、缓存或本地构建产物。

## Three-layer architecture

1. **Program** — GitHub Pages 只部署静态应用壳。首页、分类、详情和 Print 都是固定路由；只有应用代码、UI、样式、构建脚本或 PDF 模板变化才运行 `deploy-pages.yml`。Pages artifact 不包含案例媒体或生成 PDF，也不安装 Playwright 浏览器。
2. **Content** — `data/content.json` 是唯一正式案例数据，`public/media/cases/**` 是后台新增媒体位置。浏览器通过 `NEXT_PUBLIC_CONTENT_ORIGIN` 在运行时读取内容和媒体；保存案例、排序、发布状态或上传媒体均不部署 Pages。`/work/?id=<case-id>` 与固定 Print 壳可立即展示新案例。
3. **PDF Cache** — PDF 只由管理员主动按 target 生成。`generate-pdf.yml` 复用已部署 Print 壳，一次只生成一个 target，并把二进制覆盖到稳定的 `pdf-cache` GitHub Release。`data/pdf-cache.json` 只记录该 target 的 canonical JSON + SHA-256 `sourceHash`、稳定文件名和生成时间；内容未变时直接复用，相关内容变化时显示过期。manifest-only 提交不部署 Pages。

## Content and admin

- 每个案例只有一个 `media` 顺序。前两张图片分别派生为列表封面与详情 Hero；视频不占用这两个角色；其余媒体进入详情正文。
- PDF 精选、章节、Full / Half 都记录在同一媒体项上，网站与对应 PDF 共享顺序。
- 本地与 GitHub Pages 后台共用 `AdminHeader`、`AdminDashboard`、`CaseForm` 和 `PdfAdmin`，只替换认证、持久化和 PDF 执行适配器。
- Pages 后台只在页面内存保存 GitHub Token，通过 GitHub Contents API 写入 `main` 并读取 `data/pdf-cache.json`；不得写入 localStorage、sessionStorage 或 cookie，也不得轮询 GitHub Actions API。
- Fine-grained PAT 最小权限仍只有该仓库的 `Contents: Read and write`。PDF workflow 内部使用 `GITHUB_TOKEN` 更新 Release 与 manifest。

## Provider boundary

GitHub 只是当前 provider，不是业务结构的一部分。业务组件只能使用统一的 runtime content/media 与 PDF URL helper；GitHub raw、Release 和 Pages host 只允许出现在 `lib/origins.ts`、workflow、部署配置或本文档。未来迁移腾讯 COS、阿里 OSS 或其他静态站点时，只替换 `CONTENT_ORIGIN`、`PDF_ORIGIN` 与站点部署 origin，不改案例数据模型、页面路由或后台业务逻辑。

## Verification

正式变更至少运行：

```sh
npm ci
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run build:pages
npm run test:e2e:pages
```

发布后还要确认 GitHub Actions Pages workflow 成功、线上 commit 对应 `main`，并从另一个全新 clone 完成 `npm ci`、typecheck、tests 与 `build:pages`。

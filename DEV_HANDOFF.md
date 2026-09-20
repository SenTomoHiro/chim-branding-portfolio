# CHIM Branding Portfolio handoff

## Canonical source

GitHub `SenTomoHiro/chim-branding-portfolio` 的 `main` 分支是项目唯一正式源。禁止把任何电脑上的目录当作正式代码、案例数据或媒体源；本地目录和 Codex 工作区都只是可随时丢弃的临时环境。

以后维护统一从 GitHub 的全新环境开始：clone / Codex 云端临时工作区 → 修改与完整测试 → commit / push `main` → GitHub Actions → GitHub Pages。部署不得依赖某台电脑上的未提交文件、缓存或本地构建产物。

## Content and admin

- `data/content.json` 是正式案例数据；每个案例只有一个 `media` 顺序。
- 前两张图片分别派生为列表封面与详情 Hero；视频不占用这两个角色；其余媒体进入详情正文。
- PDF 精选、章节、Full / Half 都记录在同一媒体项上，网站与全部 PDF 共享顺序。
- 本地与 GitHub Pages 后台共用 `AdminHeader`、`AdminDashboard`、`CaseForm` 和 `PdfAdmin`，只替换认证、持久化和 PDF 执行适配器。
- Pages 后台只在页面内存保存 GitHub Token，直接通过 GitHub Contents API 写入 `main`；不得写入 localStorage、sessionStorage 或 cookie。
- Pages PDF 操作通过 `repository_dispatch` 触发既有 `deploy-pages.yml`，由 `build:pages` 生成全部 PDF 并部署。Fine-grained PAT 最小权限仅为该仓库的 `Contents: Read and write`；公开 workflow run 的进度查询不发送 Token。

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

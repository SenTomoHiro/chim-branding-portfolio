# DEV_HANDOFF

## STATUS

CHIM Portfolio 的分类模型、后台字段、公开导航、路由标题、详情 Metadata 与 Motion Pass 已完成重构，并通过 Production 浏览器验收。

## TAXONOMY

- 唯一正式分类模型：`business`、`categories`、`primaryIndustry`。
- 所属业务：`branding`（品牌设计）、`photography`（商业摄影），单选且必填。
- 所属分类：`food`、`drinks`、`ip`、`other`，固定多选且至少一个。
- 已删除 `industryTags`、`designPrimary`、`designTags`、`versions`、`priorityCaseIds` 及相关 API/UI/排序逻辑。
- 数据保持 50 个 Case、48 个公开；Branding 30 个公开、Photography 18 个公开；L005/L006 仍为草稿。

## ROUTES

- `/`：全部已发布 Branding。
- `/photo`：全部已发布 Photography。
- `/food`、`/drinks`、`/ip`、`/other`：从 Branding 默认顺序中按固定分类过滤。
- `/premium`：已删除并返回 404。
- `/work/[name]`：Branding 与 Photography 共用详情实现，案例名称编码后作为 URL 路径。
- `/admin`：唯一后台入口；保留 Branding 与 Photography 两套默认排序。

## UI AND MOTION

- 双语导航采用“业务一级 / Branding 分类二级”结构，中文主、英文辅；Photography 不显示二级分类。
- 页面标题使用英文主标题与中文辅助标题。
- 统一 Motion tokens；包含 Header reveal、标题 mask reveal、Masonry IntersectionObserver reveal、桌面 Cover 到 Hero/正文图的按需 crossfade、详情 Hero clip/scale、正文媒体 reveal。
- 使用 React ViewTransition 对列表图片与详情 Hero 做渐进增强；不支持时正常导航。
- `prefers-reduced-motion` 会关闭非必要位移、裁切与缩放。
- Hover 次级媒体首次指针进入时才挂载并懒加载；Mobile 不模拟 Hover。

## TESTS

- TypeScript：`npx tsc --noEmit` 通过。
- Vitest：6 个测试文件、14 个测试全部通过。
- Playwright / Chrome：5 个流程全部通过；覆盖业务/分类真实筛选、相对排序、多分类、Masonry、6 个 Hover、48 个公开详情、1440×900 与 390×844、后台分类字段与可逆增删改发流程。
- Production Build：`npm run build` 通过。
- Production 核心路由：`/`、`/food`、`/drinks`、`/ip`、`/other`、`/photo`、Branding Detail、Photography Detail、`/admin` 均已实际浏览；`/premium` 返回 404。
- Production Console：CHIM 页面未发现 runtime、hydration、asset 404 或 React 警告。

## VISUAL QA

- Desktop：检查双语导航、标题、Masonry、慢速/快速滚动、分类切换、Branding/Photography Detail 与正文 Reveal。
- Mobile 390×844：检查双语导航换行、标题、单列 Masonry、Detail、后台列表与横向溢出。
- COLLINS 案例列表与 Bose 详情已实际浏览、滚动、点击与返回；借鉴其节奏和连续感，未复制视觉或引入复杂滚动依赖。

## KNOWN ISSUES

None.

## DEPLOYMENT

Not deployed.

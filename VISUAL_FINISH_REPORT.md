# CHIM Portfolio 视觉收尾 · 2026-10-06

本轮从 `ui/editorial-visual-finish` 的 `4823fcc` 接管 Claude 未提交成果，继续已经确认的 Editorial Feed 方向。未推送、未部署、未修改正式业务内容。

## 工作区保护与实现

- 实际检查 status / 完整 diff / stat / 分支 / 最近十次提交。`backup/before-visual-finish` 保持指向 `4823fcc`。
- Claude 原始 tracked patch 和未跟踪 FloatingControls 已保存到 `/Users/chim/Codex备份/chim-visual-finish-20261006/claude-worktree.patch`、`floating-controls.original.tsx`。
- 保留并完成 FloatingControls，以及 runtime 列表、详情的接入；清理冲突的公共控件、Feed、详情 CSS 重复规则，未整文件回退。
- 分类在左，公共回顶在最右下，统一 44px 高度、半透明背景、blur、边框及安全区。按用户追加指示改为常驻回顶，保留原公共实现的 Chrome 释放焦点修复、smooth / reduced-motion 行为。
- 大 Bottom Sheet 改为 Pill 上方约 212px 的内容尺寸菜单，保留所有分类和摄影入口、路由、Escape、关闭、背景滚动锁定，并补齐焦点恢复和 Tab 边界处理。短屏内部滚动。按用户追加指示，展开时背景页面有 4px blur；菜单、分类、关闭、回顶保持清晰和可点击。浮层通过 portal 位于独立层，遮罩在控件下方。
- 列表 CHIM 字标正常可读，详情移除无功能的小字标。Feed 精修封面、序号、中文标题、projectName、metadata、简介与案例节奏；桌面自然展开为图片和文字列。详情精修开篇、正文、Chapter、媒体间距、Next Case、关闭和浮动控件。
- 封面使用一个不可交互的共享图片层，从实际绘制位置扩展到详情开篇，首页文字先退场。真实封面隐藏期间保留几何，结束恢复真实图片；不增加中间历史记录，不改导航系统。
- 原生整页 View Transition 试验会阻挡动画期间的真实控件命中，已改为位于控件下方的 WAAPI 图片层。快速 Close、Back、滚动或键盘操作可中断；减少动态效果、未解码图片、不支持 animate 和内容慢加载正常降级。静态排版不依赖进入动画。

## 工程契约

- 首入口 A → Next B → Next C → 详情回顶 → Close 仍返回最初 A 的列表、分类和原视口。四宽度首页、分类生产实测误差均为 0px，专项继续要求小于 3px。
- Back / Forward 与 Close 各自保持原语义；外部直达不复用旧入口。`lib/return-context.ts` 未改。
- 768px 起同章相邻 Half 按对并排，Full / 章节 / 孤立 Half 占整行，窄屏单列。配对算法、正式 layout、顺序、媒体数量未改；视频播放专项通过。
- Print / PDF 代码和 CSS、后台 CSS、官方测试未改。业务数据和正式媒体未入工作树，保留原 sparse/code-only；GitHub main 仍是唯一正式源。
- 一个旧交互测试在桌面被 Locator.click 自动滚动 64px 后才点击，导致预先记录位置失真。改为点击真实可见区域，保留原误差断言；其他首入口专项仍小于 3px，未删除断言。

## N005 官方测试证据

测试代码、helper 和 config 与 `4823fcc` 一致；当前环境无 content origin 覆盖，读取 `https://raw.githubusercontent.com/SenTomoHiro/chim-branding-portfolio/main`，ref 为 `main`。

基线日志 `/Users/chim/Codex备份/chim-repair-20261006/evidence/official-final.log` 在北京时间 2026-10-06 01:14:13 开始，6/6 通过。该日志未记录响应 SHA，因此没有宣称当时抓到了响应 SHA。通过内容提交时间线与 baseline 的 `data/content.json` Git blob `59b873850b3d4b74ff9d1463044513a38c129721`，确认当时对应内容版本 `8e0d6bce12d9054f77d34d1e76b5e91d5155dc76`；该 raw 内容计算出的 blob 完全一致。同一官方测试固定读取该版本再跑仍为 6/6。

后续正式内容提交 `c5b1c477139864284717be870d7bd1cdb3c14eba`（父提交 `e11bb7be823e619126bd688783e1e5e84637b982`，UTC 2026-10-06 04:07:56，即北京时间 12:07:56，Update portfolio case: 水果老爸 Fruits Pops）替换 N005：原 15 个媒体均有 provenance，新 19 个媒体均无 provenance。后续 main 仍缺少这些字段。

本轮核对 main head 为 `b310cd9cc8d07c4e2bffb20586af69594f9e22e0`，内容 blob 为 `de217644d5c35ef18010c49a69d35c6a4d7430a6`。当前 official 5/6，失败为 `N005 provenance: expected 0 to be greater than 0`。N012、N014、N016、N017 也缺 provenance，测试首先在 N005 停止。这是独立的正式数据回归；本轮没有修改正式数据或降低标准。

具体父子版本媒体清单、GitHub patch、origin/ref/blob 和两次测试日志在备份 evidence 的 `n005-history.json`、`n005-change.patch`、`official-provenance-evidence.json`、`official-main-final.log`、`official-baseline-version.log`。

## 实际验证

Playwright 1.55.1、`channel: chrome`，复用已安装 Chrome，没有安装 Chromium。

| 命令 / 范围 | 结果 | evidence 日志 |
| --- | --- | --- |
| npm run typecheck | 通过 | typecheck.log |
| npm test | 51/51 | unit-final.log |
| npm run test:official | 5/6；N005 正式 provenance 回归 | official-main-final.log |
| 同一 official 测试固定基线内容版本 | 6/6 | official-baseline-version.log |
| npm run test:e2e | 56/56 | e2e-final.log |
| npm run build | 通过 | build-final.log |
| npm run build:pages | 通过，带正式子路径 | build-pages-final.log |
| npm run test:e2e:pages | 11/11 | e2e-pages-final.log |
| 入口恢复、Full/Half、视频专项 | 7/7 | special-final.log |
| Print 专项 | 5/5 | special-final.log |
| 新视觉、封面几何、快速关闭、慢加载与降级专项 | 11/11；最终控件层级随完整 E2E 再验 | special-final.log、e2e-final.log |
| 390 / 430 / 820 / 1440 正式内容生产浏览器 | 全部通过，恢复 0px，无 pageerror | production-final.log、production-final/verification.json |

完整 E2E 在最后调整模糊遮罩层级后复跑。四宽度增加首页、详情展开菜单时真实控件命中，以及展开菜单直接点击详情关闭的验证。初次旧视觉断言失败、桌面点击测量失败及被后续指示取代的验证日志与 trace 均保留，不掩盖中间失败。

一次四宽度生产验证在前三宽度通过后，1440 的首页首图出现 EncodingError。独立复查同一正式原图返回 200 并成功解码为 1263×1624，随后完整复跑；原失败保留在 `production-image-decode-failed.log` 和对应目录，诊断见 `image-decode-diagnostic.json`。首次未捕获具体网络状态，不能确定是网络错误还是瞬态解码问题；没有删除图片解码检查或改正式媒体。验证脚本补充图片失败诊断并按宽度保存测量检查点。

## 预览与证据

- 本地生产预览：`http://localhost:3401/chim-branding-portfolio/`，运行 `scripts/preview-pages.mjs`，从正式 main 读取内容和媒体。Pages 测试 fixture 导出之后已重新构建正式 origin 输出。
- 最终截图、录屏：`/Users/chim/Codex备份/chim-visual-finish-20261006/evidence/production-final/`。`home-*`、`home-menu-*`、`detail-menu-*`、`intro-*`、`layout-*`、`menu-*`、`photography-*`、`motion-*`、`restored-*` 等覆盖四宽度；静态截图等待可见图片解码和过渡结束。
- `interaction-{390,430,820,1440}.webm` 记录首页滚动 → 当前封面进入 → 阅读 → Next → 回顶 → Close → 原位置，也包含分类、Back/Forward、长案例和减少动态效果验证。
- 可复跑：`VERIFY_OUTPUT=/absolute/external/folder node scripts/verify-editorial.mjs`。所有日志、截图、录屏保存在仓库外，未将正式数据镜像到本地项目。
- Chrome viewport/touch 模拟已执行；物理真机安全区、移动浏览器地址栏仍需人工验收。正式内容目前没有发布视频，使用隔离样本测试视频播放。

人工验收最多三项：390/430 的阅读节奏与菜单模糊；封面连续进入及快速关闭；真机安全区和动态地址栏。

分支：`ui/editorial-visual-finish`。本报告随视觉实现创建新本地 commit，commit SHA 由最终交付消息提供。

Push：NO；Deploy：NO；正式数据改动：NO。

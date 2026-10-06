# CHIM Portfolio 工程修复交接 · 2026-10-06

本轮保留 Editorial Feed、真实内容、分类 Pill 和连续阅读详情；不代表新 UI 视觉与动效全部完成。

## 基线与保护

- 实际目录：`/Users/chim/Codex开发项目/案例展示网站`。
- 原分支：`ui/editorial-feed-refinement`；原 HEAD：`a94ce2bea852471ad2081819960167295eb7c0c9`。
- 初始 tracked / untracked 工作区均干净；没有删除未跟踪文件。
- Remote：`https://github.com/SenTomoHiro/chim-branding-portfolio.git`，partial clone `[blob:none]`；sparse 排除 `data/**` 和正式媒体，已核对 skip-worktree。
- 原 3000 端口为本项目 Next 16.3.5；5173、3001、8080 属其他服务，未碰它们。测试使用独立 3100 / 3200。
- 备份：`/Users/chim/Codex备份/chim-repair-20261006/`，包含 `code-snapshot/`、`git-local-objects/`、空的初始工作区/index patch 和未跟踪清单；备份本地已有对象，不补齐缺失的正式业务 blobs。
- 独立修复分支：`codex/editorial-function-repair-20261006`，新建成功，没有覆盖同名分支。
- 原 `STATUS_REPORT.md` 不在工作区或可见 Git 历史中；最近四次 UI 提交没有文件删除。无法确认或恢复历史未跟踪报告，本文件是本轮新报告。

## 根因与修复

1. 回顶定位仍引用重构删除的 CSS 变量，详情也未挂载公共组件。复用 `BackToTopButton`，监听实际 document/window 滚动；顶部隐藏，约一屏显示，隐藏时 `display:none`、不可点击或聚焦；安全区及 visualViewport resize 生效。点击只滚当前页，减少动态效果下即时回顶。实际发现 Chrome 隐藏已聚焦按钮会中断 smooth scroll，现先释放焦点并阻止鼠标按下时抢焦点。
2. 新详情用 `router.back()` 绕过正式关闭模块；Feed 漏挂恢复组件；原 Next 会改写案例与分类。重新接入 `DetailCloseButton` 和 `CaseListRestoration`，冻结首个 source/caseId/anchorTop，Next 只扩展历史深度和目标。列表与详情各 history entry 保存自己的上下文，pending 入口只消费一次；新列表入口重新建立，外部直达不读旧 session 入口，Back/Forward 仍沿真实历史走。
3. 位置恢复按案例 ID 与原视口相对位置，在正式内容完成挂载和字体就绪后执行一次。Feed 图片有宽高元数据预留布局，不等待离屏下载，不使用固定延时、重复 scrollTo 或无限重试；不会重导航或清空分类。
4. Media Flow 多套 CSS 与依赖最后一个 Half 的规则会拆散合法配对；旧 `--gap-tight` 也被删除，导致 gap 声明无效。恢复原 Editorial spacing 变量；768px 起统一两列，同章相邻 Half 按对显示，Full、章标题、孤立 Half 占整行，窄屏单列。配对只产生展示标记，媒体数量、顺序、章节和正式 layout 不改写；PDF 组件与版本未改。
5. E2E 仍断言旧 Masonry/Header 和“关闭回最后案例”；原 Feed 测试不在 testDir 中，未被正式命令执行。更新为当前 Feed 和首个入口契约，移动原 Feed 测试进入正式测试目录；保留分类、顺序、标题、媒体、位置误差、排序和 Print 断言。自动化点击可见封面，避免高链接被 Playwright 自动滚动后才点击；位移操作用 instant，避免读取未结束的测试滚动。

## 验证记录

最终检查均已等待进程结束并确认 exit 0：

| 检查 | 结果 | 日志（备份目录 evidence 下） |
| --- | --- | --- |
| npm ci | 通过，锁定版本未变 | 本轮工具输出 |
| npm run typecheck | 通过 | typecheck-final.log |
| npm test | 51/51 | unit-final.log |
| npm run test:official | 6/6 | official-final.log |
| npm run test:e2e | 45/45，3.4 分钟 | e2e-complete.log |
| npm run build | 通过 | build-final.log |
| npm run build:pages | 通过；最终导出带 /chim-branding-portfolio | pages-production-build.log |
| npm run test:e2e:pages | 11/11 | pages-complete.log |
| 追加入口/排版专项 | 7/7 | recovery-final.log |
| 追加 Print 范围 | 5/5 | print-final.log |
| 生产浏览器操作、截图、录屏 | 四宽度通过，入口恢复误差均 0px | production-verification.log、production/verification.json |

第二轮完整 E2E 曾 44/45，唯一失败是组合 Print 页面等全局 networkidle 超时 120 秒。保留所有布局断言，改等正式 ready 标记，并增加受检章节图片 complete/naturalWidth 断言后，Print 5/5 与最终完整 45/45 均通过。失败日志和 trace 保存在 e2e-final.log / e2e-final-results，不掩盖首轮或中间失败。

实际生产预览：`http://localhost:3300/chim-branding-portfolio/`（3300 服务保留运行）。它从正式 main 运行时读取内容/媒体，正确带 Pages 子路径；详情直达关闭 fallback 也再验过，品牌列表加载 43 项。原 3000 dev 为避免双 dev 锁冲突已停止，未把测试 dev 地址当生产预览。重新启动预览：先 `NEXT_PUBLIC_BASE_PATH=/chim-branding-portfolio npm run build:pages`，再 `node scripts/preview-pages.mjs`。

截图在 `evidence/production/`：`feed-*`、`controls-*`、`layout-*`、`detail-*`、`restored-*`，各有 390/430/820/1440px。已查看作品实际显现的截图，非加载占位。操作视频 `interaction-390.webm`（7.52s）到 `interaction-1440.webm`（9.48s），共四组，ffprobe 验证为 VP8 有效录屏。可复验：`VERIFY_OUTPUT=/absolute/external/folder node scripts/verify-editorial.mjs`。

全部后台写操作只使用 fixture 和网络拦截；额外阻断未被 fixture 明确处理的 GitHub mutation。未操作真实后台上传、保存、排序、删除、发布或生成 PDF。

Playwright 锁定 1.55.1，保持原配置 `channel: chrome`，使用已安装 Chrome，未升级依赖。原 Chromium 1193 后台安装曾运行约半小时，随后已不在运行，退出状态未知；缓存缺少安装完成标记且启动失败，不能宣称安装成功。本轮没有再启动安装，实际 Chrome 可打开正式内容、点击、滚动、截图和录屏。

首轮完整 E2E：25 通过、10 失败，已保留 `evidence/e2e.log` 和 `e2e-first-results/`。它暴露了平滑回顶焦点问题、旧测量方式、拖动视口和旧 Header 断言；最终结果见完成记录。`npm ci` 成功，保留锁文件版本；npm 报已有 critical 依赖告警，没有顺手升级。

正式内容目前没有已发布视频案例；视频使用浏览器生成的隔离 WebM 样本测试播放、controls 和 playsInline，未保存第二套正式 JSON。

截图、录屏、测量 JSON 与完整命令日志：`/Users/chim/Codex备份/chim-repair-20261006/evidence/`。四宽度为 390、430、820、1440，包含额外横屏操作。Chrome 的 viewport / touch 模拟不是真机；真机、安全区与移动浏览器动态地址栏的物理设备验收未执行。线上部署、推送后验收、全新 clone 验收未执行，因为本轮禁止 push/deploy。

## Claude 后续与不可破坏的契约

- 继续 CHIM 字标视觉定稿、沉浸转场及视觉/动效收尾；首页需正常可读、经过排版的 CHIM 标识，详情不要孤立悬挂极小字标。本轮没有新增品牌风格。
- 保留 Feed 非全屏封面、标题、分类、简介；详情持续阅读，正式内容/后台/Print/PDF 共用原数据架构。
- 回顶必须复用公共实现并监听真实滚动容器；Pill 在其上方有间距，关闭在右上角；隐藏不可点击或聚焦。
- A→B→C→详情回顶→关闭必须回最初 A 的列表/分类/位置。Next 和回顶不得改入口，Back/Forward 与外部直达语义不得合并；若改滚动容器或布局，更新定位恢复与测试。
- Full/Half 按原 layout、章节和媒体顺序显示，不能以移动优先为由让所有设备单列；不回写 layout、不影响 PDF。
- GitHub main 仍是唯一正式业务源，本地保持 sparse/code-only；不镜像数据与媒体，不用正式后台测试写操作。

## 安全查看旧版

仅在 `git status --short` 干净后，`git switch ui/editorial-feed-refinement` 回到本轮接手前 a94ce2b；用 `git switch codex/editorial-function-repair-20261006` 返回本轮修复。它只切代码，正式内容仍从 GitHub main 运行时读取。

若需查看更早已验收 UI，可从 `3ee2cf5` 新建一个未被占用的本地预览分支，例如 `git switch -c codex/legacy-preview-20261006 3ee2cf5`；重名就改新名字，不覆盖。停止当前服务、按该版本构建再预览；不要向当前 Feed 整文件覆盖旧源码，不 reset --hard、不 git clean。

Push：NO；Deploy：NO；正式数据改动：NO。

# 反向详情关闭转场 · 2026-10-06

- 从已验收的 `a1f0069`、干净工作区新建 `motion/reverse-detail-close`。只增加反向转场和必要表现层接点；保留原视觉版本和独立父提交，方便单项回退。
- 进入、退出复用一个 WAAPI 共享图片层、同一几何测量和 easing。进入 480ms，退出 400ms。没有第二套 session/localStorage 返回状态。
- 点击关闭先冻结当前画面与可见图片几何，再立即执行原 `requestCaseListReturn + history.go(-detailDepth)`。临时 viewport 层遮住列表加载、恢复和测量；`CaseListRestoration` 完成原 fonts.ready / scrollTo 后，将实际 A 封面 DOM 交给图片层收缩。完成后显现真实封面并清理临时层。
- 深滚动优先取当前可见的最大图片；没有可见图片时，已解码的开篇封面从冻结的当前视口柔和接入。C / 正文媒体与 A 封面不同，在同一图层边界内交叉淡化为 A；真实列表封面始终隐藏至交接结束，不产生两个独立封面或末端位置跳变。
- 一次 Close 只执行一次正式返回。快速关闭可以接续尚在移动的 enter 图片；Back、滚动、键盘或其他点击中断会清理图片和 viewport 层，不接管用户导航。
- reduced-motion、不支持 animate、源图尚未解码、外部直达没有合法入口时走原安全关闭。目标图片 decode 失败会清理并显示原恢复结果。原有 1800ms deadline 只用于慢/失败导航的降级，不用 timeout 启动动画；正常交接由恢复回调、decode 和下一绘制帧驱动。
- 修复验证发现的重复交接：第二次回调不得覆盖封面原 visibility，因此两个方向交接都只运行一次。临时图层使用 `data-transition-case-id`，不冒充列表的 `data-case-id`。

## 保护范围

`return-context`、Full/Half 配对算法、正式媒体顺序、RuntimeWorkPage、Feed、CHIM、菜单、浮动控件、Next Case 视觉均未修改。全局 CSS 只增加共享层的落地图片和冻结视口两条规则；Print / PDF / 后台 CSS 未改。没有 data/**、public/media/** 改动或 sparse 误删。

## 实际验证

| 检查 | 结果 | evidence 日志 |
| --- | --- | --- |
| typecheck | 通过 | typecheck.log |
| unit | 51/51 | unit.log |
| official | 5/6；已知 N005 正式 provenance 回归 | official.log |
| reverse + existing visual 专项 | 28/28 | focused-serial.log |
| 全量 E2E（含入口、Half、视频、Print、后台） | 73/73 | e2e.log |
| build | 通过 | build.log |
| Pages E2E | 11/11 | pages-e2e.log |
| build:pages | 通过，恢复正式 main origin | build-pages.log |
| 生产 Chrome 四尺寸操作和录屏 | 390 / 430 / 820 / 1440，三种关闭路径均 0px，无 pageerror | production/verification.json |

新增 17 项自动测试：四宽度分别测试 A 直接关闭、A→B→C 深滚动关闭、回顶关闭；动画几何终点与实际 A 封面差小于 1px，返回位置小于 3px；检查真实封面显现、历史长度、Forward 后再次关闭、重复关闭、动画中 Back、解码失败、reduced-motion、外部直达、慢列表返回。现有 56 项 E2E 断言保留。

首轮隐藏封面失败与中间网络失败记录保留。并行浏览器运行曾在正式 GitHub 图片请求出现 `net::ERR_CONNECTION_CLOSED`，trace 中响应 status -1；同一源图通过 Node fetch 返回 200 / 268476 bytes。串行复跑，没有替换正式图片或删除 decode 检查。N005 测试代码和标准未改，也未修改其正式数据。

## 预览与证据

- 生产预览：`http://localhost:3401/chim-branding-portfolio/`，复用原 Pages 预览服务。测试 fixture 输出之后重新构建正式 origin。
- 仓库外证据：`/Users/chim/Codex备份/chim-reverse-close-20261006/evidence/`。
- 最终视频：`production/reverse-close-{390,430,820,1440}.webm`；每个视频含普通关闭、Next×2 深滚动关闭、回顶后关闭及原位置恢复。
- 截图：`production/{single,chain-deep,chain-top}-{source,before-close,reverse,restored}-{width}.png`。
- 复验：`VERIFY_OUTPUT=/absolute/external/folder node scripts/verify-reverse-close.mjs`。复用 Playwright 1.55.1 + 已安装 Chrome，没有安装浏览器。
- Chrome viewport/touch 模拟已执行，未声称物理真机验收。

独立本地 commit SHA 由最终交付消息提供。Push：NO；Deploy：NO；正式数据改动：NO。

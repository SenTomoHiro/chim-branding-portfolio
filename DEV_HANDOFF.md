# DEV_HANDOFF

## STATUS

第一轮人工验收暴露的瀑布流与案例详情 404 已修复，并重新完成真实浏览器验收。

## FIXES

- 首页与 4 个定向版本改为真正的等宽瀑布流：按封面自然比例展示、按当前最短列放置，桌面 3 列、平板 2 列、手机 1 列，列内间距为 18px。
- 移除原有 `nth-child` 编辑式跨列规则、固定封面比例及封面裁切；23 张 Cover 已按自然比例重新生成，并记录实际宽高用于无跳动排版。
- 封面 URL 加尺寸版本参数，避免重新导入后被 Next Image 的旧优化缓存继续显示成历史裁切比例。
- 案例路由先对 URL 段执行一次严格解码，再与唯一正式 slug 精确匹配；没有增加 alias、重定向或兜底页面。
- Slug 校验同步支持中文等 Unicode 字母，保证既有中文 slug 在后台编辑后仍可正常保存。
- `/admin` 保持为唯一后台入口，前台未增加后台链接。

## ROOT_CAUSE

- 详情 404：当前 Next.js 动态路由参数中的中文段是百分号编码值，旧代码直接拿它与数据中的已解码 slug 比较，因此中文 slug 全部匹配失败；原 E2E 只点击了英文 slug N013，没有覆盖到问题。
- 首页非瀑布流：旧实现是 12 列编辑式 Grid，并通过 `nth-child` 指定 8/4 跨列，同时用固定 4:3、3:4 容器和 `object-fit: cover` 裁切封面；导入脚本也把封面统一裁成 1400×1050。

## DATA

- Case：23
- Published：23
- Draft：0
- 优化媒体：224 个（Cover、Hero、正文）
- 正式数据无测试草稿、测试上传或验收文案残留；默认排序、发布状态与 Drinks 优先级均已恢复。

## ROUTES

- 前台：`http://localhost:3000/`
- 定向版本：`/food`、`/drinks`、`/ip`、`/premium`
- 案例详情：`/work/[slug]`
- 后台：`http://localhost:3000/admin`

## TESTS

- TypeScript：`npx tsc --noEmit` 通过。
- Vitest：2 个测试文件、5 个核心测试，全部通过。
- Playwright / Chrome：4 个真实浏览器验收流程，全部通过。
- 23/23 个已发布案例详情逐条返回 200，页面标题、Hero 与正文媒体均通过断言。
- 代表案例 N013、N014、N005、N009、L010 已在 1440 与 390 宽度验证；包含中文 slug、旧编号案例、Next case 与返回首页。
- 后台已验证错误密码、正确密码、编辑并恢复 N009、下架再恢复、默认排序调整再恢复、Drinks 优先级调整再恢复、Cover/Hero/正文上传、删除正文上传、创建与删除测试草稿。
- E2E 使用临时内容副本，测试数据不会写入正式 `data/content.json`。

## VISUAL_QA

- Production 浏览器截图：1440×900 首页顶部/中部/底部、N009 中文详情页；390×844 首页、N013 详情页、后台列表。
- 已检查等宽列、自然比例、最短列布局、首屏位置、底部收口、中文显示、Hero、手机单列、后台布局与横向溢出。
- 浏览器 Console / pageerror：0；横向溢出：0。
- Production 后台使用当前 `.env.local` 密码真实登录成功，显示 23 条案例。

## BUILD

- Production Build：通过。
- Production Server：已实际启动于 `http://localhost:3000`。
- 最终截图与后台真实登录均在 Production Server 上完成。

## KNOWN_ISSUES

None.

## GIT

- 保留提交：`4250996 feat: build local branding portfolio`
- 保留提交：`91aa372 docs: add verified development handoff`
- 本轮提交：`fix: repair masonry layout and case routes`

## DEPLOYMENT

Not deployed.

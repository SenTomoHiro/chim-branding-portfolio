# CHIM Portfolio Additions · Website Import Report

Production set：`portfolio-additions-sol-v1`
范围：仅处理用户指定的 6 个案例任务与春莱艺人系列生产标记修正；未扫描其他 Downloads 案例。

| 案例 | Action | 源文件 | Preview 渲染输出 | Photoshop 原生导出 | 最终展示 | Chapter | Route |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 大胡子抹茶 · 品牌视觉 | create | 56 | 36 | 12 | 12 | 0 | `/work/%E5%A4%A7%E8%83%A1%E5%AD%90%E6%8A%B9%E8%8C%B6%20%C2%B7%20%E5%93%81%E7%89%8C%E8%A7%86%E8%A7%89` |
| 真心茶事 · 品牌视觉 | create | 57 | 18 | 10 | 11 | 2 | `/work/%E7%9C%9F%E5%BF%83%E8%8C%B6%E4%BA%8B%20%C2%B7%20%E5%93%81%E7%89%8C%E8%A7%86%E8%A7%89` |
| 春莱小院 · 品牌视觉 | create | 10 | 0 | 0 | 10 | 0 | `/work/%E6%98%A5%E8%8E%B1%E5%B0%8F%E9%99%A2%20%C2%B7%20%E5%93%81%E7%89%8C%E8%A7%86%E8%A7%89` |
| 文柠记 | update（L012 原位更新） | 14 | 0 | 0 | 10 | 0 | `/work/%E6%96%87%E6%9F%A0%E8%AE%B0` |
| 大胡子可可 · 冬季热饮新品系列 | create | 28 | 19 | 0 | 15 | 3 | `/work/%E5%A4%A7%E8%83%A1%E5%AD%90%E5%8F%AF%E5%8F%AF%20%C2%B7%20%E5%86%AC%E5%AD%A3%E7%83%AD%E9%A5%AE%E6%96%B0%E5%93%81%E7%B3%BB%E5%88%97` |
| 大胡子可可 × TATAN · 联名系列 | create | 12 | 118 | 0 | 12 | 2 | `/work/%E5%A4%A7%E8%83%A1%E5%AD%90%E5%8F%AF%E5%8F%AF%20%C3%97%20TATAN%20%C2%B7%20%E8%81%94%E5%90%8D%E7%B3%BB%E5%88%97` |

## Production totals

- 源文件：177
- 候选展示单元：334
- PSD / PSB 原生成功渲染：22
- AI / PDF 成功渲染：12 个源文档
- 因字体、渲染风险或生产标记跳过：4 个印刷 AI
- `241105` 裁切输出：6
- 新增 Composite：9
- 最终展示：70
- Chapter：7
- 新增案例：5
- 更新案例：1

## Native application verification

- Adobe Photoshop 27.2.0：22/22 成功，源文件覆盖 0。
- Adobe Illustrator 30.0.0：原生检查 TATAN 圣诞线上 AI 的 38 个画板；导出时隐藏“标注信息”，源文件覆盖 0。
- TATAN 入选线上稿保持原有字体完整版本；没有用缺失字体环境下的 Illustrator 输出替换。
- 春莱 SL005：隐藏“标注信息 / 各种包装线”后重导 `05.jpg`、`11.jpg`、`12.jpg`；21 张正文、顺序及“桃与乌龙 / 桃花艺人 / 桂花艺人”Chapter 均保持不变。

## Local QA

- TypeScript：pass
- Vitest：pass（11 files / 33 tests）
- Playwright local：pass（21/21）
- Playwright Pages/basePath：pass（2/2）
- Production Build：pass（72 static pages）
- Final visual validation：pass（6 cases / 70 units / 4 contact sheets / 0 errors）
- Desktop 1440×900：pass
- Mobile 390×844：pass
- Local Admin / Chapter Admin：pass
- Close-return / filter / Browser Back / direct URL fallback：pass

## Release

- Implementation commit：`c6317e3df8a033cb3f247a7f1430a9ef544da811`
- Pages run：[`35459769525`](https://github.com/SenTomoHiro/chim-branding-portfolio/actions/runs/35459769525) — success
- Online QA：pass（6 个案例、Admin 只读、desktop/mobile return、filter、Browser Back、direct fallback、console、404）

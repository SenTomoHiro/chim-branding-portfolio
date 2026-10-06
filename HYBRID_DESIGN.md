# CHIM Hybrid Immersive Design Specification

**基线**: eb213fe Fix mobile spacing: remove obsolete Masonry positioning
**备份**: backup/pre-hybrid-rebuild
**分支**: ui/hybrid-immersive

## 核心设计组合

### Hybrid 1: 首页全屏案例发现
- 390px/430px 主设计尺寸
- 每个案例一屏，纵向滑动自动对齐
- 封面全屏（100vw × 视口高度，处理安全区）
- 底部浮动标题（序号 + 品牌名 + 项目名）
- 右下角分类 Pill
- 原生滚动 + CSS scroll-snap
- 适配横图/竖图/长海报，保留完整构图
- 桌面 1440px：三列大图网格

### Hybrid 2: 沉浸式进入 + Editorial 详情
- 点击封面触发沉浸式转场
- 封面保持视觉锚点，转场到详情开篇
- 全屏开篇 = 详情第一部分（不是中间页）
- 向下进入：Title + Meta + Intro + Chapters + 正文
- 连续纵向 Editorial 阅读（不分页）
- 封面 ≠ Hero：封面承接开篇，原 Hero 在简介后完整展示
- 章节层级动效，支持 prefers-reduced-motion
- 下一案例明确入口，不自动跳转

### 导航方案 1: 右下角悬浮 Pill + Bottom Sheet
- Pill 显示当前筛选（品牌设计/商业摄影 + 分类）
- 点击展开 Bottom Sheet
- 切换后进入对应案例范围
- 触控热区 ≥44px
- 首页 + 详情均可用
- 返回顶部放左下

## 页面结构

### 首页 (/)
```
<div class="homeCarousel">
  <article class="caseSlide" data-case-id="xxx">
    <div class="slideImage">
      <img cover />
    </div>
    <div class="slideTitle">
      <span class="caseNumber">01</span>
      <h2 class="caseTitleBrand">春来山居</h2>
      <p class="caseTitleProject">Chunlai Mountain Residence</p>
    </div>
  </article>
  ...
</div>
<CategoryPill />
```

### 详情 (/work?id=xxx)
```
<div class="detailImmersive">
  <div class="detailHero">
    <img cover as opening />
  </div>
  <div class="detailContent">
    <header class="detailIntro">
      <span class="caseNumber">01</span>
      <h1>Brand + Project</h1>
      <p class="detailMeta">Category / Year</p>
      <p class="detailIntroText">intro</p>
    </header>

    <div class="detailHeroFull">
      <img original hero if different />
    </div>

    <section class="mediaFlow">
      <div class="mediaSectionHeading">Chapter</div>
      <figure>images/videos</figure>
      ...
    </section>

    <NextCaseLink />
  </div>
</div>
<CategoryPill />
<CloseButton />
```

## 关键动效

### 首页滚动对齐
- `scroll-snap-type: y proximity`（允许快速跳过）
- `scroll-snap-align: start`
- 不强制每个停一次
- 惯性滚动自动对齐

### 沉浸式转场（点击封面进入详情）
```
0ms
├─ 记录封面位置
├─ 锁定滚动
├─ 底部标题淡出

0-500ms
├─ 封面 scale(1.05) + opacity 调整
├─ 背景变深
├─ 顶部工具栏淡入
└─ 详情内容准备

500ms
└─ 恢复滚动，可向下阅读
```

### 详情滚动 Reveal
- IntersectionObserver
- 章节标题整体淡入 + translateY
- 图片淡入
- 不逐字打字机

### 关闭返回
- 浏览器 Back 返回首页
- 恢复到准确案例位置（by case ID）

## 数据适配

### 现有字段保持
- 所有 PortfolioCase 字段不变
- media 顺序、角色、章节不变
- published、业务分类、PDF 选项不变

### 展示层派生
```typescript
// 运行时计算，不持久化
function getDisplayData(case: PortfolioCase) {
  const cover = getCaseCover(case);  // 封面（首页全屏）
  const hero = getCaseHero(case);    // 原 Hero（详情正文首图）
  const body = getCaseBodyMedia(case);

  return {
    coverForOpening: cover,
    heroAfterIntro: hero?.src !== cover.src ? hero : null,
    bodyMedia: body
  };
}
```

### 无需新增字段
- 封面 = getCaseCover（现有逻辑）
- 年份 = 不展示或从 metadata 读取
- 不写入 coverImageId

## 验收标准

### 功能完整
- [ ] 首页滚动流畅，自动对齐
- [ ] 封面适配横竖图，无严重裁切
- [ ] 点击进入有明确沉浸感
- [ ] 详情连续阅读，章节清晰
- [ ] 封面/Hero 正确展示，不重复不遗漏
- [ ] 视频、Full/Half 正常
- [ ] 分类导航切换正确
- [ ] 返回恢复位置
- [ ] 下一案例明确可点
- [ ] 关闭/返回/Forward 正确

### 视觉品质
- [ ] 390px 标题不挤压
- [ ] 安全区正确处理
- [ ] 控件不遮挡内容
- [ ] 转场清晰可见
- [ ] 静态画面已有设计感

### 数据安全
- [ ] 无正式数据改动
- [ ] 后台/PDF 不受影响
- [ ] 测试通过

## 实施计划

1. 重构全局 CSS 和 tokens
2. 实现首页全屏 Carousel
3. 实现分类 Pill + Bottom Sheet
4. 实现详情沉浸式开篇
5. 实现详情 Editorial 排版
6. 实现转场动效
7. 实现路由与位置恢复
8. 桌面响应式
9. 测试与修复
10. 截图与录屏

# CASE COUNT RECONCILIATION

## Result

- Recursively discovered PDFs: **22**
- Reconciliation rows: **22**
- Invariant: **PASS**
- Confirmed new cases: **20**
- Legacy cases represented by the two multi-case PDFs: **30**
- Total cases: **50**
- Branding cases: **32**
- Photography cases: **18**

## Why the previous result was 20

The earlier V2 inventory did **not** obtain 20 by counting only top-level folders. It explicitly mapped N001–N020 to the 20 PDFs currently present under `新案例/`. The new case scanner now walks the complete repository recursively, case-insensitively matching `.pdf` and `.PDF`, including hidden and multi-level directories (except generated dependency/build directories `.git`, `.next`, and `node_modules`). It still finds exactly the same 20 new-case PDFs, plus two legacy portfolio PDFs.

The concrete source of the apparent **32** is the Branding case total: **20 new Branding cases + 12 legacy flat/Branding cases (L001–L012) = 32**. The two legacy PDFs were never one-case-per-PDF: visual rendering confirms `SC-平面设计案例.pdf` contains 12 case pages and `SC-摄影案例.pdf` contains 18 case pages. Therefore the filesystem supports 50 total cases, but only 20 PDFs qualify as `NEW_CASE_FINAL`.

No recursively discovered PDF was omitted. No extra new PDF exists in the shared workspace, so no unsupported N021+ ID was invented.

## Classification totals

- NEW_CASE_FINAL: 20
- LEGACY_REFERENCE: 2
- NON_CASE: 0
- DUPLICATE_VERSION: 0
- UNKNOWN: 0

## Per-PDF reconciliation

| PDF | Classification | Case ID | Case name | Previously omitted | Evidence / page range |
| --- | --- | --- | --- | --- | --- |
| `旧案例/SC-平面设计案例.pdf` | LEGACY_REFERENCE | L001, L002, L003, L004, L005, L006, L007, L008, L009, L010, L011, L012 | 仙兔策划·太空兔 Space Bunnies / 华南行 / 咖啡肆拾 Coffee Forty / MaxDona / 标志设计合集 I / 标志设计合集 II / 迪迈猫粮 / 胖福月饼 / hacinana / 春莱 ChunLai·品牌视觉 / 春莱 ChunLai·品牌升级 / 文柠记 | 否 | L001–L012 = pages 2–13; page 1 cover; pages 14–17 pricing/notice |
| `旧案例/SC-摄影案例.pdf` | LEGACY_REFERENCE | L013, L014, L015, L016, L017, L018, L019, L020, L021, L022, L023, L024, L025, L026, L027, L028, L029, L030 | 骄慕·养生茶 / 骄慕·枸杞原浆 / 后谷咖啡 / 七港九·港九莓莓 / 七港九·茶饮系列 / PavoMea·饼干 / PavoMea·脆栗子 / PavoMea·玛德琳蛋糕 / ALASSIS·香薰蜡烛 / mosanana·眼镜 / 迷物家居 / CT BEE·咖啡与奶茶 / 紫庐·中西餐 / 李大妈把猪脚米线 / 乌铜走银·茶与工艺 / 乌铜走银·银器首饰 / 陇上花牛苹果汁 / 春莱 ChunLai·茶饮摄影 | 否 | L013–L030 = pages 2–19; page 1 cover; pages 20–21 pricing/notice |
| `新案例/250820-W² Concept Cafe/250820-W² Concept Cafe.pdf` | NEW_CASE_FINAL | N001 | W² Concept Cafe | 否 | pages 1–33 |
| `新案例/251015-粤有福手作/251015-粤有福手作.pdf` | NEW_CASE_FINAL | N002 | 粤有福手作 | 否 | pages 1–48 |
| `新案例/251211-小满/251211-小满.pdf` | NEW_CASE_FINAL | N003 | 小满 | 否 | pages 1–36 |
| `新案例/251224-三餐好乡邻/251224-三餐好乡邻.pdf` | NEW_CASE_FINAL | N004 | 三餐好乡邻 | 否 | pages 1–26 |
| `新案例/251229-水果老爸/251229-水果老爸.pdf` | NEW_CASE_FINAL | N005 | 水果老爸 Fruits Pops | 否 | pages 1–31 |
| `新案例/260325-Oi·Coffee/260325-Oi·Coffee.pdf` | NEW_CASE_FINAL | N006 | Oi·Coffee | 否 | pages 1–41 |
| `新案例/260330-稻米香 · 湘菜小炒/260330-稻米香 · 湘菜小炒.pdf` | NEW_CASE_FINAL | N007 | 稻米香·湘菜小炒 | 否 | pages 1–33 |
| `新案例/260409-果壳里/260409-果壳里.pdf` | NEW_CASE_FINAL | N008 | 果壳里 Shell Nook | 否 | pages 1–30 |
| `新案例/260420-饭点时光/260420-饭点时光.pdf` | NEW_CASE_FINAL | N009 | 饭点时光 | 否 | pages 1–40 |
| `新案例/260428-禾之伴/260428-禾之伴.pdf` | NEW_CASE_FINAL | N010 | 禾之伴 RURU Bite | 否 | pages 1–28 |
| `新案例/260520-豚豚冰屋Tone/260520-豚豚冰屋Tone.pdf` | NEW_CASE_FINAL | N011 | 豚豚冰屋 Tone | 否 | pages 1–30 |
| `新案例/260526-郑社长满分果汁/260526-郑社长满分果汁.pdf` | NEW_CASE_FINAL | N012 | 郑社长满分果汁 | 否 | pages 1–40 |
| `新案例/260602-堡乎乎/260602-堡乎乎.pdf` | NEW_CASE_FINAL | N013 | 堡乎乎 Manual Burger | 否 | pages 1–35 |
| `新案例/260623-欢树/260623-欢树.pdf` | NEW_CASE_FINAL | N014 | 欢树 Halo Tree | 否 | pages 1–33 |
| `新案例/260629-台滋味·台式厨房/260629-台滋味·台式厨房.pdf` | NEW_CASE_FINAL | N015 | 台滋味·台式厨房 | 否 | pages 1–25 |
| `新案例/260707-荟HUI·威士忌水烟吧/260707-荟HUI·威士忌水烟吧.pdf` | NEW_CASE_FINAL | N016 | 荟 HUI·威士忌水烟吧 | 否 | pages 1–25 |
| `新案例/260717-大利村/260717-大利村.pdf` | NEW_CASE_FINAL | N017 | 大利村·手工鲜汤粉 | 否 | pages 1–30 |
| `新案例/260730-觅咔咔/260730-觅咔咔 .pdf` | NEW_CASE_FINAL | N018 | 觅咔咔 Meekaka | 否 | pages 1–33 |
| `新案例/260805-鮮燙町/260805-鮮燙町.pdf` | NEW_CASE_FINAL | N019 | 鮮燙町 Senmachi | 否 | pages 1–23 |
| `新案例/260811-巴适的钵/260811-巴适的钵.pdf` | NEW_CASE_FINAL | N020 | 巴适的钵 Awesome Bo | 否 | pages 1–20 |

## PSD recovery and website pool

- Single-layer PSDs processed: **9**
- Independent visual crops: **81**
- PARTIALLY_EXTRACTED → READY_FROM_SOURCE: **9** (L001–L009)
- Added to admin case library: **9**
- Newly published: **7** (L001–L004, L007–L009)
- Kept Draft: **2** (L005–L006 multi-brand logo collections)
- Branding case records: **32**; published: **30**; draft: **2**
- Photography case records: **18**; published: **18**; draft: **0**
- Website total: **50**; published: **48**; draft: **2**

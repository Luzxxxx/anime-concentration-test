# 二次元浓度测试 · 社区发布版（方向 D）实施计划

> 状态：待用户接受
> 范围：基于现有 `index.html` / `anime-test.html` 实施，不重写底层
> 设计依据：`.superpowers/brainstorm/community-release/visual-directions.html`（方向 D = 大厂级主视觉 A × 杂志贴纸社交感 B）
> 素材研究：`.superpowers/brainstorm/community-release/sources.md`
> 出发版：`index.html`（140,530 字节，已具备樱花学园 1.0 视觉）
> 本计划**不**修改任何正式 HTML；先建规格、清单、验收、回滚

***

## 0. 关键决策（写代码前必须先对齐）

| #   | 决策      | 结论                                                                                                                                   | 理由                                              |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| D1  | 视觉主题    | **「浓度研究所 · 通行证」**（Direction D：Hero + Magazine Stickers）                                                                              | 用户已授权 D 方案；融合 A 的"大厂登录页"沉浸感 + B 的"杂志贴纸"社交感      |
| D2  | 主色调     | 沿用樱花学园 1.0 系统（`#FFF9F5` / `#FF7FA8` / `#72CFF5` / `#A996F7` / `#79D9C0` / `#F4B84B` / `#28324B`），在 hero 区额外引入 `#FF6B6B` 渐变作为"通行证印章"色 | 避免 1.0 调色板冲突；红色限定 hero/印章/连击反馈，不进入正文            |
| D3  | 主视觉素材   | 弃用 1.0 简陋 SVG 看板娘；首页 hero 改用**作品官方宣传图/Key Visual 本地副本**（SPY×FAMILY 等 1-2 张），题目 scene/character 题改用对应作品官方图                            | `sources.md` 提示：脆弱热链 = 风险；本地副本是硬约束              |
| D4  | 角色群像    | 在 hero 与结果页用作品官方人物剪影/立绘做"档案群像"（3-4 个角色），**非泄露谜底的角度**（避免直接揭示 ID 41-48 答案）                                                             | 强化"研究所/通行证"世界观，社交分享识别度                          |
| D5  | 题图策略    | scene/character 题（ID 41-48）从原创 SVG 切换为**对应作品的官方公开图**（本地副本），改 `visual: true` 为 `imageSrc` 字段；加载失败/网络弱时降级为原 SVG                        | 版权安全：作品名是事实性引用，**单张作品图使用归原作方**；README 须补"商用需授权" |
| D6  | 题库扩展    | 在 50 题之外，新增 6-8 题 2024-2026 题（**新 ID 51-58**），独立维护，不打乱旧 ID 难度比例；`QuestionSelector` 不动                                                | 修复"标题党"风险；不动旧题可保持回归稳定                           |
| D7  | 结果分享    | 新增"分享卡"区域 + `<canvas>` 生成 PNG（1080×1920 竖图）：通行证印章 + 段位 + 浓度分 + 标签云 + Top% + 二维码                                                      | 解决"分享欲 🔴"最大短板；用 canvas 转 blob，无外部库             |
| D8  | 成绩 Top% | 通过 LocalStorage 历史样本估算（**仅本地**，**非真实排行榜**），文案显式标注"基于本地历史"                                                                            | 避免编造数据；保留"击败 X% 玩家"社交货币感                        |
| D9  | 元信息     | 在 `<head>` 加 `og:image` / `og:title` / `og:description` / `twitter:card` / `theme-color` / `canonical`                               | 满足社区分享元信息；图同分享卡导出图                              |
| D10 | 性能/无障碍  | 视觉题图片用 `loading="lazy"` + `decoding="async"`，加 `onerror` 降级到 SVG；ARIA 补 `role="img"` + 详细 `aria-label`；保持 `prefers-reduced-motion`   | 移动端首屏轻、3G 仍可答题                                  |
| D11 | 文件同步    | `index.html` 与 `anime-test.html` 内容**完全一致**（已确认 140,530 bytes），所有变更后用 `fc /b` 字节级比对校验                                                | 避免双入口漂移                                         |
| D12 | 回滚      | 每次发版前复制 `index.html` → `index-v1.x-backup.html`；变更在独立副本 `index-v2.0-dev.html` 验证，全量回测通过后原子替换                                         | 风险可控；无 git 下的最稳方案                               |

***

## 1. 当前状态分析（基于 Phase 1 探索）

### 1.1 已具备的资产

* 樱花学园 1.0 视觉系统完整（CSS 变量、看板娘 SVG、樱花飘落、收藏卡、证书）

* 50 题题库 ID 1-50，含 5 分类 × 3 难度，最新年份 2023

* 8 道原创 SVG 视觉题（ID 41-48）

* LocalStorage 历史（`anime-test-data-v1`，最多 10 条）

* SpeechSynthesis + Web Audio + Canvas 雷达图

* `prefers-reduced-motion` + 键盘操作 + `aria-label`

* 看板娘小星 SVG 约 200 行 path（首页 + 评语）

### 1.2 缺失/短板（计划要补的）

* **无 OG/Twitter/canonical meta**（grep 验证 0 匹配）

* **无 PWA manifest / service worker**（影响二次加载与"添加到主屏"）

* **题图策略**：scene/character 题只能用原创 SVG，缺乏原作辨识度

* **分享功能**：`shareResult` 仅复制纯文本（`shareResult` 函数 3035 行）

* **无 2024-2026 题目**，README 标榜"2016-2025"实则止于 2023

* **无图片懒加载与失败兜底**（目前视觉题全 SVG，不涉及 `<img>`）

* **角色群像资产**：仅小星 1 人，无其他角色视觉资产

* **模式卡 / 模式页** 缺封面图，只有 emoji icon

* **结果页缺 Top% 横向对比**

### 1.3 必须保留（用户硬约束）

* 答题流程（choice/scene/character/audio 四题型）

* 听力题（SpeechSynthesis + 6 秒超时恢复）

* 计分（基础+时间+连击+段位）

* 模式选择（10/15/20 题，3 难度分布）

* 看板娘小星（可升级为群像，但小星本身保留）

* LocalStorage 历史（不破坏 key）

* 键盘操作 / `prefers-reduced-motion`

* 樱花飘落 / 渐变背景 / 毛玻璃卡（樱花学园 1.0 DNA）

### 1.4 工程约束

* 单文件 HTML，**禁止**引入框架 / npm / 构建工具

* 外部依赖仅允许 Google Fonts（已加 `preconnect`）

* 所有图必须本地副本（`assets/images/...`），禁 CDN 热链

* 严格沿用 `index.html` ↔ `anime-test.html` 双文件同步策略

***

## 2. 目标与成功标准

### 2.1 业务目标

* **首屏 5 秒吸引力**：从"看板娘 + 信息芯片"升级为"大厂 hero + 杂志贴纸 + 通行证印章"

* **分享欲**：从"复制纯文本"升级为"一键生成 PNG 分享卡 + 复制文案 + 原生分享"

* **二刷动力**：从"历史 10 条分数"升级为"称号解锁 + 标签云 + Top% 对比"

* **时效性**：补 6-8 道 2024-2026 题目，README 与内容一致

* **版权/性能**：本地化图 + 懒加载 + 失败兜底 + 移动端 3G 仍可答题

### 2.2 验收 KPI（每项均有可测方法）

| KPI                      | 目标              | 测法                         |
| ------------------------ | --------------- | -------------------------- |
| Lighthouse Performance   | ≥ 90（移动端）       | Chrome DevTools Lighthouse |
| Lighthouse Accessibility | ≥ 95            | 同上                         |
| 首屏 LCP                   | ≤ 2.0s（3G Slow） | WebPageTest / Lighthouse   |
| 视觉题加载                    | 失败 0% / 兜底 100% | 模拟断网测试                     |
| 双文件字节级一致                 | 100%            | `fc /b` 对比                 |
| 50 题全可答                  | 100%            | 跑完 3 种模式各一次                |
| 新增题可答                    | 100%            | 标准模式抽中 1 道新题               |
| 分享卡 PNG 生成               | 100%            | 点击"保存图片"按钮产出 1080×1920     |
| 键盘可达                     | 100%            | Tab 1-9-Enter 全流程          |
| 屏幕阅读器朗读                  | 关键节点全朗读         | NVDA / VoiceOver           |

***

## 3. 实施分阶段（7 阶段 / 每阶段含交付 + 验收 + 回滚）

### 阶段 0 · 准备与基线（30 分钟）

**目标**：建立开发副本、资产目录、回滚锚点

| 任务              | 操作                                                                                                                                                                     | 产出                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 0.1 复制基线        | `copy index.html → index-v2.0-dev.html`；`copy index.html → index-v1.0-backup.html`                                                                                     | 两个备份                                            |
| 0.2 建资产目录       | `mkdir assets\images\home / assets\images\questions\41..48 / assets\images\og / assets\images\characters`                                                              | 目录树                                             |
| 0.3 采图与登记       | 手工下载 `sources.md` 中 2-3 张官方图（SPY×FAMILY、鬼灭、芙莉莲等），保存到 `assets/images/home/` 与 `assets/images/questions/`；写 `assets/images/SOURCES.md`（作品名 / 来源 URL / 下载日期 / 版权方 / 授权状态） | SOURCES.md + 2-3 张本地图                           |
| 0.4 启动本地 server | `python -m http.server 8083`                                                                                                                                           | 可访问 `http://localhost:8083/index-v2.0-dev.html` |

**验收**：

* 浏览器打开 `index-v2.0-dev.html` 与 `index.html` 表现一致

* 备份可一键替换回滚

**回滚**：直接 `copy index-v1.0-backup.html → index.html`

***

### 阶段 1 · 视觉系统重构（CSS 层，不动 JS）— 1.5 h

**目标**：将樱花学园 1.0 调色板 + 通行证主题色融入 CSS 变量；为 hero/result/share 容器预留样式

| 任务                                  | 操作                                                                                                        | 文件 / 位置                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1.1 扩充 CSS 变量                       | 在 `:root` 增加 `--passport-red: #FF6B6B`、`--passport-red-2: #FFD666`、`--passport-shadow`、`--passport-stamp` | `index.html` `style` 块首段 |
| 1.2 新增 `.pass-hero` 容器              | 全屏 hero 容器：主图 + 渐变遮罩 + 标题 + 通行证印章                                                                         | `style` 块新增              |
| 1.3 新增 `.sticker` / `.tape` 通用贴纸/胶带 | 沿用 1.0 `.mc-tape`，扩展为通用类，支持 4 种贴纸色                                                                        | `style` 块新增              |
| 1.4 新增 `.share-card` 容器             | 1080×1920 居中卡片样式（不直接渲染屏，只为 `<canvas>` 导出作 CSS 镜像）                                                         | `style` 块新增              |
| 1.5 调整 `prefers-reduced-motion`     | 加入新的 hero 动效禁用规则                                                                                          | `style` 块末段              |

**验收**：

* 在 `index-v2.0-dev.html` 加载后控制台 0 报错

* DevTools 切换 mobile 375 / desktop 1920 无横向滚动

* `prefers-reduced-motion: reduce` 启用时 hero 不动

**回滚**：单段 CSS 删除即可

***

### 阶段 2 · 首页主视觉与角色群像（HTML/JS 局部）— 2 h

**目标**：替换首页简陋看板娘，引入大厂主视觉 + 杂志贴纸 + 角色群像

| 任务             | 操作                                                                            | 关键点                           |
| -------------- | ----------------------------------------------------------------------------- | ----------------------------- |
| 2.1 替换 hero 区域 | `#page-welcome` 内 `.welcome-hero-grid` 改造为 `.pass-hero` 双栏（左文案 + 右主图）         | 桌面双栏，移动端上下排                   |
| 2.2 引入主图       | 1 张主视觉 + 2-3 张角色剪影（`<img loading="lazy" decoding="async" onerror="降级到 SVG">`） | 本地路径 `assets/images/home/...` |
| 2.3 杂志贴纸层      | 5-7 个旋转贴纸（SAKURA / No.2026 / Vol.07 / 浓度扫描中 / 通行 ✓ / etc.）                    | 沿用 1.0 贴纸写法                   |
| 2.4 通行证印章      | 右上角圆形印章动画（"次元鉴定 · PASS"）                                                      | 沿用 1.0 `.cert-stamp`          |
| 2.5 历史条        | 保留 1.0 `.welcome-history`，加 1 行"上次得分：XX · 击败本地 Top X%"                        | 显示 D8 Top%                    |
| 2.6 信息芯片改写     | "50 题库 / 4 题型 / 3 段位 / +新 2024-2026 专题"                                       | 反映题库增量                        |

**验收**：

* 首屏 5 秒内能看到主图 + 至少 3 个贴纸 + 1 个大按钮

* 移动端 375px 主图 `object-fit: cover` 不变形

* 断网模拟：主图 onerror 触发占位插画（用现有 `.kanban-svg` 做降级）

* 控制台 0 报错

**回滚**：仅 `#page-welcome` 整段替换，2.1-2.6 可独立 revert

***

### 阶段 3 · 题目图片化（scene/character 题）— 1.5 h

**目标**：8 道视觉题（ID 41-48）从原创 SVG 切换为作品官方图（本地副本），加载失败降级到原 SVG

| 任务                         | 操作                                                                                                     | 关键点                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| 3.1 字段扩展                   | 题目对象支持 `imageSrc` 字段（与 `visual: true` 互斥或同存；优先用图）                                                      | `QUESTION_BANK` 41-48 增字段 |
| 3.2 采图                     | 手工为 41-48 下载 8 张对应作品官方公开图（鬼灭、芙莉莲、LycoReco、咒术、孤独摇滚、薇尔莉特、伊之助、五条悟等），落地 `assets/images/questions/{id}.jpg` | 全部走 `SOURCES.md` 记录       |
| 3.3 `UI.renderQuestion` 分支 | `if (q.imageSrc) → 渲染 <img> + 视觉档案面板 + 角标`，否则 fallback 到 `renderVisualQuestion`                        | `index.html` `UI` 对象      |
| 3.4 兜底                     | `onerror="this.outerHTML=renderVisualQuestion(q)"` 触发原 SVG 渲染                                          | 移动端弱网 100% 可答             |
| 3.5 雷达图标签                  | "原创视觉题" 改写为 "**官方图题** 8 道"，README 同步                                                                   | 文案 + README               |

**验收**：

* 8 道图题全部能加载（模拟断网除外）

* 模拟断网：全部降级到 SVG，控制台 0 红字

* 题量未减少，标准模式仍能抽到 ≥2 视觉题

**回滚**：仅 `UI.renderQuestion` 一个函数 + 题库字段，5 分钟内可逆

***

### 阶段 4 · 结果页通行证 + 分享卡（核心创新）— 3 h

**目标**：结果页新增通行证证书 + 标签云 + Top% + 可导出 PNG 分享卡

| 任务             | 操作                                                                                                      | 关键点                     |
| -------------- | ------------------------------------------------------------------------------------------------------- | ----------------------- |
| 4.1 段位 → 称号映射  | 6 段位（萌新→入门宅→中度宅→资深宅→大佬→之神）增加 3-4 个隐藏称号（通关 / 早起鸟 / 二刷达成 / 暗影观察者），用条件解锁                                   | `Scoring` 扩展            |
| 4.2 标签云        | 根据错题分布 + 模式 + 时长生成 3-5 个标签（"老番通 / 画质党 / 音乐品味一流 / 梗博物馆 / 新番尝鲜者"）                                         | `UI.renderResult` 内置    |
| 4.3 Top% 估算    | 读取 LocalStorage 历史（最近 10 条），按 `1 - rank/总人数` 计算；无历史时显示"首个通行证持有者"                                        | `Storage.getTopPercent` |
| 4.4 分享卡 DOM 镜像 | `.share-card` 容器（屏外 `position:absolute; left:-9999px`），与 `.result-hero` 同字段填充                           | 用于 canvas 截取            |
| 4.5 PNG 生成     | 新增 `function exportShareCard()`：用 `html2canvas` ❌（禁外部库）→ **用原生 Canvas 手动绘制**（通行证印章、段位、分数、Top%、标签、二维码占位） | 1080×1920 竖图            |
| 4.6 二维码        | 用纯 JS 实现的 QR 码库（≤ 5KB，CDN 不允许，inline 实现简化版可放本地）                                                         | 扫码回到 `index.html` 主页    |
| 4.7 原生分享       | `navigator.share({title, text, files: [pngBlob]})`，不支持时降级为"下载 PNG + 复制文案"                               | `Web Share API`         |
| 4.8 复制文案升级     | 在 `shareResult` 之上加"长按图片保存"提示 + emoji 排版                                                                | 1.0 函数保留兼容              |

**验收**：

* 分享卡 PNG 导出尺寸 1080×1920，无锯齿，文字可读

* iOS Safari / Android Chrome 触发原生分享面板（如可用）

* 不支持时降级下载，文案与图同时可分享

* 控制台 0 报错；不阻塞主流程

**回滚**：新增模块独立（4.1-4.7 各自函数），不污染 1.0 评分/段位逻辑

***

### 阶段 5 · 题库增量（2024-2026 专题）— 1 h

**目标**：新增 6-8 题 2024-2026 作品，**不动旧 ID**

| 任务            | 操作                                                                                                                                                                                                                                                                            | 关键点         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 5.1 题表扩展      | 在 `QUESTION_BANK` 末尾追加 8 题（ID 51-58），覆盖 2024-2026 现象级作品：《葬送的芙莉莲 第二季》（如有） / 《药屋少女的呢喃》 / 《咒术回战 怀玉·玉折》 / 《我的英雄学院 最终季》 / 《孤独摇滚！》（已在 ID 16、47） / 、《BanG Dream! It's MyGO!!!!!》 / 、《葬送的芙莉莲》 / 、《鬼灭之刃 柱训练篇》 / 、《败北女角太多了》 / 《不动产介护人员的不在场证明》 / 《Re:从零开始的异世界生活 3rd season》 / 《蓝色禁区 第二季》 | 每个 ID 注明来源  |
| 5.2 难度分布      | 6 中 + 2 难（不动标准模式 50% 中等比例）                                                                                                                                                                                                                                                    | 与 1.0 一致    |
| 5.3 README 同步 | "2016-2025" 改为 "2016-2026"；题数 50→58                                                                                                                                                                                                                                           | 文案真实化       |
| 5.4 字段校验      | 4 选项 / `answer` 0-3 / `category` 合法枚举 / 视觉题无 `imageSrc`（避免引用未下载图）                                                                                                                                                                                                             | 自动化 grep 校验 |

**验收**：

* 标准模式 15 题中至少能抽到 1 道新题

* 6 中 + 2 难分布正确

* README 与题库一致

**回滚**：仅在 `QUESTION_BANK` 末尾追加 8 行，5.1 删除即可

***

### 阶段 6 · 性能 / 无障碍 / 元信息（社区分享基建）— 1 h

**目标**：满足 2.2 验收 KPI

| 任务                          | 操作                                                                                                                       | 关键点          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 6.1 OG / Twitter meta       | `<head>` 增加 `og:title/description/image/url` 与 `twitter:card="summary_large_image"`，图 = `assets/images/og/cover.png`     | 静态图 1200×630 |
| 6.2 theme-color / canonical | 加 `theme-color=#FF6B6B` 与 `canonical=当前域`                                                                                | 标准 meta      |
| 6.3 图片懒加载                   | 所有 `<img>` 加 `loading="lazy" decoding="async"`；hero 主图用 `fetchpriority="high"`                                           | 原生 API       |
| 6.4 失败兜底                    | 所有 `<img>` 必含 `onerror` 降级                                                                                               | 阶段 3 已建      |
| 6.5 ARIA 强化                 | hero `<img role="img" aria-label="浓度研究所封面">`；分享卡 `<section aria-label="通行证分享卡">`；Top% `<span aria-label="击败本地历史 X% 玩家">` | 屏幕阅读器        |
| 6.6 焦点可见                    | `:focus-visible` 已存在，验证 tab 顺序 1-9 通过                                                                                    | 键盘可达         |
| 6.7 Service Worker（轻量）      | 新建 `sw.js`：缓存 index.html + CSS/JS 内联（已在 HTML 内） + assets/images 全部                                                       | 二次加载 < 200ms |
| 6.8 PWA manifest            | 新建 `manifest.json`：name / short\_name / start\_url / display=standalone / theme\_color / icons（192/512）                  | 可"添加到主屏"     |

**验收**：

* Lighthouse Performance ≥ 90，Accessibility ≥ 95

* 模拟 3G Slow LCP ≤ 2.0s

* Chrome DevTools 切 Slow 3G 二次访问 < 1s

* 屏幕阅读器朗读 hero / 段位 / Top% / 分享按钮

**回滚**：6.1-6.8 全部为新增文件/标签，删除即可

***

### 阶段 7 · 双文件同步 + 全量回归 — 1 h

**目标**：保证 `index.html` ↔ `anime-test.html` 字节级一致

| 任务          | 操作                                                                                   | 关键点                    |
| ----------- | ------------------------------------------------------------------------------------ | ---------------------- |
| 7.1 同步文件    | `copy index-v2.0-dev.html → index.html`；`copy index-v2.0-dev.html → anime-test.html` | PowerShell `Copy-Item` |
| 7.2 字节级校验   | `fc /b index.html anime-test.html`                                                   | 输出一致为通过                |
| 7.3 浏览器全量回归 | 桌面 Chrome / Edge / Firefox；移动端 375 / 414                                             | 记录测试报告                 |
| 7.4 题库回归    | 标准模式 5 次随机抽取，覆盖 50+8 题至少 1 次                                                         | 题库无遗漏                  |
| 7.5 分享卡回归   | 导出 PNG 至少 1 次                                                                        | 文件大小 > 100KB，尺寸正确      |
| 7.6 备份收尾    | `index-v1.0-backup.html` 保留；`index-v2.0-dev.html` 改名为 `index-v2.0-backup.html`       | 无 dev 残留               |
| 7.7 文档更新    | README 更新"🌸 樱花学园"为"🌸 通行证"；更新文件结构表；新增"v2.0 升级说明"章节                                  | 单文件说明                  |
| 7.8 测试报告    | 更新 `测试报告.md`：`现状/变更/测试/回滚` 四段                                                        | 交付凭据                   |

**验收**：

* 双文件字节级一致

* 三浏览器 + 移动端 0 控制台报错

* 测试报告 4 段齐全

**回滚**：见 §4

***

## 4. 回滚策略

### 4.1 原子回滚（5 秒）

```powershell
# 回滚到 v1.0 樱花学园
copy /Y index-v1.0-backup.html index.html
copy /Y index-v1.0-backup.html anime-test.html
```

### 4.2 阶段级回滚

* 阶段 1-2（CSS / HTML 结构）→ 复制 `index-v1.0-backup.html`，全量重做

* 阶段 3（题图）→ `git`-less 环境下，恢复 `QUESTION_BANK` 41-48 的 `visual: true`，删除 `imageSrc`

* 阶段 4（分享卡）→ 独立函数 / 模块，单独 disable 即可

* 阶段 5（题库）→ 删除 ID 51-58 共 8 行

* 阶段 6（meta / PWA）→ 删除新增标签 / `sw.js` / `manifest.json`

* 阶段 7（同步）→ 字节级差异时直接 `fc` 比对定位

### 4.3 风险预案

| 风险                | 触发       | 预案                                           |
| ----------------- | -------- | -------------------------------------------- |
| 作品图下载失败 / 来源失效    | 阶段 0 / 3 | 降级到原 SVG，题照常可答                               |
| 原生分享 API 不可用      | 阶段 4     | 降级为"下载 PNG + 复制文案"                           |
| Lighthouse 仍 < 90 | 阶段 6 后   | 优化点：删 `body::after` 圆点背景、缩 `Google Fonts` 子集 |
| 双文件漂移             | 阶段 7     | `fc /b` 不一致时立即停止发版                           |

***

## 5. 文件与产物清单

### 5.1 修改的文件

* `index.html`（含 1.0 升级到 2.0 全部变更）

* `anime-test.html`（与 index.html 同步）

* `README.md`（章节更新）

### 5.2 新增的文件

* `index-v1.0-backup.html`（回滚锚点）

* `index-v2.0-backup.html`（发版前留档）

* `index-v2.0-dev.html`（开发副本）

* `manifest.json`（PWA 入口）

* `sw.js`（轻量 Service Worker）

* `assets/images/home/{cover,anya,anya-family}.jpg`（主图 1-3 张）

* `assets/images/questions/{41..48}.jpg`（8 张题图）

* `assets/images/characters/{1..4}.jpg`（角色群像 3-4 张）

* `assets/images/og/cover.png`（社交分享静态图 1200×630）

* `assets/images/SOURCES.md`（来源与版权登记）

* `docs/plans/2026-07-14-community-release-redesign.md`（本计划）

* `测试报告.md`（v2.0 测试结果）

### 5.3 清理的文件

* `index-cyber-backup.html` / `anime-test-cyber-backup.html`（1.0 之前的赛博版）→ **保留**，不动

* `index-backup.html` / `index-before-rebuild.html` / `index-baoyun-backup.html`（更早版本）→ **保留**，不动

***

## 6. 时间与节奏（参考用，待实施时核对）

| 阶段 | 预估    | 累计     | 关键路径             |
| -- | ----- | ------ | ---------------- |
| 0  | 0.5 h | 0.5 h  | 采图与 SOURCES.md   |
| 1  | 1.5 h | 2.0 h  | CSS 变量 + 新容器     |
| 2  | 2.0 h | 4.0 h  | 首页 hero + 角色群像   |
| 3  | 1.5 h | 5.5 h  | 题图本地化 + 兜底       |
| 4  | 3.0 h | 8.5 h  | 分享卡 PNG 生成（最重）   |
| 5  | 1.0 h | 9.5 h  | 题库 2024-2026 增量  |
| 6  | 1.0 h | 10.5 h | PWA / meta / 无障碍 |
| 7  | 1.0 h | 11.5 h | 同步 + 回归 + 文档     |

**总预估 \~ 11.5 h**（含回归与文档，不含版权沟通时长）

***

## 7. 验收签字（实施完成后填写）

* [ ] 阶段 0-7 全部 ✓

* [ ] `fc /b index.html anime-test.html` 输出一致

* [ ] Lighthouse Performance ≥ 90 / Accessibility ≥ 95（移动端）

* [ ] 8 道视觉题在 3G Slow 下全部能答（兜底生效）

* [ ] 分享卡 PNG 1080×1920 导出成功

* [ ] 50+8 题库全可抽

* [ ] README 与代码一致

* [ ] `测试报告.md` 四段齐全

* [ ] 桌面 Chrome / Edge / Firefox 通过

* [ ] 移动端 375 / 414 通过

* [ ] 回滚演练：1 次原子回滚 + 1 次阶段级回滚

***

> 计划完成。等待用户接受后进入实施。


# 角色性格匹配引擎设计文档

## 1. 概述

### 1.1 项目背景
当前"二次元浓度测试"项目主要通过分数来评估用户的二次元知识水平，但分数本身缺乏情感共鸣和社交分享驱动力。角色性格匹配引擎旨在将冷冰冰的分数转化为有情感共鸣的角色身份，从而显著提升社交分享率和用户留存。

### 1.2 核心价值
- **从"分数"到"身份"**：给用户一个具有辨识度的二次元角色身份
- **社交裂变**：驱动用户分享测试结果到社交媒体
- **稀有度机制**：制造"抽卡感"，激励用户多次测试

### 1.3 目标指标
| 指标 | 预期提升 |
|------|----------|
| 社交分享率 | 300% |
| 用户留存 | 200% |
| 传播范围 | 150% |
| 用户满意度 | 250% |

---

## 2. 性格维度设计

### 2.1 六个性格维度

| 维度 | 英文 | 对应分类 | 描述 | 衡量方式 |
|------|------|----------|------|----------|
| 🗡️ 热血度 | passion | anime | 对动画剧情和角色的了解程度 | anime分类正确率 |
| 🎮 游戏力 | gaming | game | 游戏知识储备和游戏经验 | game分类正确率 |
| 🎤 声优控 | voice | voice | 对声优文化的熟悉程度 | voice分类正确率 |
| 🤣 玩梗力 | meme | meme | 对网络流行梗的敏感度 | meme分类正确率 |
| 📚 博学度 | knowledge | knowledge | 对ACGN行业知识的了解 | knowledge分类正确率 |
| ⚡ 反应力 | reaction | 答题行为 | 平均答题速度（秒/题） | 答题时间统计 |

### 2.2 维度计算公式

```
热血度 = (anime正确数 / anime题目总数) × 100
游戏力 = (game正确数 / game题目总数) × 100
声优控 = (voice正确数 / voice题目总数) × 100
玩梗力 = (meme正确数 / meme题目总数) × 100
博学度 = (knowledge正确数 / knowledge题目总数) × 100
反应力 = max(0, 100 - 平均答题时间 × 5)  // 越快得分越高
```

---

## 3. 角色原型数据库

### 3.1 稀有度分级

| 稀有度 | 概率 | 标识 | 视觉效果 |
|--------|------|------|----------|
| SSR（传说级） | 5% | 🌟 | 金色边框 + 闪光动画 |
| SR（稀有级） | 20% | ✨ | 紫色边框 + 渐变效果 |
| R（普通级） | 75% | 💫 | 蓝色边框 |

### 3.2 角色原型库（20个）

#### SSR角色（5个）
| 角色原型 | 称号 | 经典台词 | 配色方案 | 目标分数向量 |
|----------|------|----------|----------|--------------|
| 战术大师·鲁路修型 | 吾乃世界之王 | "All Hail Britannia!" | 紫/金 | {passion:70, gaming:50, voice:40, meme:60, knowledge:90, reaction:85} |
| 究极生物·DIO型 | 世界的统治者 | "THE WORLD!" | 黄/黑 | {passion:85, gaming:70, voice:60, meme:80, knowledge:75, reaction:90} |
| 最强咒术师·五条悟型 | 天上天下唯我独尊 | "我很强" | 白/粉 | {passion:80, gaming:65, voice:50, meme:70, knowledge:60, reaction:95} |
| 进击巨人·艾伦型 | 自由的战士 | "我要把所有巨人都驱逐出去" | 绿/红 | {passion:95, gaming:40, voice:50, meme:60, knowledge:70, reaction:80} |
| 骑士王·Saber型 | 不列颠之王 | "我问你，你是我的Master吗？" | 蓝/金 | {passion:75, gaming:55, voice:65, meme:40, knowledge:85, reaction:85} |

#### SR角色（8个）
| 角色原型 | 称号 | 经典台词 | 配色方案 | 目标分数向量 |
|----------|------|----------|----------|--------------|
| 超能力少女·阿尼亚型 | 瓜瓜~ | "wakuwaku!" | 粉/紫 | {passion:85, gaming:60, voice:70, meme:85, knowledge:50, reaction:70} |
| 鬼族少女·祢豆子型 | 鬼灭之刃 | "唔姆~" | 粉/黑 | {passion:90, gaming:30, voice:50, meme:60, knowledge:60, reaction:75} |
| 女仆恶魔·蕾姆型 | 从零开始 | "拉姆和蕾姆，永远是你的仆人" | 蓝/白 | {passion:70, gaming:50, voice:80, meme:60, knowledge:65, reaction:80} |
| 龙女仆·康娜型 | 小林家的龙 | "托尔~" | 绿/白 | {passion:75, gaming:70, voice:85, meme:75, knowledge:40, reaction:60} |
| 黑衣剑士·桐人型 | 双刀流 | "我会回来的" | 黑/蓝 | {passion:60, gaming:95, voice:40, meme:50, knowledge:55, reaction:85} |
| 嘴平少年·炭治郎型 | 水之呼吸 | "我要让祢豆子变回人类" | 红/绿 | {passion:95, gaming:35, voice:60, meme:50, knowledge:65, reaction:70} |
| 爆裂魔法·惠惠型 | 红魔族 | "爆裂魔法！" | 红/黑 | {passion:80, gaming:75, voice:55, meme:80, knowledge:45, reaction:65} |
| 万事屋老板·银时型 | 天然卷 | "糖分就是力量!" | 银/红 | {passion:70, gaming:50, voice:60, meme:95, knowledge:55, reaction:75} |

#### R角色（7个）
| 角色原型 | 称号 | 经典台词 | 配色方案 | 目标分数向量 |
|----------|------|----------|----------|--------------|
| 普通二次元爱好者 | 热爱ACGN | "今天也是美好的一天" | 灰/蓝 | {passion:50, gaming:50, voice:50, meme:50, knowledge:50, reaction:50} |
| 轻度宅 | 悠闲玩家 | "偶尔看看动画也不错" | 浅蓝/白 | {passion:60, gaming:40, voice:40, meme:50, knowledge:45, reaction:40} |
| 硬核考据党 | 细节控 | "让我研究一下" | 深蓝/金 | {passion:40, gaming:40, voice:40, meme:30, knowledge:90, reaction:30} |
| 梗图大师 | 快乐源泉 | "哈哈哈哈" | 橙/黄 | {passion:40, gaming:40, voice:30, meme:95, knowledge:40, reaction:60} |
| 声优控 | 声豚 | "这个声音好治愈" | 粉/紫 | {passion:50, gaming:30, voice:95, meme:40, knowledge:45, reaction:50} |
| 游戏肝帝 | 全成就 | "这个游戏我肝定了" | 绿/黑 | {passion:30, gaming:95, voice:30, meme:40, knowledge:40, reaction:70} |
| 动画收藏家 | 补番达人 | "还有这个没看过" | 红/白 | {passion:90, gaming:30, voice:50, meme:40, knowledge:55, reaction:40} |

---

## 4. 匹配算法设计

### 4.1 算法流程

```
步骤1：计算用户各维度得分（0-100）
步骤2：计算用户与每个角色的加权距离
步骤3：选取距离最小的3个角色作为候选
步骤4：根据稀有度概率进行最终匹配
步骤5：生成匹配结果和性格标签
```

### 4.2 加权距离算法

```javascript
function calculateMatch(userScores, character) {
  let distance = 0;
  const dimensions = ['passion', 'gaming', 'voice', 'meme', 'knowledge', 'reaction'];
  
  for (const dim of dimensions) {
    const diff = userScores[dim] - character.targetScores[dim];
    distance += Math.pow(diff * character.weights[dim], 2);
  }
  
  const normalizedDistance = Math.sqrt(distance) / 2;
  return Math.max(0, 100 - normalizedDistance);
}
```

### 4.3 角色权重配置

每个角色的维度权重反映了该角色最核心的特质：

```javascript
{
  '战术大师·鲁路修型': { passion: 1.0, gaming: 0.5, voice: 0.3, meme: 0.8, knowledge: 1.5, reaction: 1.0 },
  '究极生物·DIO型': { passion: 1.5, gaming: 1.0, voice: 0.8, meme: 1.2, knowledge: 1.0, reaction: 1.5 },
  '最强咒术师·五条悟型': { passion: 1.0, gaming: 0.8, voice: 0.5, meme: 0.8, knowledge: 0.5, reaction: 1.5 },
  // ... 其他角色权重
}
```

### 4.4 稀有度概率修正

```javascript
function finalizeMatch(candidates) {
  // 按匹配度排序
  candidates.sort((a, b) => b.matchScore - a.matchScore);
  
  const primaryCandidate = candidates[0];
  
  // SSR需要极高匹配度 + 5%概率
  if (primaryCandidate.rarity === 'SSR') {
    if (primaryCandidate.matchScore >= 85 && Math.random() < 0.05) {
      return primaryCandidate;
    }
    return candidates.find(c => c.rarity === 'SR') || candidates[1];
  }
  
  // SR需要较高匹配度 + 20%概率
  if (primaryCandidate.rarity === 'SR') {
    if (primaryCandidate.matchScore >= 70 && Math.random() < 0.20) {
      return primaryCandidate;
    }
    return candidates.find(c => c.rarity === 'R') || candidates[1];
  }
  
  return primaryCandidate;
}
```

---

## 5. 性格标签系统

### 5.1 标签生成规则

| 分数范围 | 标签 |
|----------|------|
| ≥80 | 热血少年/游戏达人/声优鉴定师/梗图王者/业界大佬/闪电侠 |
| 60-79 | 二次元爱好者/游戏玩家/声控/玩梗爱好者/爱好者/快手 |
| <60 | 萌新/路人/轻度兴趣/偶尔玩梗/小白/慢慢来 |

### 5.2 标签组合示例

```
热血度85% + 博学度72% + 玩梗力65% → ["热血少年", "爱好者", "玩梗爱好者"]
游戏力92% + 反应力88% → ["游戏达人", "闪电侠"]
```

---

## 6. 灵魂伴侣系统

### 6.1 伴侣匹配逻辑

每个角色有一个预设的灵魂伴侣列表：

```javascript
{
  '战术大师·鲁路修型': { partner: 'CC', compatibility: 95 },
  '究极生物·DIO型': { partner: '乔斯达家族', compatibility: 80 },
  '最强咒术师·五条悟型': { partner: '伏黑惠', compatibility: 90 },
  '超能力少女·阿尼亚型': { partner: '黄昏', compatibility: 98 },
  // ...
}
```

### 6.2 兼容性计算

```javascript
function calculateCompatibility(userCharacter, friendCharacter) {
  const base = userCharacter.partner.compatibility || 70;
  const dimDiff = calculateDimensionDifference(userCharacter, friendCharacter);
  return Math.max(50, base - dimDiff);
}
```

---

## 7. 角色身份卡设计

### 7.1 卡片布局

```
┌─────────────────────────────────────────┐
│  二次元浓度研究所                        │
│  ───────────────────────────────────    │
│                                         │
│    [SVG头像]    SSR 战术大师·鲁路修型    │
│                                         │
│    称号：吾乃世界之王                    │
│    匹配度：92%                           │
│                                         │
│    ┌──────┬──────┬──────┬──────┐        │
│    │热血度│游戏力│声优控│玩梗力│        │
│    │ 78   │ 56   │ 42   │ 68   │        │
│    └──────┴──────┴──────┴──────┘        │
│    ┌──────┬──────┐                      │
│    │博学度│反应力│                      │
│    │ 95   │ 88   │                      │
│    └──────┴──────┘                      │
│                                         │
│    经典台词："All Hail Britannia!"       │
│                                         │
│    你的二次元灵魂伴侣：CC                 │
│    兼容性：95%                           │
│                                         │
│    📱 扫码测试你的二次元角色身份          │
└─────────────────────────────────────────┘
```

### 7.2 卡片元素规范

| 元素 | 规格 | 样式 |
|------|------|------|
| 背景 | 渐变矩形 | 角色配色渐变 |
| 边框 | 2px圆角 | 稀有度对应颜色 |
| 头像 | SVG | 50x50px，居中 |
| 角色名称 | 18px粗体 | 白色/黑色 |
| 称号 | 14px普通 | 浅灰/深灰 |
| 匹配度 | 16px粗体 | 金色 |
| 维度分数 | 12px | 标签式 |
| 台词 | 13px斜体 | 白色/黑色 |
| 伴侣信息 | 12px | 居中 |
| 二维码 | 80x80px | 底部右侧 |

### 7.3 Canvas图片生成

使用Canvas API生成可下载的PNG图片：

```javascript
function generateCharacterCard(result) {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  
  // 绘制背景渐变
  const gradient = ctx.createLinearGradient(0, 0, 0, 800);
  gradient.addColorStop(0, result.colors[0]);
  gradient.addColorStop(1, result.colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 800);
  
  // 绘制边框
  ctx.strokeStyle = result.rarity === 'SSR' ? '#FFD700' : 
                    result.rarity === 'SR' ? '#9932CC' : '#4169E1';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 560, 760);
  
  // ... 绘制其他元素
  
  return canvas.toDataURL('image/png');
}
```

---

## 8. 社交分享设计

### 8.1 分享文案模板

```
🎮 我在二次元浓度研究所测出了SSR级角色！

👑 角色：战术大师·鲁路修型
🏆 称号：吾乃世界之王
📊 匹配度：92%

⚡ 热血度：78%  🎮 游戏力：56%
🎤 声优控：42%  🤣 玩梗力：68%
📚 博学度：95%  ⚡ 反应力：88%

灵魂伴侣：CC（兼容性95%）

快来测测你的二次元角色身份吧！
👉 [二维码/链接]
```

### 8.2 社交裂变机制

| 机制 | 功能描述 |
|------|----------|
| 灵魂伴侣匹配 | 显示"你的二次元灵魂伴侣是谁"，引导好友测试 |
| 排行榜对比 | "你击败了全国XX%的二次元爱好者" |
| 稀有度炫耀 | "恭喜获得SSR角色！仅5%的用户拥有" |
| 好友挑战 | "挑战好友，看谁的角色更稀有" |
| 角色收集 | "收集更多角色，解锁成就" |

---

## 9. UI交互设计

### 9.1 匹配结果页面流程

```
答题完成 → 加载动画（角色匹配中）→ 结果展示（稀有度特效）→ 详细分析 → 分享/下载
```

### 9.2 加载动画

- 显示"正在分析你的二次元DNA..."
- 雷达图逐步绘制
- 角色卡片翻转入场动画

### 9.3 稀有度特效

| 稀有度 | 特效 |
|--------|------|
| SSR | 金色闪光 + 粒子效果 + 音效 |
| SR | 紫色光晕 + 渐变动画 |
| R | 蓝色涟漪效果 |

### 9.4 交互按钮

| 按钮 | 功能 | 位置 |
|------|------|------|
| 重新测试 | 重新答题刷新角色 | 底部左侧 |
| 下载卡片 | 保存角色身份卡图片 | 底部中间 |
| 分享 | 分享到微信/朋友圈 | 底部右侧 |
| 查看详情 | 查看完整分析报告 | 卡片下方 |

---

## 10. 技术实现方案

### 10.1 架构设计

```
┌─────────────────────────────────────┐
│            UI层                     │
│  结果展示页 / 角色卡片 / 分享面板    │
├─────────────────────────────────────┤
│            业务层                   │
│  CharacterMatcher (匹配算法)        │
│  ScoreCalculator (分数计算)         │
│  CardGenerator (卡片生成)           │
├─────────────────────────────────────┤
│            数据层                   │
│  CHARACTER_DB (角色数据库)          │
│  localStorage (用户数据存储)        │
└─────────────────────────────────────┘
```

### 10.2 文件结构

```
index.html
├── <script>
│   ├── CHARACTER_DB (角色数据库)
│   ├── ScoreCalculator (分数计算)
│   ├── CharacterMatcher (匹配算法)
│   ├── CardGenerator (卡片生成)
│   └── ResultUI (结果页面)
└── <style>
    └── character-card.css (角色卡片样式)
```

### 10.3 性能优化

| 优化点 | 方案 |
|--------|------|
| 预加载SVG | 将所有角色SVG头像内联到HTML中 |
| 算法复杂度 | O(n)，n=20，非常快 |
| Canvas生成 | 使用离屏Canvas，避免阻塞UI |
| 图片缓存 | 生成的卡片缓存到localStorage |

---

## 11. 数据存储

### 11.1 用户数据结构

```javascript
{
  userId: 'uuid',
  testHistory: [
    {
      timestamp: 1689345600000,
      score: 85,
      character: '战术大师·鲁路修型',
      rarity: 'SSR',
      matchScore: 92,
      dimensionScores: { passion: 78, gaming: 56, voice: 42, meme: 68, knowledge: 95, reaction: 88 },
      tags: ['热血少年', '业界大佬', '闪电侠'],
      partner: { name: 'CC', compatibility: 95 }
    }
  ],
  achievements: ['first_test', 'ssr_unlock'],
  shareCount: 3
}
```

### 11.2 存储策略

| 数据 | 存储方式 | 有效期 |
|------|----------|--------|
| 用户ID | localStorage | 永久 |
| 测试记录 | localStorage | 永久 |
| 当前结果 | sessionStorage | 会话期间 |
| 生成的卡片 | localStorage | 7天 |

---

## 12. 边界情况处理

### 12.1 异常场景

| 场景 | 处理方案 |
|------|----------|
| 所有分类题目数为0 | 默认返回"普通二次元爱好者" |
| 答题时间极长 | 反应力设为最低分 |
| 匹配度相同 | 按稀有度优先级选择 |
| Canvas生成失败 | 提供备用的HTML截图方案 |
| 分享失败 | 提示用户手动保存图片 |

### 12.2 兼容性处理

| 浏览器 | 支持情况 | 降级方案 |
|--------|----------|----------|
| Chrome/Firefox | 完全支持 | - |
| Safari | 完全支持 | - |
| IE11 | 不支持Canvas导出 | 显示HTML卡片 |
| 微信内置浏览器 | 支持 | 使用微信API分享 |

---

## 13. 测试计划

### 13.1 单元测试

| 测试项 | 测试用例 |
|--------|----------|
| 分数计算 | 全对/全错/部分对 |
| 匹配算法 | 已知分数匹配预期角色 |
| 稀有度概率 | 大量测试验证概率分布 |
| 卡片生成 | 不同角色生成正确图片 |

### 13.2 集成测试

| 测试项 | 测试用例 |
|--------|----------|
| 完整流程 | 答题→匹配→展示→分享 |
| 重新测试 | 多次测试验证结果多样性 |
| 数据持久化 | 刷新页面保持数据 |

---

## 14. 里程碑

| 阶段 | 任务 | 完成标准 |
|------|------|----------|
| 第一阶段 | 角色数据库设计与实现 | 20个角色数据录入完成 |
| 第二阶段 | 匹配算法实现 | 算法通过单元测试 |
| 第三阶段 | 结果页面UI | 页面设计稿完成 |
| 第四阶段 | 卡片生成功能 | Canvas图片生成成功 |
| 第五阶段 | 分享功能 | 分享面板和文案生成 |
| 第六阶段 | 测试与优化 | 通过集成测试，性能达标 |

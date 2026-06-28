# AuraGarden v1.0.1 迭代计划

版本：v1.0.1  
文档状态：计划目标版  
基线版本：v1.0.0 高保真可点击原型  
最后更新：2026-06-27

## 1. 迭代定位

v1.0.0 已经完成产品叙事、高保真 UI、核心页面和跳转关系。v1.0.1 的目标不是继续堆页面，而是把最关键的体验从「静态图可点击」推进到「真实可交互、可验证业务假设」。

一句话目标：  
**把 AuraGarden 的灵性测试、灵性画像、灵性养成和珠宝显化四个核心环节做成组件化 MVP，让用户可以真实选择、获得结果、积累成长，并进入商业转化。**

## 2. 本版本目标

### 2.1 产品目标

- 验证用户是否愿意完成一次完整的灵性测试。
- 验证融合画像是否能让用户产生「这个结果像我」的认同感。
- 验证 Growth 灵性养成是否能形成继续练习的动机。
- 验证用户是否愿意从画像和成长奖励进入 Jewelry 定制。
- 验证珠宝定制页的选择项、推荐理由和下单意愿之间是否成立。

### 2.2 体验目标

- Test 页面支持真实选择、取消、继续。
- Profile 页面能根据输入展示动态生成的灵性画像。
- Growth 页面支持任务勾选、经验值变化和维度成长反馈。
- Jewelry 页面支持宝石、金属、吊坠、尺寸的真实选择。
- 用户在完成测试后，能看到自己的选择如何影响画像、练习和珠宝推荐。

### 2.3 研发目标

- 从图片原型开始转为可维护 React 组件。
- 保留 v1.0.0 高保真 UI 作为视觉基准。
- 先做前端本地状态和规则表，不急于接入真实后端。
- 建立后续可接入账号、订单、支付和画像算法的基础数据结构。

## 3. 版本范围

### 3.1 必做范围

| 模块 | v1.0.1 目标 | 说明 |
| --- | --- | --- |
| Test | 组件化每日灵性测试 | 选中/取消、继续、结果写入本地状态 |
| Profile | 动态灵性画像 | 根据测试和规则表展示 Archetype、维度、建议 |
| Growth | 组件化养成任务 | 任务勾选、经验值、维度进度变化 |
| Jewelry | 组件化定制选择 | Stone / Metal / Charm / Size 选择和推荐理由 |
| Rules | 灵性画像规则表 | 用可配置规则连接测试、画像、养成、珠宝 |
| Tracking | 基础事件埋点结构 | 先在前端记录事件，后续可接数据平台 |

### 3.2 可选范围

| 模块 | 说明 |
| --- | --- |
| Circle | 可保留静态图，暂不做发帖和互动 |
| Checkout | 可保持静态流程，暂不接真实支付 |
| Production Tracker | 可保持静态流程，暂不接真实订单状态 |
| 多语言 | 先整理文案结构，不做完整 i18n |

### 3.3 明确不做

- 不做真实支付接入。
- 不做真实注册登录。
- 不做完整后端。
- 不做生产工厂系统。
- 不做复杂 AI 生成画像。
- 不重做全部页面 UI。

## 4. 核心设计原则

### 4.1 灵性养成优先

AuraGarden 的核心不是珠宝商城，而是灵性成长系统。所有商业转化都应该来自用户对自己画像和成长阶段的认同。

v1.0.1 中，测试、画像、任务、珠宝推荐必须形成闭环：

`测试选择 -> 画像更新 -> 成长建议 -> 珠宝推荐 -> 继续练习`

### 4.2 规则可解释

用户需要知道结果为什么出现。v1.0.1 不追求复杂算法，而是先建立清晰可解释的规则。

示例：

- 用户选择 Protection，Protection 维度增加。
- 若八字元素偏 Wood / Water，则推荐 Green Aventurine、Clear Quartz。
- 若塔罗镜像为 The Star，则今日建议偏向 gentle healing、hope、restoration。
- 若 Growth 中 Protection 达到指定等级，则解锁 Guardian Charm。

### 4.3 不破坏高保真视觉

v1.0.1 组件化时，应以 v1.0.0 的 UI 图为视觉基准。优先组件化关键交互区，不需要一次性重构全部页面。

建议顺序：

1. Test
2. Profile
3. Growth
4. Jewelry

## 5. 关键用户路径

### 5.1 每日测试到画像

流程：

1. 用户进入 Test。
2. 选择当日能量需求：Clarity / Protection / Love / Grounding。
3. 可选抽取一张 Mirror Card。
4. 点击 Continue。
5. Profile 根据选择更新今日画像解释和五维分数。

验收：

- 用户可以选中和取消选项。
- Continue 前有明确选中状态。
- Profile 能展示本次选择带来的变化。

### 5.2 画像到养成

流程：

1. 用户在 Profile 查看 Soul Archetype。
2. 点击 Begin today's practice。
3. 进入 Growth。
4. 系统推荐 2-3 个今日仪式任务。
5. 用户完成任务后获得经验值和维度成长。

验收：

- Growth 任务可勾选/取消。
- 经验值有变化。
- 对应维度进度有变化。
- 已完成任务有明确状态。

### 5.3 养成到珠宝显化

流程：

1. 用户在 Growth 达成某个维度或任务条件。
2. 系统提示解锁 Guardian Charm / Manifest Jewelry。
3. 用户进入 Jewelry。
4. Jewelry 展示根据画像推荐的宝石、金属、吊坠。
5. 用户调整配置并保存方案。

验收：

- Jewelry 初始推荐来自 Profile / Growth 状态。
- 用户可以选择 Stone / Metal / Charm / Size。
- Energy Fit 分数或推荐理由会随选择变化。
- 保存后能进入 Order Confirm。

## 6. 灵性画像规则表 v1

### 6.1 输入字段

| 字段 | 来源 | 示例 |
| --- | --- | --- |
| birthDate | Birth Blueprint | 1996-05-23 |
| birthTime | Birth Blueprint | 07:42 |
| birthPlace | Birth Blueprint | Shanghai |
| energyNeed | Test | Protection |
| mirrorCard | Test / Tarot | The Star |
| completedRituals | Growth | Soul Check-In, Heart Breath |
| selectedStone | Jewelry | Green Aventurine |
| selectedMetal | Jewelry | Rose Gold |
| selectedCharm | Jewelry | Guardian Leaf |

### 6.2 输出字段

| 字段 | 示例 |
| --- | --- |
| soulArchetype | Jade Heart Guardian |
| coreTags | Heart, Balance, Protection |
| energyType | Sensitive Builder |
| decisionCompass | Wait for emotional clarity |
| coreElement | Wood nourished by Water |
| guidance | Your healing asks you to protect your energy while staying open to wonder. |
| dimensions | Clarity 82, Love 76, Protection 88, Abundance 68, Grounding 71 |
| recommendedJewelry | Guardian Charm Bracelet |
| recommendedMaterials | Green Aventurine, Clear Quartz, Rose Gold |

### 6.3 规则形态

v1.0.1 建议先使用前端本地规则表：

```js
const profileRules = {
  energyNeed: {
    Protection: {
      dimensionBoost: { protection: 8, grounding: 3 },
      tags: ["Protection", "Boundary", "Guardian"],
      stones: ["Green Aventurine", "Clear Quartz"],
      ritual: "Write one release",
    },
  },
};
```

后续可以迁移到后端或配置平台。

## 7. 页面改造计划

### 7.1 Test 页面

目标：从静态测试图升级为真实测试组件。

功能：

- 四个能量选项可选择。
- 再次点击可取消。
- 选中项有清晰视觉反馈。
- Continue 前需要至少一个选择。
- 完成后写入本地状态。

优先级：P0

### 7.2 Profile 页面

目标：从固定图片升级为可动态展示画像结果。

功能：

- 展示 Soul Archetype。
- 展示人类图、八字、塔罗三个来源解释。
- 展示五维能量分数。
- 展示今日指引。
- 提供 Growth 和 Jewelry 两个主要 CTA。

优先级：P0

### 7.3 Growth 页面

目标：让用户真实完成养成动作。

功能：

- 今日任务可勾选/取消。
- 完成任务后增加 XP。
- 对应维度进度变化。
- 显示下一里程碑奖励。
- 达到条件后引导进入 Jewelry。

优先级：P0

### 7.4 Jewelry 页面

目标：验证从画像到珠宝定制的转化逻辑。

功能：

- 默认推荐来自 Profile。
- 支持 Stone / Metal / Charm / Size 选择。
- 展示每个选择的灵性含义。
- Energy Fit 随选择变化。
- 保存方案后进入 Order Confirm。

优先级：P0

### 7.5 Order / Checkout / Tracker

目标：保留商业闭环，但不做真实交易。

功能：

- 使用静态页面或轻量组件展示。
- 保留从 Jewelry 到 Tracker 再回 Growth 的路径。
- 后续 v1.1 再接订单和支付。

优先级：P1

## 8. 数据结构草案

### 8.1 userProfile

```js
{
  archetype: "Jade Heart Guardian",
  coreTags: ["Heart", "Balance", "Protection"],
  energyType: "Sensitive Builder",
  decisionCompass: "Wait for emotional clarity",
  coreElement: "Wood nourished by Water",
  dimensions: {
    clarity: 82,
    love: 76,
    protection: 88,
    abundance: 68,
    grounding: 71
  }
}
```

### 8.2 dailyCheckIn

```js
{
  date: "2026-06-27",
  energyNeed: "Protection",
  mirrorCard: "The Star",
  guidance: "Protect your energy while staying open to wonder."
}
```

### 8.3 growthState

```js
{
  level: 18,
  xp: 2480,
  nextLevelXp: 3000,
  completedRituals: ["soul-check-in"],
  streak: 23
}
```

### 8.4 jewelryConfig

```js
{
  stone: "Green Aventurine",
  metal: "Rose Gold",
  charm: "Guardian Leaf",
  size: "M",
  energyFit: 92
}
```

## 9. 埋点计划

| 事件 | 触发点 |
| --- | --- |
| test_option_select | 用户选择能量选项 |
| test_option_deselect | 用户取消能量选项 |
| daily_checkin_complete | 用户完成测试 |
| profile_result_view | 用户查看动态画像 |
| growth_ritual_complete | 用户完成养成任务 |
| growth_reward_unlock | 用户解锁阶段奖励 |
| jewelry_option_select | 用户选择珠宝配置 |
| jewelry_manifest_save | 用户保存珠宝方案 |
| order_confirm_enter | 用户进入订单确认 |

## 10. 验收标准

### 10.1 功能验收

- Test 页面至少一个选项可选择、取消、继续。
- Profile 页面能根据 Test 状态展示动态内容。
- Growth 页面任务勾选会影响 XP 或维度进度。
- Jewelry 页面配置选择会影响 Energy Fit 或推荐说明。
- Jewelry -> Order -> Checkout -> Tracker -> Growth 路径保留。

### 10.2 体验验收

- 组件化页面视觉风格接近 v1.0.0 UI 图。
- 不出现文字溢出、按钮不可点、导航遮挡。
- 底部导航在主页面保持一致。
- 用户能理解自己的选择如何影响后续结果。

### 10.3 技术验收

- `npm run build` 通过。
- 浏览器控制台无运行时错误。
- 核心状态集中管理，避免页面间状态散落。
- 规则表独立于 UI 组件，方便后续扩展。

## 11. 交付物

v1.0.1 完成时应交付：

- 组件化 Test 页面。
- 动态 Profile 页面。
- 可交互 Growth 页面。
- 可交互 Jewelry 页面。
- 灵性画像规则表 v1。
- 基础事件埋点结构。
- 更新后的原型跳转文档。
- v1.0.1 QA 记录。

## 12. 建议执行顺序

1. 建立状态模型和规则表。
2. 组件化 Test。
3. 用 Test 结果驱动 Profile。
4. 组件化 Growth 任务和进度。
5. 组件化 Jewelry 配置。
6. 保留并校验商业闭环跳转。
7. 更新文档和 QA。


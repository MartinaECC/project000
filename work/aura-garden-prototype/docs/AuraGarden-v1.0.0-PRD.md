# AuraGarden v1.0.0 产品需求文档

版本：v1.0.0  
文档状态：原型评审版  
最后更新：2026-06-27  
原型目录：`work/aura-garden-prototype`  
当前原型地址：`http://127.0.0.1:5177/`

## 1. 产品定位

AuraGarden 是一款面向跨境用户的灵性成长与能量珠宝定制 App。产品的核心不是单纯售卖珠宝，而是先帮助用户建立可持续的灵性画像、每日测试、成长路径和仪式习惯，再把成长结果转化为可佩戴、可定制、可下单的现实珠宝。

一句话定位：  
**用人类图、塔罗与东方八字融合生成个人灵性画像，通过每日测试和养成任务持续更新能量状态，并把阶段性成长结果显化为定制珠宝。**

## 2. 产品目标

### 2.1 用户目标

- 快速获得一个有仪式感、可信、可解释的个人灵性画像。
- 每天通过轻量测试了解当日能量状态，并获得清晰的修习建议。
- 通过等级、维度、任务和奖励形成长期灵性养成。
- 把自己的能量画像和成长成果转化为一件有意义的珠宝。
- 在轻社交圈层里分享状态、获得回应、参与灵性主题共创。

### 2.2 商业目标

- 以灵性画像和每日测试建立高频入口。
- 以成长体系提升留存和复访。
- 以「成长解锁珠宝」承接高意愿商业转化。
- 以定制订单、订金、生产跟踪完成跨境珠宝交易闭环。
- 以 Circle 和分享机制带来自传播与复购。

## 3. 目标用户

### 3.1 核心人群

- 对人类图、塔罗、八字、能量疗愈、水晶、月相等主题有兴趣的女性用户。
- 愿意为个人成长、情绪疗愈、自我表达和仪式感付费的跨境消费者。
- 喜欢定制化珠宝，但希望珠宝具有个人故事和精神意义，而不只是装饰属性。

### 3.2 典型场景

- 新用户第一次进入，希望快速知道「我是谁」「我现在的能量状态是什么」。
- 用户每天醒来或睡前完成一次 Soul Check-In，获得当天练习建议。
- 用户完成连续练习后，解锁一个 Guardian Charm 或 Manifest Jewelry。
- 用户在珠宝页根据灵性画像选择石头、金属、吊坠和尺寸，并下订。
- 用户在订单生产过程中继续回到 Growth 做练习，形成等待期留存。

## 4. v1.0.0 范围

### 4.1 本版本必须包含

- 首次进入与灵性画像生成流程。
- 人类图、塔罗、八字融合后的 Spiritual Profile 页面。
- 每日灵性测试 Soul Check-In。
- Growth Path 灵性养成页面。
- Manifest Jewelry 珠宝显化与定制页面。
- 订单确认、订金支付、生产跟踪的商业转化闭环。
- Circle 轻社交入口。
- 五栏底部导航：Today / Test / Growth / Jewelry / Circle。

### 4.2 本版本暂不展开

- 完整真实支付网关接入。
- 真正的生产工厂排期系统。
- 全量社区治理、私信和群组能力。
- 复杂占卜算法自动推演后台。
- 原生 iOS/Android 生产代码。

## 5. 产品结构

AuraGarden v1.0.0 采用五个主入口：

| 模块 | 定位 | 主要任务 |
| --- | --- | --- |
| Today | 每日首页 | 展示今日能量、测试入口、练习入口、珠宝推荐 |
| Test | 灵性测试 | 完成 Soul Check-In，刷新当日能量状态 |
| Growth | 灵性养成 | 展示等级、维度、任务、连续练习和阶段奖励 |
| Jewelry | 珠宝显化 | 将灵性画像转化为定制珠宝并进入下单 |
| Circle | 轻社交 | 展示用户分享、主题讨论、成长回应 |

## 6. 核心用户旅程

### 6.1 首次画像生成

目标：让用户在首次进入时形成强记忆点，并获得一个可持续使用的 Spiritual Profile。

流程：

1. Onboarding：建立产品世界观，强调灵性画像与成长。
2. Birth Blueprint：输入出生相关信息，用于东方八字/人类图基础计算。
3. Soul Mirror：进行灵魂镜像测试，采集直觉偏好。
4. Tarot Mirror：抽取塔罗镜像，形成当日心理与能量投射。
5. Profile Reveal：展示画像生成过程和结果预告。
6. Spiritual Profile：生成融合画像，如 Jade Heart Guardian。

成功标准：

- 用户理解画像由多源信息融合，而不是单一测试结果。
- 用户愿意进入今日练习或珠宝显化。

### 6.2 每日灵性测试

目标：建立高频复访入口，让用户每天都有理由打开 App。

流程：

1. Today 进入 Soul Check-In。
2. 用户选择当日能量需求，例如 Clarity / Protection / Love / Grounding。
3. 用户可继续抽一张 mirror card，获得今日指引。
4. 完成后进入 Spiritual Profile 或更新今日状态。

关键要求：

- 测试体验必须轻，不要像问卷。
- 选项需要有强视觉情绪和能量象征。
- 结果要反哺画像、Growth 维度和 Jewelry 推荐。

### 6.3 灵性养成

目标：把一次性测试转为长期成长关系。

Growth Path 包含：

- 用户等级与称号，例如 Level 18 / Soul Explorer。
- 经验值和下一等级进度。
- 五个成长维度：Clarity、Love、Protection、Abundance、Insight / Balance。
- 今日仪式任务：Soul Check-In、5-min Heart Breath、Write one release。
- 月相练习：Waxing Moon、剩余天数、练习建议。
- 里程碑奖励：解锁 Guardian Charm 或 Manifest Jewelry。

关键要求：

- 成长不是游戏化噱头，而是用户理解自己的精神状态变化。
- 等级和维度必须和每日测试结果、画像解释、珠宝推荐相连。
- 阶段奖励需要自然导向 Jewelry，不应显得像硬广。

### 6.4 珠宝显化与商业闭环

目标：把灵性成长结果转化为真实可购买的定制珠宝。

流程：

1. 用户在 Profile 或 Growth 解锁 Manifest Jewelry。
2. Jewelry 页面展示由画像生成的珠宝方案。
3. 用户可查看 Spiritual Mapping：宝石、金属、吊坠分别对应画像含义。
4. 用户选择 Stone / Metal / Charm / Wrist Size 等配置。
5. 进入 Order Confirm 确认定制方案、价格、工期和跨境配送。
6. Checkout 支付订金或全款。
7. Production Tracker 跟踪手工制作、能量净化、质检、发货阶段。
8. 用户回到 Growth，在等待期继续练习。

商业闭环设计：

| 阶段 | 用户心理 | 产品动作 | 商业动作 |
| --- | --- | --- | --- |
| 测试 | 我想知道自己是什么能量 | 生成今日状态 | 建立信任 |
| 画像 | 这个结果像我 | 给出融合解释 | 建立个性化价值 |
| 养成 | 我想继续变好 | 等级、任务、维度 | 提升留存 |
| 解锁 | 我完成了一个阶段 | 解锁 Guardian Charm | 创造购买理由 |
| 定制 | 这件珠宝属于我 | 映射宝石/金属/吊坠 | 提升客单价 |
| 支付 | 我愿意拥有它 | 订金/全款/保障 | 完成转化 |
| 生产 | 我期待收到它 | 生产跟踪 | 降低等待焦虑 |
| 复购 | 我进入下一阶段 | 新任务/新月相/新 charm | 形成复购 |

## 7. 灵性画像模型

### 7.1 输入来源

| 来源 | 用户输入/行为 | 输出 |
| --- | --- | --- |
| 人类图 | 出生日期、时间、地点 | Energy Type、Authority、Strategy 等人格决策线索 |
| 东方八字 | 年月日时、五行强弱 | Core Element、能量补益方向、适配材质 |
| 塔罗 | 抽牌或镜像牌 | 当前阶段主题、情绪提醒、行动建议 |
| Soul Mirror | 直觉选择、词语/图像反应 | 当日需求、潜意识偏好 |
| Growth 行为 | 完成任务、连续练习、偏好选择 | 维度变化、推荐更新 |

### 7.2 融合输出

Spiritual Profile 需要输出：

- Soul Archetype：例如 Jade Heart Guardian。
- 三个核心标签：Heart / Balance / Protection。
- Energy Type：例如 Sensitive Builder。
- Decision Compass：例如 Wait for emotional clarity。
- Core Element：例如 Wood nourished by Water。
- Mirror Card：例如 The Star。
- 五维能量分数：Clarity、Love、Protection、Abundance、Grounding。
- 今日指引：一句主建议 + 一个行动任务。
- Jewelry Mapping：推荐宝石、金属、吊坠和能量寓意。

### 7.3 输出原则

- 语言要温柔、肯定、具有陪伴感。
- 结果要可解释，避免黑箱神秘感过强。
- 不提供医疗、法律、投资等高风险判断。
- 所有灵性结果应定位为自我反思和生活方式建议。

## 8. 页面需求

### 8.1 Onboarding

目的：建立第一印象和产品主张。  
核心内容：AuraGarden 世界观、创建灵性画像主 CTA、跳过进入今日测试。  
关键跳转：创建画像 -> Birth Blueprint；跳过 -> Test。

### 8.2 Birth Blueprint

目的：采集出生信息，为人类图和八字提供基础。  
核心内容：出生日期、时间、地点、隐私说明。  
关键跳转：继续/跳过 -> Soul Mirror。

### 8.3 Soul Mirror

目的：采集用户当下直觉能量。  
核心内容：图像/词语选择、直觉反应。  
关键跳转：继续 -> Tarot Mirror。

### 8.4 Tarot Mirror

目的：生成当前阶段的塔罗镜像。  
核心内容：抽牌、牌义、今日提醒。  
关键跳转：继续 -> Profile Reveal。

### 8.5 Profile Reveal

目的：承接画像生成的仪式感。  
核心内容：融合来源、生成状态、主 CTA。  
关键跳转：Reveal -> Spiritual Profile。

### 8.6 Spiritual Profile

目的：展示用户长期身份资产。  
核心内容：Soul Archetype、人类图/八字/塔罗融合解释、五维分数、今日指引。  
关键跳转：Begin today's practice -> Growth；Manifest as jewelry -> Jewelry。

### 8.7 Today

目的：日常回访首页。  
核心内容：今日能量、月相、今日练习、珠宝推荐、底部导航。  
关键跳转：Soul Check-In -> Test；Manifest Jewelry -> Jewelry。

### 8.8 Test / Soul Check-In

目的：每日测试和状态刷新。  
核心内容：能量需求选择、镜像牌入口、继续按钮。  
关键跳转：Continue -> Spiritual Profile；底部导航切换主模块。

### 8.9 Growth Path

目的：长期养成和阶段奖励。  
核心内容：等级、五维进度、今日仪式、月相练习、下一里程碑奖励。  
关键跳转：Preview/Unlock Charm -> Jewelry；底部导航切换主模块。

### 8.10 Jewelry

目的：个性化珠宝显化与转化。  
核心内容：画像推荐珠宝、Spiritual Mapping、定制配置、Energy Fit、跨境服务说明。  
关键跳转：Save My Manifest Piece -> Order Confirm；Return to Practice -> Growth。

### 8.11 Order Confirm

目的：订单确认与支付前信任建立。  
核心内容：珠宝方案、材质/尺寸、价格、订金、工期、跨境配送、售后说明。  
关键跳转：Start Custom Order -> Checkout；Edit Manifestation -> Jewelry。

### 8.12 Checkout / Deposit

目的：完成订金或全款支付。  
核心内容：收货信息、支付方式、订金说明、安全保障。  
关键跳转：Place Deposit -> Production Tracker；Review Order -> Order Confirm。

### 8.13 Production Tracker

目的：降低定制等待焦虑，并把用户带回养成。  
核心内容：制作阶段、预计交付、工匠说明、能量净化/质检/发货节点。  
关键跳转：Open Growth Practice -> Growth；View Order Details -> Order Confirm。

### 8.14 Circle

目的：轻社交和社区氛围。  
核心内容：灵性状态分享、成长动态、主题讨论、同频回应。  
关键跳转：底部导航切换主模块。

## 9. 交互与导航要求

- 主导航固定为 Today / Test / Growth / Jewelry / Circle。
- Profile 页面虽然不是主导航之一，但需要显示并支持底部导航。
- 商业流程页面 Order / Checkout / Tracker 不显示底部导航，以保证交易流程聚焦。
- 非首页页面需要可返回上一层。
- 当前高保真原型使用静态 UI 图 + 透明点击热区实现，后续生产化时需要逐页转为可编辑组件。
- 静态图上不再叠加不稳定的选中态控件；如需选中态，后续应生成对应状态图或组件化重建。

## 10. 数据与埋点需求

### 10.1 核心事件

| 事件 | 触发点 | 主要属性 |
| --- | --- | --- |
| onboarding_start | 首次进入 | locale, source |
| birth_blueprint_submit | Birth Blueprint 继续 | birth_date_complete, birth_time_complete, city |
| soul_mirror_complete | Soul Mirror 完成 | selected_option |
| tarot_mirror_complete | Tarot Mirror 完成 | card_id |
| profile_generated | Profile Reveal 完成 | archetype, element, energy_type |
| daily_checkin_start | Today/Test 进入 | moon_phase, day |
| daily_checkin_complete | Test Continue | need_type, mirror_card |
| ritual_complete | Growth 任务完成 | ritual_id, dimension |
| jewelry_view | Jewelry 页面曝光 | archetype, recommended_piece |
| jewelry_customize | 定制选项变化 | stone, metal, charm, size |
| order_confirm_view | 订单确认页曝光 | sku, price, deposit |
| checkout_submit | 支付提交 | amount, payment_type |
| production_tracker_view | 生产跟踪页曝光 | order_status |
| circle_post_view | Circle 内容曝光 | topic_id |

### 10.2 北极星指标

- Weekly Active Spiritual Practice Users：每周至少完成 2 次测试或练习的用户数。

### 10.3 阶段指标

- 首次画像完成率。
- 今日测试完成率。
- Growth 7 日连续练习率。
- Jewelry 页面到 Order Confirm 转化率。
- Order Confirm 到订金支付转化率。
- 生产跟踪页回访率。
- Jewelry 复购/二次解锁率。

## 11. 内容与语气

### 11.1 语气原则

- 温柔、坚定、陪伴式。
- 避免恐吓式命运判断。
- 避免「你必须」「一定会」等绝对化表达。
- 强调自我觉察、选择、练习和陪伴。

### 11.2 中英文策略

v1.0.0 原型以英文 UI 为主，面向跨境用户。产品文档和研发说明使用中文，便于内部协作。后续如进入真实市场，需要至少支持：

- English
- Simplified Chinese
- Traditional Chinese

## 12. 合规与风险

- 灵性测试与画像仅作为自我探索和生活方式建议，不构成医学、心理治疗、法律、财务建议。
- Birth Blueprint 涉及出生日期、出生时间、地点，应提供隐私说明和数据删除入口。
- 珠宝材质、天然石来源、镀金/纯金/合金等必须清晰标注。
- 跨境配送需明确税费、关税、退换货、定制商品不可退规则。
- Circle 社区需具备举报、屏蔽和内容审核基础能力。

## 13. 验收标准

### 13.1 原型验收

- 14 张核心页面均可在原型中查看。
- 首次用户流程可完整走通：Onboarding -> Birth Blueprint -> Soul Mirror -> Tarot Mirror -> Profile Reveal -> Spiritual Profile。
- 日常流程可走通：Today -> Test -> Spiritual Profile -> Growth。
- 商业闭环可走通：Jewelry -> Order Confirm -> Checkout -> Production Tracker -> Growth。
- 主导航在 Today / Test / Growth / Jewelry / Circle / Profile 页面可点击。
- 浏览器控制台无运行时错误。

### 13.2 产品验收

- PRD 能解释为什么「灵性养成」是第一核心，而珠宝是商业显化结果。
- 灵性画像模型能说明人类图、塔罗、八字如何分别贡献输入。
- 每个页面都有明确目标、内容和跳转。
- 商业转化链路覆盖从推荐、定制、订单确认、支付到生产跟踪。

## 14. 后续路线

### v1.1 建议

- 将 Today / Test / Growth / Jewelry 逐页组件化，保留当前 UI 图作为视觉基准。
- 增加真实可编辑的测试选项、任务勾选、珠宝配置选中态。
- 设计画像算法的可配置规则表。
- 增加多语言文案表。
- 增加 Circle 的发帖、回应、主题挑战 MVP。

### v1.2 建议

- 接入支付沙盒与订单后台。
- 建立工厂/手作生产状态管理。
- 支持用户保存多个 Manifest Piece。
- 增加月相周期、连续练习和复购触发自动化。


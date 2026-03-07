# Closure Conclusion Signal Plan V1

## 当前状态

### Clarification -> Issue Queue -> Requirement Unit 当前闭环已经做到哪里
- Clarification 来源面已经具备：
  - `queueEligible`
  - `queueEligibilityReason`
  - `issueProjection`
  - `queueStatus`
  - `primaryRequirementUnitId` 绑定后的 Unit 回链
  - issue 关闭后的“待回源确认”
- Issue Queue 已能展示：
  - 来源对象
  - `primaryRequirementUnit`
  - 阻断与状态语义
  - 是否需要回源确认
- Requirement Unit 已能展示：
  - linked clarifications
  - callback needed 数量
  - 自己为何被 summary 关注的一部分原因
- Impact Summary 已能点名：
  - `affectedRequirementUnits`
  - `Advance First`
  - `Stabilize First`

### 当前“结论沉淀”为什么还不够明确
- 当前用户大致能看出“某个 Clarification 来源 issue 已关闭”，但还不够容易直接看懂：
  - 这个关闭结论更像是“边界澄清”还是“风险确认”等哪一类沉淀
  - 这个结论最后主要沉淀到了哪个 Requirement Unit
  - 它对推进面的实际影响是什么，例如降低不确定性、减少待确认项、改善稳定度，还是仅仅关闭了问题但内容尚未回填
- 这些信息目前还分散在：
  - Clarification 区的回源确认提示
  - Issue Queue 的来源说明
  - Requirement Unit 的局部摘要
  - Impact Summary 的总体 reasons
- 结果是链路虽然存在，但“结论落点”仍需要用户自己脑补

## 本轮范围

### 本轮如何把“问题关闭后沉淀到了哪里”表达得更具体
1. 为 Clarification 来源 issue 补一层轻量结论信号
   - 基于 issue 类型、Clarification 类别、关闭状态、是否绑定 Unit，给出一个最小结论标签：
     - `boundary_clarified`
     - `risk_confirmed`
     - `missing_filled`
     - `conflict_decided`
     - `closed_without_content_sink`
2. 为结论信号补推进含义说明
   - 例如：
     - 降低不确定性
     - 减少待确认项
     - 改善稳定度判断
     - 仍需人工补内容
3. 在 4 个位置统一投影这层信息：
   - Clarification 区
   - Issue Queue 来源信息
   - Requirement Unit 局部回链信息
   - Impact Summary / Requirement 详情页提示
4. 明确“沉淀到哪里”
   - 若存在 `primaryRequirementUnitId`，则将其视为当前最小沉淀落点
   - 若不存在，则明确标记为“尚未形成明确内容落点”

### 哪些是提示，哪些仍然不自动改状态
自动提示：
- 结论标签
- 结论沉淀落点
- 对推进面的解释
- 是否仍需人工补内容 / 回源确认

仍然人工确认：
- Clarification 是否标记为已收敛
- Requirement Unit 状态是否升级
- Requirement Unit 稳定度是否提升
- 结论是否需要继续写回模型、版本或其他对象

### 当前状态更新
- `ISSUE 2` 已新增一层统一的 Clarification 结论信号 helper，用于表达：
  - 结论类型
  - 主要沉淀落点
  - 对推进面的影响
  - 下一步仍需人工做什么
- Clarification 区、Issue Queue、Requirement Unit 局部回链、Impact Summary 已开始统一消费这层信号
- 当前“待回源确认”已不再只是抽象提醒，而会结合：
  - 结论更像边界澄清 / 风险确认 / 缺失补齐 / 冲突裁定 / 仅关闭未沉淀
  - 结论当前主要沉淀到哪个 Requirement Unit
  - 仍需人工确认还是仍需人工补内容
- `ISSUE 4` 已把这条结论链继续压短：
  - Impact Summary 会直接点出哪个 Unit 被结论影响、为什么被点名、当前建议动作是什么
  - Requirement Unit 卡片可以直接看到自己为何进入 summary，并能回跳到 Impact Summary
  - 用户现在可以沿着 `Clarification -> Issue Queue -> Requirement Unit -> Impact Summary` 连续追踪结论落点

## 非目标
- 不做自动状态机
- 不做复杂结论推理系统
- 不重做 Clarification / Issue 数据模型
- 不支持多 Unit 自动传播
- 不把关闭 issue 自动视为内容已沉淀

## 风险

### 风险 1
- 如果结论标签直接写死过多业务语义，容易在轻量规则阶段制造伪精确感

### 风险 2
- 如果不明确区分“已形成结论信号”和“已完成内容沉淀”，用户会误以为 issue 一关就已经彻底收敛

### 风险 3
- 如果只在 Impact Summary 做结论信号而不回投到 Clarification / Issue / Unit，本轮闭环仍然不够短

## 后续预留
- 后续可再细化“沉淀到哪个 Unit 字段 / 哪类内容块”
- 后续可扩展到 Conflict projection 等更多来源类型
- 后续可把结论信号与版本链或 change evidence 做更轻量的衔接，但仍不引入正式 Change Unit

## 已完成
- Clarification 来源 issue 已具备结论标签、结论落点、推进影响与下一步说明
- Issue Queue、Requirement Unit、Impact Summary 已统一消费这层结论信号
- Impact Summary 与 Requirement Unit 之间已补上双向解释和跳转

## 当前残留
- 结论仍只沉到“哪个 Unit”，尚未细到 Unit 内哪个字段或内容块
- 关闭 issue 之后仍不自动更新 Unit 状态或稳定度，仍依赖人工判断
- Conflict projection 还没有复用同一套“结论沉淀标签”，目前仍以状态关系和来源说明为主

## 下一轮建议
- 继续把“结论沉淀到哪个 Unit 字段”做成轻量提示，而不是状态机
- 让 Impact Summary 能更直接引用回源未完成的具体来源对象
- 评估是否给 Conflict projection 增补一层与 Clarification 对齐的轻量结论信号

# Implementation Plan - Requirement Evolution V1

## 目标
把 develop_os 从“需求澄清平台”推进到“需求演化管理系统”的第一阶段，但仍保持产品边界为“复杂研发工作的协同操作系统”，不滑向行业系统、项目管理系统或 DevOps 平台。

本轮目标不是重写现有需求中心，而是在现有 `Requirement + 五层结构化模型 + 版本 + 澄清 + 冲突 + 签字 + 测试资产` 主链上，补齐最小必要对象层，使系统开始具备“需求拆分、问题跟踪、成熟度判断”的闭环。

## 实施状态（2026-03-06 第二阶段）
- 已完成：`Requirement.stability*` 字段落地，并在详情页做基础展示
- 已完成：`RequirementUnit` Prisma 模型、迁移草案、基础查询 router
- 已完成：`IssueUnit` Prisma 模型、迁移草案、基础查询 router
- 已完成：在现有 `/explorations/[id]` 页面加入 Stability、Requirement Units、Issue Queue 的最小入口
- 已完成：Requirement Unit / Issue Unit 的最小创建入口
- 已完成：Requirement 与 Requirement Unit 的最小稳定度更新入口
- 已完成：基于当前五层模型初始化 Requirement Units 草稿
- 已完成：Requirement Unit / Issue Unit 的最小状态更新入口
- 已完成：Clarification Question 显式转为 Issue Unit 的最小串联
- 已完成：Issue Queue 统一展示 IssueUnit 与 Conflict Scan 投影
- 已完成：Requirement Unit / Issue Unit 的完整内联编辑入口
- 已完成：列表页展示稳定度、Requirement Unit 数、Open/Blocking Issue 数
- 已完成：列表页最小筛选 `stability` / `hasBlockingIssues`
- 已完成：Dashboard 增加低稳定度、阻断问题、对象化覆盖率指标
- 已完成：阶段一验收清单与数据库级业务流测试
- 未完成：Issue 与 Conflict 的自动串联
- 未完成：Clarification 到 Issue 的自动转换或自动回流

## 范围
本轮只做最小必要闭环：

- 让一条 Requirement 可以拆出多个 Requirement Unit
- 让与需求推进相关的问题能作为 Issue Unit 被追踪
- 让 Requirement 和 Requirement Unit 都有 Stability Model 可见、可更新、可用于推进判断
- 前端只在现有详情页和列表页上做最小接入，不做整体 IA 和视觉大改版
- 不在本轮直接落地 Change Unit、Impact Graph、Prototype Mapping 的完整持久化和图谱能力

## 现状对齐

### 当前仓库已经具备的能力
- `Requirement` 已经是系统主对象，承载原始输入、结构化模型、状态、版本号和标签
- 五层结构化模型已落地，支持 AI 结构化、对话修正、澄清问题、Spec 派生
- `RequirementVersion`、`ModelChangeLog`、`SpecArtifact` 已形成快照与派生资产链
- `RequirementConflict` 已提供“冲突”这一类问题对象，但范围只覆盖矛盾检测
- 详情页已有工作台结构，可容纳新增 panel：状态、冲突、澄清、测试资产、签字、版本历史都已存在

### 与新增文档相比的主要缺口
- 缺 `Requirement Unit`：现在只能管理整份 Requirement，不能管理细粒度需求对象
- 缺通用 `Issue Unit`：现在有 conflict，但没有 ambiguity/missing/risk/pending_confirmation 等统一问题对象
- 缺稳定度模型：当前只有流程状态，没有成熟度语义
- 缺语义化变更对象：当前只有版本与 diff，没有正式 change 语义层
- 缺影响关系层：当前不能系统回答“某个需求对象变化影响哪些页面/流程/测试”
- 缺原型映射层：HTML 原型尚未进入正式对象关系

### 现有实现与新文档的冲突点
- 当前状态流转是 Requirement 级别单线流程；新文档要求“状态”和“稳定度”分离，不能继续混用
- 当前 `RequirementConflict` 名称过窄，如果未来直接把所有问题都塞进 conflict，会导致模型语义混乱
- 当前详情页围绕整份 ModelCard 组织；如果 Requirement Unit 直接替换 ModelCard，会与现有五层模型中心设计冲突
- 当前版本链默认以整份 Requirement 快照为中心；新文档中的 Change Unit 属于语义层，不应简单复用版本快照表名义替代

### 只需增量扩展的部分
- 在 `Requirement` 主对象下扩展子对象关系
- 在详情页增加 tab / panel / section
- 复用现有状态控制、冲突卡片、澄清问题、测试资产的界面组织方式
- 复用 `RequirementVersion` / `ModelChangeLog` 作为“整体快照和历史记录”基础设施

### 更可能需要重构的部分
- 如果后续要让 Requirement Unit 成为真正的下游唯一引用对象，现有“五层模型仅挂在 Requirement 上”的结构会逐步成为瓶颈
- 如果后续要引入 Change Unit + Impact Graph，现有事件类型、router 命名和详情页模块边界可能需要从“探索工作台”转向“对象工作台”
- 如果后续要引入原型映射，当前 `requirements -> explorations` 的页面命名会影响信息架构清晰度

## 第一阶段优先实现对象

### 1. Requirement Unit

#### 数据模型建议
- 新增 `RequirementUnit`
- 一条 `Requirement` 可包含多个 `RequirementUnit`
- 初版字段建议：
  - `id`
  - `requirementId`
  - `parentUnitId`
  - `unitKey`
  - `title`
  - `summary`
  - `layer`
  - `status`
  - `stabilityLevel`
  - `stabilityScore`
  - `sourceType`
  - `sourceRef`
  - `acceptanceNotes`
  - `ownerId`
  - `sortOrder`
  - `createdBy`
  - `createdAt`
  - `updatedAt`

#### 与现有模型关系
- 归属于现有 `Requirement`
- `Requirement.model` 仍是整份需求的全局结构化模型，不在本轮拆散
- `RequirementUnit` 作为 Requirement 下的细粒度对象层，用于补足“管理颗粒度”
- 后续 `IssueUnit`、`ChangeUnit` 均以 `RequirementUnit` 为主要关联点

#### API / service 建议
- `requirementUnit.listByRequirement`
- `requirementUnit.create`
- `requirementUnit.update`
- `requirementUnit.reorder`
- `requirementUnit.updateStatus`
- `requirementUnit.updateStability`
- 服务侧补一个 `deriveRequirementUnitsFromModel(requirement)`，但第一阶段只做“辅助初始化”，不做强依赖自动拆解

#### 前端入口建议
- 在现有 `/explorations/[id]` 详情页新增 “Requirement Units” section
- 默认展示为按 `layer` 分组的列表卡片
- 每张卡片展示：标题、摘要、层级、稳定度、状态、关联 issue 数量
- 初版支持手动新增和轻量编辑，不做复杂树形拖拽

#### 状态流转建议
- `draft -> refining -> agreed -> ready_for_design -> ready_for_dev -> archived`
- `changed_pending_review` 先只定义，不在本轮实现自动进入逻辑
- Requirement Unit 状态不替代 Requirement 总体状态，二者并存

### 2. Issue Unit

#### 数据模型建议
- 新增 `IssueUnit`
- 初版字段建议：
  - `id`
  - `requirementId`
  - `primaryRequirementUnitId`
  - `type`
  - `severity`
  - `title`
  - `description`
  - `status`
  - `blockDev`
  - `sourceType`
  - `sourceRef`
  - `ownerId`
  - `reviewerIds`
  - `suggestedResolution`
  - `resolvedNote`
  - `createdBy`
  - `createdAt`
  - `updatedAt`

#### 与现有模型关系
- `RequirementConflict` 不直接删除；本轮建议把它视为 Issue Unit 的一种前身能力
- 初版可以采用“双轨”策略：
  - 保留现有 `RequirementConflict`
  - 新增 `IssueUnit` 作为通用问题对象
  - 冲突扫描结果暂不强制改写到 `IssueUnit`
- 第二阶段再决定是否把 conflict 服务合并为 issue 子类型

#### API / service 建议
- `issueUnit.listByRequirement`
- `issueUnit.create`
- `issueUnit.update`
- `issueUnit.updateStatus`
- `issueUnit.linkRequirementUnits`
- `issueUnit.bulkCreateFromClarification` 只定义，不在本轮实现
- 可以加一个轻量服务：把“阻断开发的未关闭 issue 数”汇总到 Requirement / Requirement Unit 视图

#### 前端入口建议
- 在现有详情页新增 “Issue Queue” panel
- 默认按 `open / waiting_confirmation / resolved` 分段展示
- Issue 卡片显示：类型、严重度、是否阻断、关联 unit、负责人、建议处理动作
- 如果当前仅有 `RequirementConflict`，可在同页保留 “Conflict Scan” 子区块，避免用户误解为旧能力消失

#### 状态流转建议
- `open -> triaged -> in_progress -> waiting_confirmation -> resolved`
- `rejected`、`archived` 本轮只定义，不做复杂入口
- 当 `blockDev=true` 且状态未 `resolved/rejected` 时，前端汇总提示“阻断开发”

### 3. Stability Model

#### 数据模型建议
- 不单独建大表，初版先将稳定度字段直接挂在 `Requirement` 和 `RequirementUnit`
- 字段建议：
  - `stabilityLevel`: `S0` 到 `S5`
  - `stabilityScore`: `0-100`
  - `stabilityReason`: 文本
  - `stabilityUpdatedAt`
  - `stabilityUpdatedBy`

#### 与现有模型关系
- 与 `Requirement.status` 并行，不取代状态机
- `Requirement` 体现整份需求当前成熟度
- `RequirementUnit` 体现每个细粒度对象的成熟度
- Clarification、Conflict、Issue、Signoff 后续都可成为稳定度判断输入

#### API / service 建议
- `requirement.getStabilitySummary`
- `requirement.updateStability`
- `requirementUnit.updateStability`
- 增加一个服务层方法：`computeRequirementStabilityHints`
- 第一阶段先做“人工主导 + 系统提示”，不做全自动稳定度引擎

#### 前端入口建议
- 在详情页头部增加 Requirement 总体稳定度 badge
- 在 Requirement Unit 卡片上显示 unit 稳定度
- 在 Issue Queue 顶部显示稳定度受阻原因摘要，例如“2 个阻断 issue 未关闭”
- 在列表页增加轻量筛选：按稳定度筛选或标记低稳定条目

#### 状态流转建议
- 稳定度不自动驱动状态流转
- 但进入 `ready_for_dev / CONSENSUS / IMPLEMENTING` 前，可显示推荐条件：
  - Requirement 稳定度至少达到 `S3`
  - 阻断 issue 为 0
  - 关键 Requirement Unit 稳定度达到 `S3` 或更高

## 第二阶段预留对象

### 4. Change Unit
- 本轮只定义对象边界，不创建正式表
- 依然使用 `RequirementVersion` + `ModelChangeLog` + `SpecArtifact` 维持历史链
- 等 Requirement Unit / Issue Unit 跑通后，再引入“正式变更申请、审批、影响评估、重签字”的语义层

### 5. Impact Graph
- 本轮只预留关联字段与 service 命名
- 不做图数据库，不做复杂可视化图谱
- 先通过关系字段和“受影响对象清单”文本摘要过渡

### 6. Prototype Mapping
- 本轮只在文档中保留对象定义
- 不做 HTML 原型解析、不做页面映射入库
- UI 方案中仅预留 future section，不占用当前实现切口

## 第一阶段建议的最小实现切口
建议按以下顺序推进：

1. 在数据层新增 `RequirementUnit`、`IssueUnit`，并给 `Requirement` 增加稳定度字段
   状态：已完成
2. 在现有详情页接入三个区域：
   - Requirement Stability
   - Requirement Units
   - Issue Queue
   状态：已完成基础只读展示
3. 先支持手动维护 Requirement Unit / Issue Unit，不依赖 AI 自动拆解
   状态：已完成最小创建、稳定度更新、状态更新；完整编辑未开始
4. 再补一个轻量初始化动作：
   - 从五层模型生成建议的 Requirement Units 草稿
   - 由人工确认后保存
   状态：已完成“手动触发初始化”版本；自动同步未开始

这个切口最小、风险最低，因为：
- 不需要推翻现有 `Requirement` 主对象
- 不需要立即改写 conflict、clarification、version 三条既有链路
- 能最早验证“需求演化管理”是否真的提升需求收敛效率

## 本轮只定义、不实现
- `ChangeUnit` 正式对象与审批流
- `ImpactGraph` 图谱持久化与可视化
- `PrototypeMapping` 原型解析与差异检测
- Requirement Unit 自动拆分引擎的强自动化版本
- 稳定度自动评分引擎
- 基于 Issue / Stability 的强门禁阻断
- 全局导航和页面命名体系重构

## 风险提示

### 风险最高的点
- 如果 Requirement Unit 与现有五层模型字段没有明确映射规则，后续会出现“双重真源”
- 如果过早把 `RequirementConflict` 强行并入 `IssueUnit`，容易破坏已验证的冲突扫描链路
- 如果稳定度直接绑定状态推进，容易把“流程位置”和“成熟度”再次混在一起

### 本轮控制原则
- Requirement 仍是唯一顶层主对象
- Requirement Unit 是第一层子对象，不与 Requirement 抢中心
- Issue Unit 先补通用问题管理，不立即替换 conflict
- 稳定度先做可见、可编辑、可汇总，不做复杂自动决策

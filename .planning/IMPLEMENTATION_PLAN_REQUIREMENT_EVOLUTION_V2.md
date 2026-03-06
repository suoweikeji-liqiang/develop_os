# Implementation Plan - Requirement Evolution V2

## 目标
在第一阶段已经完成 `Requirement Unit + Issue Unit + Stability Model` 最小闭环的基础上，把 develop_os 推进到“需求演化管理系统”第二阶段：补上 `Change Unit` 这一层正式变更语义对象，让系统不只能够记录历史，还能管理“为什么变、影响什么、是否需要重评审”。

本阶段仍坚持产品边界：
- 不把系统扩展成项目管理系统
- 不把系统扩展成 DevOps 平台
- 不重写现有需求澄清主链路
- 不一次性引入完整图谱、原型平台或强流程引擎

## 实施状态（2026-03-06 第二阶段最小实现）
- 已完成：`ChangeUnit` Prisma 模型与迁移草案落地
- 已完成：`ChangeUnitRequirementUnit`、`ChangeUnitIssueUnit` 关联表落地
- 已完成：`changeUnit.listByRequirement/create/update/updateStatus` 基础 router
- 已完成：`Issue Unit -> Change Unit` 的最小关联链路
- 已完成：Requirement 详情页 `Change Queue` 最小入口
- 已完成：Change Unit 的最小创建、编辑、状态流转能力
- 已完成：列表页 `open change / high risk change` 摘要展示
- 已完成：Dashboard `pending review change / high risk change` 指标展示
- 已完成：数据库级业务流测试覆盖 Change Unit 最小闭环
- 已完成：V2 规划、DB、UI 文档状态同步
- 未完成：Change Unit 与 `RequirementVersion / ModelChangeLog` 的显式弱关联
- 未完成：基于 Change Unit 的自动重签字或自动状态回退
- 未完成：`Impact Graph` 正式对象化
- 未完成：`Prototype Mapping` 正式对象化

## 阶段前提
- 第一阶段已完成并已验收：
  - Requirement Stability
  - Requirement Unit
  - Issue Unit
  - Clarification -> Issue 最小串联
  - 列表页 / Dashboard 的基础可见性
- 当前系统已经具备“需求对象化”和“问题对象化”能力
- 当前系统仍缺“正式变更对象”，因此还不能稳定支撑需求演化过程中的申请、评审、批准、应用、回看

## 第二阶段核心判断
下一阶段不宜同时全面落地 `Change Unit + Impact Graph + Prototype Mapping`。

原因：
- `Change Unit` 是最直接的闭环缺口，且已可复用现有 `RequirementVersion / ModelChangeLog / SpecArtifact`
- `Impact Graph` 若直接做成完整图谱，范围会迅速膨胀到页面、流程、测试、代码、权限等多类节点
- `Prototype Mapping` 若直接进入 HTML 解析和差异分析，会把阶段目标拉向原型平台

因此第二阶段建议分两层推进：
- 必做层：`Change Unit` 最小闭环
- 预埋层：`Impact Graph / Prototype Mapping` 的关系位与入口位，只做可兼容设计，不做完整实现

## 范围

### 本阶段要做
1. 新增 `Change Unit` 对象与基础状态流转
2. 支持从 Requirement 详情页发起 Change Unit
3. 支持 Change Unit 关联 `Requirement Unit`、`Issue Unit`
4. 支持记录变更原因、变更范围、影响摘要、风险等级、是否需要重新 signoff
5. 支持 Requirement 详情页最小展示 “Change Queue / Change History”
6. 支持 Change Unit 与现有 `RequirementVersion / ModelChangeLog` 建立弱关联
7. 支持基于 Change Unit 的最小稳定度提示与评审提示

### 本阶段只定义、不实现
- 完整 `Impact Graph` 节点与边持久化
- 页面级原型对象持久化
- 自动 diff 生成 Change Unit
- 自动重签字工作流
- 自动回写 Requirement Status
- 自动触发测试资产重生成
- Change Unit 审批权限矩阵

## 成功标准
- 一条 Requirement 可以创建正式 Change Unit，而不是只留下版本 diff
- 一个 Change Unit 可以明确挂接到相关 Requirement Unit / Issue Unit
- 用户可以区分“发现问题”与“提交变更”
- 用户可以看到某次变更是否高风险、是否需要重新 signoff、是否影响测试/原型/代码
- 变更被标记为 `applied` 后，系统可以留下与版本链相连的追踪记录
- 现有 Requirement、Clarification、Conflict、Signoff 主流程不被破坏

## 最小实现切口
第二阶段建议先做一个足够小、但能闭环的切口：

1. `Issue Unit` 负责表达问题
2. `Change Unit` 负责表达“问题如何被正式变更处理”
3. `RequirementVersion / ModelChangeLog` 继续负责记录“最终改了什么”

这样可以形成新的最小链路：

`Requirement / Requirement Unit`
-> `Issue Unit`
-> `Change Unit`
-> `RequirementVersion / ModelChangeLog`

这条链路比直接建设完整影响图谱更稳，因为它先把语义层补齐。

## 对象计划

### 1. Change Unit

#### 数据模型建议
新增 `ChangeUnit` 主表，建议字段：
- `id`
- `requirementId`
- `changeKey`
- `title`
- `reason`
- `changeScope`
- `impactSummary`
- `riskLevel`
- `requiresResignoff`
- `affectsTests`
- `affectsPrototype`
- `affectsCode`
- `sourceType`
- `sourceRef`
- `status`
- `proposedBy`
- `reviewedBy`
- `appliedAt`
- `createdAt`
- `updatedAt`

建议新增轻量关联表：
- `ChangeUnitRequirementUnit`
  - `changeUnitId`
  - `requirementUnitId`
- `ChangeUnitIssueUnit`
  - `changeUnitId`
  - `issueUnitId`

如果本轮要进一步压缩实现，也可以先不建关联表，先在主表用 `relatedRequirementUnitIds` / `relatedIssueUnitIds` 的 `String[]` 或 `Json` 落地；但从后续可维护性看，关联表更稳。

#### 与现有模型关系
- `ChangeUnit` 归属于 `Requirement`
- `ChangeUnit` 不替代 `RequirementVersion`
- `ChangeUnit` 不替代 `ModelChangeLog`
- `IssueUnit` 是“为什么要变”的上游输入
- `RequirementUnit` 是“变更作用到哪里”的主要范围对象
- `SpecArtifact`、`RequirementTestCaseSuite` 暂时只通过布尔影响位建立提示关系，不做强引用

#### API / service 建议
- `changeUnit.listByRequirement`
- `changeUnit.create`
- `changeUnit.update`
- `changeUnit.updateStatus`
- `changeUnit.linkRequirementUnits`
- `changeUnit.linkIssueUnits`
- `changeUnit.markApplied`
- `changeUnit.getImpactHints`

建议新增 service：
- `buildChangeImpactHints(requirementId, changeUnitId)`
- `suggestResignoffNeed(changeUnit)`

其中 `getImpactHints` 第一版只基于：
- 关联的 Requirement Unit
- 关联的 Issue Unit
- `affectsTests / affectsPrototype / affectsCode`
- Requirement 当前 stability 与 blocking issue 情况

不做自动图推理。

#### 前端入口建议
- 在现有 `/explorations/[id]` 详情页新增一个 `Change Queue` section
- 放在 `Requirement Units` / `Issue Queue` 之后，保持“对象 -> 问题 -> 变更”的阅读顺序
- 初版卡片展示：
  - 标题
  - 状态
  - 风险等级
  - 关联的 Requirement Unit / Issue Unit 数
  - 是否要求重新 signoff
  - 是否影响测试 / 原型 / 代码
- 初版支持：
  - 手动创建
  - 编辑基本信息
  - 变更状态更新
  - 标记为 applied

#### 状态流转建议
- `proposed -> under_review -> approved -> applied`
- `rejected`、`archived` 保留，但入口可后置

第一版规则建议：
- `approved` 前不允许 `applied`
- `applied` 只表示“语义上已执行”，不强制校验版本 diff
- 若 `requiresResignoff=true`，在详情页展示提醒，不阻断现有流程

### 2. Impact Graph（本阶段预埋）

#### 本阶段目标
不建设完整图谱，只提供可兼容的“影响关系占位”。

#### 数据模型建议
- 不建独立 Graph 表
- 在 `ChangeUnit` 上保留：
  - `impactSummary`
  - `affectsTests`
  - `affectsPrototype`
  - `affectsCode`
- 若需要更稳的后续扩展点，可预留 `ChangeImpactEdge` 草案，但本轮不迁移

#### 与现有模型关系
- Requirement Unit 是未来的主节点
- Issue Unit 可作为 `blocked_by` / `driven_by_change` 的来源
- Test Suite、SpecArtifact、Prototype Page 未来可作为图节点，但本轮只保留字段级影响提示

#### API / service 建议
- 第一版由 `changeUnit.getImpactHints` 输出结构化提示
- 不提供独立 graph router

#### 前端入口建议
- 在 Change Unit 卡片中显示：
  - 影响测试
  - 影响原型
  - 影响代码
  - 影响摘要
- 不画图，不新增图谱页

#### 本轮只定义、不实现
- 边编辑器
- 图谱可视化
- 跨对象追踪视图
- 自动依赖推理

### 3. Prototype Mapping（本阶段预埋）

#### 本阶段目标
不创建正式 Prototype Page 对象，只让 Change Unit 对“是否影响原型”有明确表达，并给后续入口留位。

#### 数据模型建议
- 本轮不建表
- 仅保留 `ChangeUnit.affectsPrototype`
- 如需补充说明，可在 `impactSummary` 中记录原型影响描述

#### 与现有模型关系
- 当前原型仍是外挂输入
- Change Unit 只负责声明“该变更可能导致原型重审”
- 未来若建 Prototype Mapping，可从 Change Unit 反向挂接页面对象

#### API / service 建议
- 不新增独立 API
- 仅在 Change Unit 的创建与更新接口中携带字段

#### 前端入口建议
- Change Unit 卡片显示 “影响原型” 标签
- 需求详情页头部若存在高风险且影响原型的未完成 Change Unit，可显示提醒摘要

#### 本轮只定义、不实现
- HTML 原型扫描
- 页面识别
- 页面绑定 Requirement Unit
- 原型差异比较

## 数据层实施建议

### 主表
- `ChangeUnit`

### 关系表
- `ChangeUnitRequirementUnit`
- `ChangeUnitIssueUnit`

### 枚举建议
- `ChangeUnitRiskLevel`
  - `LOW`
  - `MEDIUM`
  - `HIGH`
  - `CRITICAL`
- `ChangeUnitStatus`
  - `PROPOSED`
  - `UNDER_REVIEW`
  - `APPROVED`
  - `REJECTED`
  - `APPLIED`
  - `ARCHIVED`

### 索引建议
- `ChangeUnit(requirementId, status, updatedAt desc)`
- `ChangeUnit(requirementId, riskLevel)`
- `ChangeUnit(requirementId, requiresResignoff)`
- `ChangeUnitRequirementUnit(requirementUnitId)`
- `ChangeUnitIssueUnit(issueUnitId)`

## UI 接入建议

### 最小接入位置
- Requirement 详情页新增 `Change Queue` panel
- Requirement 列表页新增两项可见性字段：
  - open change count
  - high risk change count
- Dashboard 可选新增：
  - 待评审 change 数
  - 高风险未完成 change 数

### 不做大改版前提下的方案
- 不改主导航
- 不新增独立 Change 页面
- 不拆分现有 detail workspace
- 不改 Clarification / Conflict / Signoff 的原有 panel 结构

## 实施顺序

### Step 1. 规划与数据模型
- 新增 `ChangeUnit` Prisma 模型和关系表草案
- 补 planning 文档中的状态说明
- 明确与 `RequirementVersion / ModelChangeLog` 的弱关联策略

### Step 2. 后端最小闭环
- `changeUnit` router：list/create/update/updateStatus/markApplied
- service：impact hints / resignoff hints
- requirement list / overview 聚合字段补充

### Step 3. 详情页最小入口
- 新增 `Change Queue` panel
- 支持创建、编辑、状态更新、标记 applied
- 展示与 Requirement Unit / Issue Unit 的关联

### Step 4. 全局可见性
- 列表页显示 open change / high risk change
- Dashboard 增加待处理 change 指标

### Step 5. 验收与状态更新
- 增加数据库级业务流测试
- 形成 `PHASE2_ACCEPTANCE_REQUIREMENT_EVOLUTION.md`
- 回写本计划文档中的完成状态

## 风险点
- `ChangeUnit` 若直接承担审批流职责，范围会迅速膨胀
- `ChangeUnit` 若与 `RequirementVersion` 职责混淆，会导致“变更语义”和“变更记录”两层边界失真
- 若过早把 `Impact Graph` 建成独立对象，会引入大量无消费方的数据
- 若让 `ChangeUnit` 自动驱动 Requirement 状态回退，容易破坏现有需求澄清主链路

## 建议结论
第二阶段建议以 `Change Unit` 为唯一主实现对象，`Impact Graph / Prototype Mapping` 只做兼容位与提示位。

如果该阶段顺利完成，第三阶段再考虑：
- 把 Change Unit 与 Signoff、Test Asset 建立更强关联
- 引入最小 `Change Impact Edge`
- 再决定是否正式落地 `Prototype Mapping`

# DB Design - Requirement Evolution V2

## 目标
为“需求演化管理系统”第二阶段提供最小数据库设计，在不破坏现有 `Requirement` 主链、第一阶段 `RequirementUnit / IssueUnit / Stability` 已落地结构的前提下，引入 `ChangeUnit` 这一层正式变更语义对象。

本设计优先保证：
- 增量迁移
- 与现有 Prisma 模型兼容
- 不把 `RequirementVersion / ModelChangeLog` 的职责混入新对象
- 给 `Impact Graph / Prototype Mapping` 留兼容位，但不在本轮正式建模

## 实施状态（2026-03-06 第二阶段最小实现）
- 已完成：`ChangeUnitRiskLevel`、`ChangeUnitStatus` 枚举进入 Prisma schema
- 已完成：`ChangeUnit` 主表进入 Prisma schema 与 migration 草案
- 已完成：`ChangeUnitRequirementUnit`、`ChangeUnitIssueUnit` 关联表进入 Prisma schema 与 migration 草案
- 已完成：`npx prisma migrate deploy` 已执行，新增表已落到本地数据库
- 已完成：Prisma Client 已重新生成并通过 build 验证
- 已完成：列表聚合已补充 `openChangeCount / highRiskChangeCount`
- 未完成：`RequirementVersion.changeUnitId` 弱关联字段
- 未完成：`ModelChangeLog.changeUnitId` 弱关联字段
- 未完成：`ImpactGraphNode / ImpactGraphEdge`
- 未完成：`PrototypePage / PrototypeMapping`

## 实施状态（2026-03-06 规划阶段）
- 已完成：第一阶段 `Requirement.stability*`、`RequirementUnit`、`IssueUnit` 已落地
- 已完成：第一阶段列表聚合、详情页入口、数据库级业务流测试已跑通
- 待实现：`ChangeUnit` 主表
- 待实现：`ChangeUnitRequirementUnit` 关联表
- 待实现：`ChangeUnitIssueUnit` 关联表
- 待实现：Requirement 列表 / Dashboard 的 change 聚合统计
- 本轮不实现：`ImpactGraphNode / ImpactGraphEdge`
- 本轮不实现：`PrototypePage / PrototypeMapping`

## 设计原则
- `ChangeUnit` 是语义层对象，不是快照层对象
- `RequirementVersion` 继续回答“最终改了什么”
- `ModelChangeLog` 继续回答“模型发生了哪些变动”
- `ChangeUnit` 负责表达“为什么改、影响什么、是否需要重新评审”
- 图谱和原型相关能力只保留可扩展字段，不新增正式表

## 一、Change Unit 主表草案

### 表名建议
`ChangeUnit`

### 字段草案

| 字段 | 类型建议 | 说明 |
|------|----------|------|
| `id` | `String @id @default(cuid())` | 主键 |
| `requirementId` | `String` | 所属 Requirement |
| `changeKey` | `String` | 同一 Requirement 内可读编号，如 `CHG-01` |
| `title` | `String` | 变更标题 |
| `reason` | `String @db.Text` | 变更原因 |
| `changeScope` | `String? @db.Text` | 变更范围描述 |
| `impactSummary` | `String? @db.Text` | 影响摘要 |
| `riskLevel` | enum | 风险等级 |
| `requiresResignoff` | `Boolean @default(false)` | 是否建议重新 signoff |
| `affectsTests` | `Boolean @default(false)` | 是否影响测试资产 |
| `affectsPrototype` | `Boolean @default(false)` | 是否影响原型 |
| `affectsCode` | `Boolean @default(false)` | 是否影响实现代码 |
| `sourceType` | `String?` | 来源，如 `manual/issue/clarification/version_diff` |
| `sourceRef` | `String?` | 来源引用 |
| `status` | enum | 变更状态 |
| `proposedBy` | `String` | 发起人 |
| `reviewedBy` | `String?` | 最近评审人或批准人 |
| `appliedAt` | `DateTime?` | 标记为 applied 的时间 |
| `createdAt` | `DateTime @default(now())` | 创建时间 |
| `updatedAt` | `DateTime @updatedAt` | 更新时间 |

### 关系建议
- `Requirement 1 - n ChangeUnit`
- `User 1 - n ChangeUnit(proposedBy)`
- `User 1 - n ChangeUnit(reviewedBy)` 可选

### 约束建议
- `@@unique([requirementId, changeKey])`

### 备注
- `changeScope` 初版建议保留文本，不急于拆成细分类字段
- `sourceType/sourceRef` 用于保留“由哪个 Issue 或澄清触发”的追踪能力
- `appliedAt` 只表示语义上已落地，不强制绑定版本表

## 二、Change 与 Requirement Unit 关联表草案

### 表名建议
`ChangeUnitRequirementUnit`

### 用途
支持一个 Change Unit 关联多个 Requirement Unit，明确变更作用范围。

### 字段草案

| 字段 | 类型建议 | 说明 |
|------|----------|------|
| `id` | `String @id @default(cuid())` | 主键 |
| `changeUnitId` | `String` | Change Unit |
| `requirementUnitId` | `String` | Requirement Unit |
| `relationType` | `String?` | 如 `primary/affected/review_target` |
| `createdAt` | `DateTime @default(now())` | 创建时间 |

### 约束建议
- `@@unique([changeUnitId, requirementUnitId])`
- `@@index([requirementUnitId])`

### 备注
- 初版 `relationType` 可选，先满足查询和展示
- 不建议把 `relatedRequirementUnitIds` 塞进 JSON 字段，否则后续 impact 分析和筛选会变差

## 三、Change 与 Issue Unit 关联表草案

### 表名建议
`ChangeUnitIssueUnit`

### 用途
把 Change Unit 与触发它的问题对象关联起来，形成“问题 -> 变更”的语义链。

### 字段草案

| 字段 | 类型建议 | 说明 |
|------|----------|------|
| `id` | `String @id @default(cuid())` | 主键 |
| `changeUnitId` | `String` | Change Unit |
| `issueUnitId` | `String` | Issue Unit |
| `relationType` | `String?` | 如 `source/related/resolved_by` |
| `createdAt` | `DateTime @default(now())` | 创建时间 |

### 约束建议
- `@@unique([changeUnitId, issueUnitId])`
- `@@index([issueUnitId])`

### 备注
- 初版不强制一个 Issue 只能对应一个 Change
- 这样更适合处理“大变更同时消化多个问题”的场景

## 四、枚举设计

### 1. `ChangeUnitRiskLevel`
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

说明：
- 用于展示风险与排序
- 初版不自动计算，由人工输入或服务提示辅助判断

### 2. `ChangeUnitStatus`
- `PROPOSED`
- `UNDER_REVIEW`
- `APPROVED`
- `REJECTED`
- `APPLIED`
- `ARCHIVED`

说明：
- 不直接映射 `Requirement.status`
- 不应让 `ChangeUnit` 状态自动回写 Requirement 主状态

## 五、与现有 Requirement / Model / Snapshot 等表的关系建议

### 与 `Requirement`
- `Requirement` 仍是权限边界、详情页入口和聚合统计根对象
- `ChangeUnit` 通过 `requirementId` 挂接到现有主对象之下

### 与 `RequirementUnit`
- `RequirementUnit` 是 Change Unit 的主要作用范围对象
- 使用 `ChangeUnitRequirementUnit` 建立多对多
- 不把 RequirementUnit 内容直接复制到 ChangeUnit

### 与 `IssueUnit`
- `IssueUnit` 是 Change Unit 的上游输入
- 使用 `ChangeUnitIssueUnit` 建立多对多
- 后续可以支持“某个 Change 已解决哪些 Issue”的视图

### 与 `RequirementVersion`
- `RequirementVersion` 继续保留整份需求快照职责
- 第二阶段不新增 `changeUnitId` 外键到 `RequirementVersion`
- 如需弱关联，第一版建议只在 service 层基于时间、操作者或备注做展示关联

### 与 `ModelChangeLog`
- `ModelChangeLog` 继续记录模型差异
- 不建议将 ChangeUnit 的业务字段写入 `ModelChangeLog`
- 若未来需要明确绑定，可新增 `changeUnitId` 可空字段，但本轮不建议先做

### 与 `SpecArtifact`
- 本轮不建立强关联
- `affectsTests / affectsPrototype / affectsCode` 只是提示位，不取代真实映射

### 与 `RequirementConflict`
- `RequirementConflict` 继续作为冲突扫描对象存在
- 如冲突触发了正式变更，可通过 `sourceType=conflict`、`sourceRef=conflictId` 连接
- 不做表级整合

## 六、索引建议

### ChangeUnit
- `@@unique([requirementId, changeKey])`
- `@@index([requirementId, status, updatedAt])`
- `@@index([requirementId, riskLevel, status])`
- `@@index([requirementId, requiresResignoff])`
- `@@index([sourceType, sourceRef])`
- `@@index([proposedBy])`

### ChangeUnitRequirementUnit
- `@@unique([changeUnitId, requirementUnitId])`
- `@@index([requirementUnitId])`

### ChangeUnitIssueUnit
- `@@unique([changeUnitId, issueUnitId])`
- `@@index([issueUnitId])`

### Requirement
如第二阶段要在列表页展示 change 汇总，可考虑新增组合查询优化：
- 继续复用现有 Requirement 主索引
- 不急于增加与 change 直接耦合的冗余计数字段

## 七、迁移顺序建议

### 第 1 步
新增枚举：
- `ChangeUnitRiskLevel`
- `ChangeUnitStatus`

原因：
- 对 Prisma schema 改动清晰
- 可以先稳定业务语义

### 第 2 步
新增 `ChangeUnit` 主表。

原因：
- 第二阶段唯一主对象
- UI 和 API 均围绕它组织

### 第 3 步
新增关联表：
- `ChangeUnitRequirementUnit`
- `ChangeUnitIssueUnit`

原因：
- 尽早避免 JSON id 数组临时设计固化
- 让列表、详情、impact hints 查询更稳定

### 第 4 步
补后端聚合查询：
- requirement detail 的 change 列表
- requirement list 的 open change / high risk change count
- dashboard 的 pending review / high risk change summary

原因：
- 先完成 schema，再接服务和 UI，风险最低

### 第 5 步
如确有必要，再评估是否补充弱关联字段：
- `RequirementVersion.changeUnitId?`
- `ModelChangeLog.changeUnitId?`

建议：
- 第二阶段先不做
- 等最小闭环跑稳后再决定

## 八、迁移与兼容风险

### 风险 1
如果直接给 `RequirementVersion` 强加 `changeUnitId`，会把历史快照链与新语义层强绑定，增加迁移复杂度。

建议：
- 第一版只做弱关联，不改旧表

### 风险 2
如果 `ChangeUnit` 直接承担“审批流引擎”职责，字段会快速膨胀。

建议：
- 第二阶段只保留最小状态机和提示字段

### 风险 3
如果为了省事使用 JSON 数组存关联对象 id，后续查询会很快成为瓶颈。

建议：
- 即使是 MVP，也优先建两个小型桥接表

### 风险 4
如果提前落地图谱和原型表，会引入大量没有消费方的数据结构。

建议：
- 本轮只保留 `impactSummary` 与影响布尔位

## 九、本轮不建议做的数据库设计
- 不新增 `ImpactGraphNode` / `ImpactGraphEdge`
- 不新增 `PrototypePage` / `PrototypeMapping`
- 不给 `Requirement` 增加 change 统计冗余字段
- 不把 `ChangeUnit` 与 `RequirementStatus` 做自动同步
- 不把 `RequirementConflict`、`IssueUnit`、`ChangeUnit` 混成一个大表

## 十、建议结论
第二阶段数据库设计应聚焦三张表：
- `ChangeUnit`
- `ChangeUnitRequirementUnit`
- `ChangeUnitIssueUnit`

其余能力通过现有 `Requirement / RequirementUnit / IssueUnit / RequirementVersion / ModelChangeLog` 协同完成。这样既能形成正式变更闭环，又不会提前把系统推向高耦合图谱架构。

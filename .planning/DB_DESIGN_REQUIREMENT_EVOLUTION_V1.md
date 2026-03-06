# DB Design - Requirement Evolution V1

## 目标
为“需求演化管理系统”第一阶段提供最小数据库设计，使系统能在不破坏现有 `Requirement` 主链的前提下，新增：

- Requirement Unit
- Issue Unit
- Stability Model

本设计优先保证可增量迁移、可回滚、可与现有 Prisma 模型共存。

## 实施状态（2026-03-06 第二阶段）
- 已完成：`RequirementStabilityLevel`、`RequirementUnitStatus`、`IssueUnitSeverity`、`IssueUnitStatus` 枚举已进入 Prisma schema
- 已完成：`Requirement` 稳定度字段已进入 Prisma schema 与 migration 草案
- 已完成：`RequirementUnit`、`IssueUnit` 表已进入 Prisma schema 与 migration 草案
- 已完成：`npx prisma migrate deploy` 已执行，新增表与字段已落到本地数据库
- 已完成：已生成 Prisma Client，并通过 build 验证
- 未完成：其他环境的迁移与存量数据策略验证
- 未完成：`IssueUnitLink` 桥接表，本轮仍保持 deferred

## 设计原则
- 不替换现有 `Requirement`、`RequirementVersion`、`ModelChangeLog`、`RequirementConflict`
- 新对象全部从 `Requirement` 往下挂
- 稳定度先做字段级扩展，不额外引入复杂规则表
- 关系设计优先面向第一阶段闭环，避免为 P2/P3 提前抽象过度

## 一、Requirement Unit 表草案

### 表名建议
`RequirementUnit`

### 字段草案

| 字段 | 类型建议 | 说明 |
|------|----------|------|
| `id` | `String @id @default(cuid())` | 主键 |
| `requirementId` | `String` | 所属 Requirement |
| `parentUnitId` | `String?` | 支持轻量父子层级 |
| `unitKey` | `String` | 同一 Requirement 内的人类可读编号，如 `SCN-01` |
| `title` | `String` | 单元标题 |
| `summary` | `String @db.Text` | 单元摘要 |
| `layer` | `String` 或 enum | 如 `goal/role/scenario/flow/data/permission/exception/ui/constraint` |
| `status` | `String` 或 enum | 单元状态 |
| `stabilityLevel` | enum | `S0`~`S5` |
| `stabilityScore` | `Int?` | 0-100，可选 |
| `stabilityReason` | `String? @db.Text` | 稳定度判断依据 |
| `sourceType` | `String?` | 来源，如 `model/manual/clarification` |
| `sourceRef` | `String?` | 来源引用，例如路径或 question id |
| `acceptanceNotes` | `String? @db.Text` | 补充验收备注 |
| `ownerId` | `String?` | 负责人 |
| `sortOrder` | `Int @default(0)` | 页面内排序 |
| `createdBy` | `String` | 创建者 |
| `createdAt` | `DateTime @default(now())` | 创建时间 |
| `updatedAt` | `DateTime @updatedAt` | 更新时间 |

### 关系建议
- `Requirement 1 - n RequirementUnit`
- `RequirementUnit parent - children`
- `User 1 - n RequirementUnit(owner)`

### 备注
- 初版不建议把 Requirement 的五层 JSON 直接拆到子表，避免迁移复杂度过高
- `layer` 初版可先用字符串，等字段稳定后再收敛 enum

## 二、Issue Unit 表草案

### 表名建议
`IssueUnit`

### 字段草案

| 字段 | 类型建议 | 说明 |
|------|----------|------|
| `id` | `String @id @default(cuid())` | 主键 |
| `requirementId` | `String` | 所属 Requirement |
| `primaryRequirementUnitId` | `String?` | 主关联 Requirement Unit |
| `type` | `String` 或 enum | `ambiguity/missing/conflict/risk/pending_confirmation/...` |
| `severity` | enum | `LOW/MEDIUM/HIGH/CRITICAL` |
| `title` | `String` | 问题标题 |
| `description` | `String @db.Text` | 问题说明 |
| `status` | `String` 或 enum | `OPEN/TRIAGED/IN_PROGRESS/WAITING_CONFIRMATION/RESOLVED/REJECTED/ARCHIVED` |
| `blockDev` | `Boolean @default(false)` | 是否阻断当前推进 |
| `sourceType` | `String?` | 来源，如 `manual/conflict_scan/clarification/prototype` |
| `sourceRef` | `String?` | 外部引用 |
| `suggestedResolution` | `String? @db.Text` | 建议处理方案 |
| `resolvedNote` | `String? @db.Text` | 关闭说明 |
| `ownerId` | `String?` | 负责人 |
| `createdBy` | `String` | 创建者 |
| `createdAt` | `DateTime @default(now())` | 创建时间 |
| `updatedAt` | `DateTime @updatedAt` | 更新时间 |

### 关系建议
- `Requirement 1 - n IssueUnit`
- `RequirementUnit 1 - n IssueUnit` 先通过 `primaryRequirementUnitId` 实现主关联
- 如需一个 issue 关联多个 unit，建议另加桥接表，不要在第一阶段塞 JSON id 数组

## 三、Issue 与 Requirement Unit 关联表草案

### 表名建议
`IssueUnitLink`

### 用途
支持一个 Issue 关联多个 Requirement Unit，避免把 `related_requirement_unit_ids` 存成 JSON 数组后难以筛选和做索引。

### 字段草案

| 字段 | 类型建议 | 说明 |
|------|----------|------|
| `id` | `String @id @default(cuid())` | 主键 |
| `issueUnitId` | `String` | Issue |
| `requirementUnitId` | `String` | Requirement Unit |
| `relationType` | `String?` | 如 `primary/related/blocked_by` |
| `createdAt` | `DateTime @default(now())` | 创建时间 |

### 约束建议
- `@@unique([issueUnitId, requirementUnitId])`

## 四、稳定度字段设计

### 1. Requirement 表新增字段建议

| 字段 | 类型建议 | 说明 |
|------|----------|------|
| `stabilityLevel` | enum | Requirement 总体稳定度，`S0`~`S5` |
| `stabilityScore` | `Int?` | 可选分数，便于排序和展示 |
| `stabilityReason` | `String? @db.Text` | 当前判断依据 |
| `stabilityUpdatedAt` | `DateTime?` | 最后更新时间 |
| `stabilityUpdatedBy` | `String?` | 更新人 |

### 2. RequirementUnit 表内稳定度字段
- `stabilityLevel`
- `stabilityScore`
- `stabilityReason`

### 3. enum 建议

`RequirementStabilityLevel`
- `S0_IDEA`
- `S1_ROUGHLY_DEFINED`
- `S2_MAIN_FLOW_CLEAR`
- `S3_ALMOST_READY`
- `S4_READY_FOR_DEVELOPMENT`
- `S5_VERIFIED_STABLE`

说明：
- 数据库存储建议使用语义化 enum，而不是仅存 `S0` 字面值
- UI 层再映射成 `S0`~`S5`

## 五、与现有 Requirement / Model / Snapshot 等表的关系建议

### 与 `Requirement`
- `Requirement` 仍是顶层入口与权限边界
- `RequirementUnit`、`IssueUnit` 均通过 `requirementId` 挂到其下

### 与 `RequirementVersion`
- 继续作为整份需求模型的快照层
- 第一阶段不为 Requirement Unit 单独建 snapshot 表
- 如果 Requirement Unit 内容需要留痕，可先通过 `updatedAt` + `ModelChangeLog` 辅助追踪

### 与 `ModelChangeLog`
- 继续记录整体模型变更
- 不建议在第一阶段把 unit / issue 操作也塞进 `ModelChangeLog`
- 若后续需要对象级操作审计，再新增专门的 `EvolutionEventLog`

### 与 `RequirementConflict`
- 保留现状
- 第一阶段不改表、不迁移数据
- 建议未来定义“conflict 是 issue 的一种来源”，而不是马上合表

### 与 `ClarificationSession / ClarificationQuestion`
- 仍是需求澄清输入链
- 后续可以把未解决 clarification 问题转换为 `IssueUnit(type=pending_confirmation)`，但第一阶段不强制

### 与 `RequirementTestCaseSuite`
- 第一阶段只做逻辑关联，不需要外键直连
- 后续如果要实现 Requirement Unit -> Test Asset 的映射，再加桥接表

### 与 `SpecArtifact`
- 继续保持 Requirement 级别
- 第一阶段不拆到 Requirement Unit 级别 Spec

## 六、索引建议

### RequirementUnit
- `@@unique([requirementId, unitKey])`
- `@@index([requirementId, sortOrder])`
- `@@index([requirementId, layer, status])`
- `@@index([requirementId, stabilityLevel])`
- `@@index([parentUnitId])`
- `@@index([ownerId])`

### IssueUnit
- `@@index([requirementId, status, updatedAt])`
- `@@index([requirementId, severity, status])`
- `@@index([requirementId, blockDev, status])`
- `@@index([primaryRequirementUnitId])`
- `@@index([ownerId])`
- 如加 `sourceType + sourceRef` 去重需求，可考虑 `@@index([sourceType, sourceRef])`

### IssueUnitLink
- `@@unique([issueUnitId, requirementUnitId])`
- `@@index([requirementUnitId])`

### Requirement
- 新增 `@@index([stabilityLevel])`
- 如列表页会组合筛选，可考虑 `@@index([status, stabilityLevel, updatedAt])`

## 七、迁移顺序建议

### 第 1 步
给 `Requirement` 增加稳定度字段和 enum。
状态：已完成并已执行本地数据库迁移。

原因：
- 改动最小
- 可先让详情页显示“总体稳定度”
- 不依赖新对象表即可落地

### 第 2 步
新增 `RequirementUnit` 表。
状态：已完成并已执行本地数据库迁移。

原因：
- Requirement Unit 是第一阶段的核心对象
- 后续 IssueUnit 需要引用它

### 第 3 步
新增 `IssueUnit` 表。
状态：已完成并已执行本地数据库迁移。

原因：
- 问题系统建立后，稳定度和推进判断才有真实输入

### 第 4 步
新增 `IssueUnitLink` 表。
状态：本轮未实现，继续延后。

原因：
- 可在 Requirement Unit 和 Issue Unit 基础能力跑通后再补多对多
- 若 MVP 时间紧，可先仅保留 `primaryRequirementUnitId`

### 第 5 步
补业务代码中的列表查询、汇总统计和详情页接口。
状态：基础查询与详情页只读展示已完成；写接口未开始。

原因：
- 先完成 schema，再逐步接 UI 与服务
- 避免一次性大改路由和页面

## 八、本轮不建议做的数据库设计
- 不新增 `ChangeUnit` 表
- 不新增 `ImpactGraphNode` / `ImpactGraphEdge` 表
- 不把 `related_*_ids` 大量塞进 JSON 数组字段
- 不把 `RequirementConflict` 直接 rename 成 `IssueUnit`
- 不把五层模型拆成多张规范化子表

## 九、推荐的第一版 Prisma 对象边界

第一版建议稳定在以下边界：

- `Requirement`：顶层需求与工作流
- `RequirementUnit`：细粒度需求对象
- `IssueUnit`：细粒度问题对象
- `RequirementVersion` / `ModelChangeLog`：整体历史链
- `RequirementConflict`：保留为既有 AI 冲突检测结果表

这个边界能最小代价支持“需求演化管理”第一阶段，同时不给第二阶段 Change / Impact / Prototype 设死结构。

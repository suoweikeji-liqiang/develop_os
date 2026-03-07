# DB Design - Requirement Evolution V3

## 目标
为“需求演化管理系统”第三阶段提供最小数据库设计，把 `ChangeUnit` 与现有 `RequirementVersion / ModelChangeLog` 做低耦合弱关联，并为轻门禁提示提供稳定的数据基础。

本设计优先保证：
- 不破坏现有版本链
- 不要求回填历史数据
- 不把快照层和语义层混成单一模型
- 先支持追踪与提示，再考虑更强规则

## 实施状态（2026-03-06 第三阶段最小实现）
- 已完成：`ChangeUnit`、`ChangeUnitRequirementUnit`、`ChangeUnitIssueUnit` 已落地
- 已完成：列表页与 Dashboard 已有 change 聚合摘要
- 已完成：`RequirementVersion.changeUnitId`
- 已完成：`ModelChangeLog.changeUnitId`
- 已完成：相关 migration 已落到本地数据库
- 已完成：`requirement.updateModel`、`clarification.answer` 已接入 `changeUnitId`
- 已完成：基于 change / issue / signoff 的 gate hints 聚合查询
- 本轮不实现：`ImpactGraphNode / ImpactGraphEdge`
- 本轮不实现：`PrototypePage / PrototypeMapping`

## 设计原则
- `RequirementVersion` 继续是快照层
- `ModelChangeLog` 继续是记录层
- `ChangeUnit` 继续是语义层
- 关联方式采用可空外键，不做强制绑定
- 历史数据不回填，不设置非空约束

## 一、RequirementVersion 表增强草案

### 新增字段建议

| 字段 | 类型建议 | 说明 |
|------|----------|------|
| `changeUnitId` | `String?` | 该版本快照对应的 Change Unit，可空 |

### 关系建议
- `ChangeUnit 1 - n RequirementVersion`

### 索引建议
- `@@index([requirementId, changeUnitId])`
- 如已有 `requirementId + version` 主查询，不替代原索引

### 说明
- 只有显式由某个 Change 驱动的模型更新才填写
- 历史版本保持 `null`
- 一个 Change 可以对应多个版本

## 二、ModelChangeLog 表增强草案

### 新增字段建议

| 字段 | 类型建议 | 说明 |
|------|----------|------|
| `changeUnitId` | `String?` | 该条模型变更日志对应的 Change Unit，可空 |

### 关系建议
- `ChangeUnit 1 - n ModelChangeLog`

### 索引建议
- `@@index([requirementId, changeUnitId, createdAt])`

### 说明
- 对话修正、结构化更新、人工修改都可以选择携带该字段
- 不是所有变更日志都必须属于某个 Change

## 三、ChangeUnit 表增强建议

### 本轮是否新增字段
建议本轮不新增主字段。

原因：
- `ChangeUnit` 的主语义已经足够
- 追踪关系可通过 `RequirementVersion.changeUnitId` 与 `ModelChangeLog.changeUnitId` 反向聚合

### 可选增强
如后续需要更强回看，可考虑新增：
- `lastLinkedVersionId?`
- `lastAppliedTraceAt?`

但本轮不建议增加，避免冗余。

## 四、与现有表的关系建议

### `ChangeUnit -> RequirementVersion`
- 弱关联
- 由 `requirement.updateModel(changeUnitId?)` 在创建版本快照时写入
- 不要求 `ChangeUnit.status=APPLIED` 才能写入，但 UI 层应有一致性提示

### `ChangeUnit -> ModelChangeLog`
- 弱关联
- 在记录模型变更日志时同步写入 `changeUnitId`
- 方便后续展示“这次 Change 产生了哪些模型修订痕迹”

### `ChangeUnit -> ReviewSignoff`
- 本轮不加外键
- 仅通过 gate hints 与 UI 提示表达关系

### `ChangeUnit -> Requirement`
- 保持现有直接归属

## 五、迁移顺序建议

### 第 1 步
给 `RequirementVersion` 增加可空 `changeUnitId`。

原因：
- 先建立版本快照层的追踪位
- 风险最低

### 第 2 步
给 `ModelChangeLog` 增加可空 `changeUnitId`。

原因：
- 模型日志层与版本层保持一致

### 第 3 步
补索引与外键。

建议：
- 外键引用 `ChangeUnit(id)`
- `ON DELETE SET NULL`

原因：
- 避免删除 ChangeUnit 时破坏历史记录

### 第 4 步
扩展业务代码，把 `changeUnitId` 作为可选参数接入 `requirement.updateModel`

### 第 5 步
补聚合查询：
- change trace summary
- gate hints summary

## 六、外键与删除策略

### `RequirementVersion.changeUnitId`
- 外键到 `ChangeUnit(id)`
- `ON DELETE SET NULL`

### `ModelChangeLog.changeUnitId`
- 外键到 `ChangeUnit(id)`
- `ON DELETE SET NULL`

说明：
- 历史版本和历史日志不应因为 Change 被删除而失效

## 七、索引建议

### RequirementVersion
- 新增 `@@index([changeUnitId])`
- 新增 `@@index([requirementId, changeUnitId])`

### ModelChangeLog
- 新增 `@@index([changeUnitId])`
- 新增 `@@index([requirementId, changeUnitId, createdAt])`

### ChangeUnit
- 继续复用现有索引
- 不增加冗余追踪计数字段

## 八、门禁提示所需数据建议

本轮不新增独立表，直接通过现有对象聚合：
- open blocking issue count
- open high-risk change count
- open resignoff-needed change count
- current signoff count
- current requirement status

说明：
- Gate hints 先通过 service 计算
- 不在数据库层做预聚合表

## 九、风险提示

### 风险 1
如果把 `changeUnitId` 设为非空，会导致所有历史版本和日志迁移复杂化。

建议：
- 保持可空

### 风险 2
如果要求所有模型更新必须选择 Change Unit，会降低现有澄清与修正流程的流畅性。

建议：
- `changeUnitId` 继续可选
- UI 只在有正式 Change 时鼓励绑定

### 风险 3
如果 gate hints 数据被设计成冗余计数字段，后续一致性维护成本会很高。

建议：
- 先在 service 层计算

## 十、建议结论
第三阶段数据库设计只需要对两张现有表做增量增强：
- `RequirementVersion.changeUnitId?`
- `ModelChangeLog.changeUnitId?`

其余逻辑通过 `ChangeUnit`、`IssueUnit`、`ReviewSignoff` 的聚合查询完成。这样能最小成本补齐语义闭环，同时保住当前数据模型边界。

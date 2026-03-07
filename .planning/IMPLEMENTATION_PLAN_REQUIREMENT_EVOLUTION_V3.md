# Implementation Plan - Requirement Evolution V3

## 目标
在第二阶段已经完成 `Change Unit` 最小闭环的基础上，把 develop_os 推进到“需求演化管理系统”第三阶段：让 `Change Unit` 与 `RequirementVersion / ModelChangeLog` 建立明确但低耦合的语义关联，并把 `requiresResignoff / high-risk change / blocking issue` 从“仅可见”推进到“轻门禁提示”。

第三阶段的目标不是再扩对象，而是补齐语义闭环，让系统能够更稳定地回答：
- 这次正式变更最终落到了哪个版本变化上
- 哪些模型修正是由哪个 Change 驱动的
- 哪些变更虽然已批准，但还没有真正落地
- 当前是否存在需要重签字或谨慎推进的风险信号

## 产品边界
- 不把系统扩展成审批流平台
- 不把系统扩展成 DevOps 或项目管理平台
- 不直接建设完整 `Impact Graph`
- 不直接建设 `Prototype Mapping`
- 不改写现有需求澄清、签字、测试资产主链

## 阶段前提
- 第一阶段已完成：
  - Requirement Unit
  - Issue Unit
  - Stability Model
- 第二阶段已完成：
  - Change Unit
  - Change Queue
  - Change 关联 Requirement Unit / Issue Unit
  - 列表页 / Dashboard 的 change 可见性
- 当前主要缺口：
  - `ChangeUnit` 与 `RequirementVersion / ModelChangeLog` 没有显式关系
  - `applied` 仍然只是“语义状态”，没有可回看的落地痕迹
  - `requiresResignoff`、`high risk change` 还没有进入推进提示或门禁提示

## 实施状态（2026-03-06 第三阶段最小实现）
- 已完成：V1 对象化最小闭环
- 已完成：V2 `Change Unit` 最小闭环
- 已完成：`ChangeUnit -> RequirementVersion` 弱关联
- 已完成：`ChangeUnit -> ModelChangeLog` 弱关联
- 已完成：`requirement.updateModel`、`clarification.answer` 支持可选 `changeUnitId`
- 已完成：需求详情页 `Applied Trace` 最小展示
- 已完成：Version History 来源 Change 标签
- 已完成：`requiresResignoff / blocking issue / high-risk change` 的轻门禁提示
- 已完成：数据库级业务流测试覆盖 P3 最小闭环
- 本轮不实现：自动重签字
- 本轮不实现：状态自动回退
- 本轮不实现：完整影响图谱

## 范围

### 本阶段要做
1. 为 `RequirementVersion` 增加可空 `changeUnitId`
2. 为 `ModelChangeLog` 增加可空 `changeUnitId`
3. 在 `requirement.updateModel` 链路中支持“本次修改由哪个 Change 驱动”
4. 在 `ChangeUnit` 上展示关联版本与模型变更记录
5. 在详情页新增 `Change History / Applied Trace` 最小展示
6. 在状态推进或评审区域增加轻门禁提示：
   - 有 blocking issue
   - 有 high-risk open change
   - 有 requiresResignoff 且未处理的 change
7. 在 planning 文档中明确哪些只是提示，不是强阻断

### 本阶段只定义、不实现
- 自动把所有模型改动绑定到 Change Unit
- 自动从 diff 生成 Change Unit
- 自动清空或重置 signoff
- 自动把 Requirement 状态回退
- 图谱化影响分析
- 原型页面对象化

## 成功标准
- 一次 Change 被标记为 `applied` 后，用户能看到它关联了哪些版本变化或模型变更
- 用户能区分：
  - 已创建 change，但尚未落地
  - 已落地 change，且有版本记录
- 当存在关键风险时，系统会在推进区域给出明确提示
- 提示不破坏现有主流程，不强制用户走新的复杂审批路径

## 最小实现切口
第三阶段建议只围绕两条线推进：

1. `Change -> Version / ModelChangeLog`
2. `Change / Issue / Signoff` 的轻门禁提示

形成新的最小链路：

`Issue Unit`
-> `Change Unit`
-> `RequirementVersion / ModelChangeLog`
-> `Signoff Prompt / Status Prompt`

## 核心对象与关系

### 1. Change Unit（增强，不新增主对象）

#### 目标
让 Change Unit 从“正式变更对象”升级为“正式变更语义主轴”。

#### 本轮增强点
- 能关联多个 `RequirementVersion`
- 能关联多个 `ModelChangeLog`
- 能提供 “是否已真正落地” 的回看能力
- 能向详情页输出轻门禁提示

#### 与现有模型关系
- 继续归属于 `Requirement`
- 继续关联 `RequirementUnit`、`IssueUnit`
- 新增与 `RequirementVersion`、`ModelChangeLog` 的可空弱关联
- 不直接控制 `ReviewSignoff`

### 2. RequirementVersion（增强）

#### 目标
仍然保持“快照层”职责，但允许说明“这个版本来自哪个 Change”。

#### 本轮增强点
- 新增 `changeUnitId?`
- 在版本展示中可看到来源 Change

#### 边界
- 版本仍然是快照，不承担业务审批语义

### 3. ModelChangeLog（增强）

#### 目标
仍然保持“模型变更记录层”职责，但允许说明“这条变更记录由哪个 Change 驱动”。

#### 本轮增强点
- 新增 `changeUnitId?`
- 结构化、对话修正、手动模型更新都可选择携带该字段

#### 边界
- 不把 Change 的业务说明冗余复制到日志表

## API / service 建议

### Change 相关
- `changeUnit.listByRequirement` 返回：
  - linked version count
  - linked model change log count
  - latest applied trace
- `changeUnit.markApplied` 可保留为状态更新的语义封装，或继续复用 `updateStatus`
- `changeUnit.getTrace` 返回该 change 的版本与日志关联摘要

### Requirement / Version 相关
- `requirement.updateModel` 支持可选 `changeUnitId`
- `version.list` 返回版本来源 change 摘要

### Service 建议
- `linkChangeToRequirementVersion`
- `linkChangeToModelChangeLog`
- `buildRequirementGateHints`

其中 `buildRequirementGateHints` 第一版只基于：
- blocking issue 数
- open high-risk change 数
- open resignoff-needed change 数
- 当前 signoff / status

## 前端入口建议

### 详情页
新增或增强：
- `Change Queue` 中的 `Applied Trace`
- `Version History` 中的来源 Change 标签
- `Workflow status` 或 `Consensus` 区域的轻门禁提示

### 列表页
可选补充：
- `resignoff-needed change` 摘要

### Dashboard
可选补充：
- 待重签字提醒数

## 状态与提示策略

### 提示，不强阻断
第一版只做明确提示，不强制拦截。

推荐提示场景：
- 进入 `IN_REVIEW / CONSENSUS / IMPLEMENTING` 时存在 open blocking issue
- 存在 `HIGH / CRITICAL` 且未完成的 change
- 存在 `requiresResignoff=true` 且未处理的 change

### 后续可升级为强门禁
但这一升级留给后续 `约束执行系统` 阶段。

## 设计冲突与风险

### 风险 1
如果 `changeUnitId` 强制非空，会破坏现有历史版本与日志链。

建议：
- 仅加可空字段
- 不做历史数据回填强约束

### 风险 2
如果把轻提示直接做成强阻断，会破坏现有澄清主链路。

建议：
- 先提示，再评估是否升级为强门禁

### 风险 3
如果把 `RequirementVersion` 与 `ChangeUnit` 做成双向强依赖，会让快照层和语义层边界混乱。

建议：
- 版本表只持有可空 `changeUnitId`
- Change 侧通过查询聚合展示，不额外冗余

## 实施顺序

### Step 1. 规划与 schema
- 新增 V3 规划、DB、UI 文档
- 为 `RequirementVersion`、`ModelChangeLog` 增加可空 `changeUnitId` 草案

### Step 2. 数据层与 router
- 迁移 schema
- 扩展 `requirement.updateModel`
- 扩展 `changeUnit.listByRequirement`
- 补 `change trace` 查询

### Step 3. 详情页语义闭环
- Change Queue 展示 Applied Trace
- Version History 展示来源 Change
- 需求详情页展示 Gate Hints

### Step 4. 验证与状态同步
- 增加数据库级业务流测试
- 更新 planning 文档实施状态

## 建议结论
第三阶段不再扩对象，而是补“对象之间的语义闭环”。这是进入后续 `Impact Graph` 和 `约束执行系统` 之前最必要的一步。

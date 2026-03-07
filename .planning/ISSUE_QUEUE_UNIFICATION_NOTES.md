# Issue Queue Unification Notes

## 目标
把当前仓库里分散的问题推进入口收敛到 `Issue Queue`，并明确：

- `Issue Queue = 问题推进主入口`
- 旧冲突入口保留，但弱化为辅助视图
- Clarification 结果优先映射到 Issue Queue，而不是长期保留为平行处理面

## 现有问题入口梳理

### 1. Issue Queue
位置：

- `src/app/(dashboard)/explorations/[id]/issue-units-panel.tsx`
- `src/server/trpc/routers/issueUnit.ts`

现状：

- 已能创建 `IssueUnit`
- 已能展示 `RequirementConflict` 的投影项
- 已有状态、严重程度、阻断字段

问题：

- 类型体系没有统一常量
- 缺少标准过滤面
- Conflict 投影虽存在，但主处理心智还不够强

### 2. Conflict Panel
位置：

- `src/app/(dashboard)/explorations/[id]/conflict-panel.tsx`
- `src/server/trpc/routers/conflict.ts`

现状：

- 可重新扫描冲突
- 可查看证据、原因、建议动作
- 可更新冲突状态

问题：

- 与 Issue Queue 并列，用户会误解为“冲突有自己的主工作面”
- 和 Issue Queue 的处理入口重复

### 3. Clarification 区块
位置：

- `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
- `src/server/trpc/routers/clarification.ts`

现状：

- 可回答澄清问题
- 可把澄清问题手动转为 Issue

问题：

- 未进入 Issue Queue 的澄清问题依然形成平行问题池
- 用户可能在 Clarification 区块长期处理问题，而不是收敛到统一队列

## 为什么必须统一

如果问题推进继续分散在：

- Issue Queue
- Conflict Panel
- Clarification

三个入口里，后续 Requirement Unit、Stability、Change 都无法建立稳定的协同关系。

因为：

- Requirement Unit 需要统一的问题对象来承载推进阻塞
- Stability 需要统一的问题池来做成熟度判断
- 后续 impact summary 也需要统一的问题面作为输入

## 统一后的判断

### 主入口

- `Issue Queue` 是默认问题推进入口

### 辅助入口

- `Conflict Panel` 保留为扫描详情与证据辅助面
- `Clarification` 保留为原始问答与回填面

### 处理原则

- 任何需要“被推进、被跟踪、被判断状态”的问题，优先进入 Issue Queue

## 类型体系

本轮最小统一类型如下：

- `ambiguity`
- `missing`
- `conflict`
- `risk`
- `pending_confirmation`
- `prototype_doc_mismatch`
- `permission_gap`
- `exception_gap`

### 类型语义

#### ambiguity
描述不明确、边界模糊、实现会产生多解的问题。

#### missing
信息缺失、流程缺失、数据缺失、规则缺失。

#### conflict
Requirement 内外存在显著矛盾，或已有独立冲突结论需要统一处理。

#### risk
即使描述明确，也会对推进造成风险的项。

#### pending_confirmation
需要业务或角色进一步确认的项。

#### prototype_doc_mismatch
文档、原型、设计草稿之间出现不一致。

#### permission_gap
权限边界、角色动作、访问控制未闭合。

#### exception_gap
异常路径、错误处理、失败恢复没有讲清楚。

## 投影 / 映射规则

### Conflict Scan -> Issue Queue

- `RequirementConflict` 保留原对象
- 同时投影到 Issue Queue 展示
- Issue Queue 作为默认查看与推进入口

### Clarification -> Issue Queue

- `RISK` 类澄清优先映射为 `risk`
- 其他待确认澄清优先映射为 `pending_confirmation`
- 本轮仍允许手动转换，不做重型自动迁移

### 手工补录 -> Issue Queue

- 允许用户直接创建问题
- 必须从统一类型体系中选择类型

## 过滤体系

Issue Queue 至少支持以下维度过滤：

- `type`
- `status`
- `severity`
- `blocking / non-blocking`

设计原则：

- 过滤优先服务于“快速定位要先处理什么”
- 不做复杂 Saved View
- 不做单独问题管理页面

## 旧冲突入口如何过渡

### 本轮处理策略

- 不删除 `Conflict Panel`
- 在 UI 上明确其为“扫描详情 / 证据面”
- 把默认问题推进心智移到 `Issue Queue`

### 不在本轮做的事

- 不迁移数据库对象
- 不把 `RequirementConflict` 直接改表为 `IssueUnit`
- 不做 Conflict 全量并表

## 本轮实现收敛建议

### Router

- `issueUnit.listByRequirement` 继续返回 unified queue
- `issueUnit.create / update` 使用统一类型体系
- 如需最小串联，可允许 Issue Queue 中处理 Conflict 的状态映射

### UI

- 在 `Issue Queue` 面板顶部明确写清楚：
  - 这是问题推进默认主入口
  - Conflict / Clarification 会在此汇总或被引导收敛
- 增加过滤器
- 明确显示：
  - issue type
  - severity
  - status
  - blocking 标识
  - 来源

## 本轮为何不做重型迁移

原因很简单：

- 当前仓库已经有 `RequirementConflict` 独立对象
- 当前也已经有 `ClarificationQuestion`
- 这轮重点是收敛工作面，不是重做对象模型

所以本轮正确策略是：

- 统一入口
- 统一类型
- 统一展示
- 最小串联

而不是一次性并表或重建问题子系统。

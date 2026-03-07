# Next Iteration - Requirement Worksurface

## 本轮目标
在当前仓库已经完成 `Requirement Unit / Issue Unit / Stability / Change Unit` 第一轮落地的基础上，继续收紧“需求推进工作面”。

本轮不是扩系统主题，而是把当前已经存在的对象关系讲清楚、入口收敛清楚、推进机制收紧清楚。

核心目标只有一个：

- 让用户在推进一个需求时，知道主入口在哪里、每个对象各管什么、哪些动作应该落在哪个对象上。

## 产品判断
本轮固定以下判断，不再摇摆：

- `Requirement = 总览与顶层边界对象`
- `Requirement Unit = 需求颗粒推进对象`
- `Issue Queue = 问题推进主入口`
- `Stability = 推进成熟度判断器`

## 用户工作面心智
用户推进一个需求时，应该遵循下面这条主线：

1. 先在 `Requirement` 上定义顶层目标、边界、状态、版本链与总体统计
2. 再在 `Requirement Unit` 上把需求拆成可推进、可判断成熟度的颗粒对象
3. 把推进中的模糊项、缺失项、冲突项、风险项统一收敛到 `Issue Queue`
4. 用 `Stability` 对 Requirement 和 Requirement Unit 当前成熟度做推荐型判断

因此，主工作面不应再被理解为“探索台”，而应被理解为“Requirement Worksurface”。

## 当前对象职责梳理

### Requirement
当前承载位置：

- `src/app/(dashboard)/explorations/[id]/page.tsx`
- `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
- `src/server/trpc/routers/requirement.ts`
- `prisma/schema.prisma` 中 `Requirement`

当前已经承担的职责：

- 顶层标题、原始上下文、结构化模型、版本号
- 顶层工作流状态 `status`
- 顶层稳定度 `stabilityLevel / stabilityScore / stabilityReason`
- 版本链、对话、评论、signoff、测试资产、变更关联

当前问题：

- 路由和页面文案仍然以 `exploration` 为主，Requirement 的顶层对象身份被弱化
- 顶层工作面里混入了过多颗粒动作，用户不容易区分“总览”与“推进对象”

### Requirement Unit
当前承载位置：

- `src/app/(dashboard)/explorations/[id]/requirement-units-panel.tsx`
- `src/server/trpc/routers/requirementUnit.ts`
- `src/server/requirements/requirement-units.ts`
- `prisma/schema.prisma` 中 `RequirementUnit`

当前已经承担的职责：

- 需求拆分、分层、颗粒推进
- 单元状态维护
- 单元稳定度维护
- 与 Issue 的关联

当前问题：

- 已具备对象化能力，但在详情页上还没有被明确标识为“Requirement 的颗粒推进层”
- 用户容易把 Requirement Unit 当成另一个顶层定义对象，而不是 Requirement 的推进单元

### Issue Queue / Issue Unit
当前承载位置：

- `src/app/(dashboard)/explorations/[id]/issue-units-panel.tsx`
- `src/server/trpc/routers/issueUnit.ts`
- `prisma/schema.prisma` 中 `IssueUnit`

当前已经承担的职责：

- 记录问题对象
- 关联 Requirement Unit
- 展示状态、严重程度、阻断信息
- 把 `RequirementConflict` 结果投影进队列

当前问题：

- `type` 仍是自由字符串，常量、枚举、映射没有收紧
- `Issue Queue`、`Conflict Panel`、`Clarification` 仍是并行问题入口
- 过滤能力还不够，不能形成真正的统一问题面

### Stability
当前承载位置：

- `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
- `src/app/(dashboard)/explorations/[id]/requirement-units-panel.tsx`
- `src/app/(dashboard)/explorations/[id]/stability-badge.tsx`
- `src/server/trpc/routers/requirement.ts`
- `src/server/trpc/routers/requirementUnit.ts`

当前已经承担的职责：

- Requirement 与 Requirement Unit 的稳定度记录
- 顶层 badge 展示
- 简单 gate hint 的一部分输入

当前问题：

- 目前更像“手动字段”，还不是“推荐型判断器”
- 没有一个稳定度总览区把总体稳定度、关键单元稳定度、阻断问题之间的关系讲清楚

## 当前职责重叠 / 心智混乱点

### 1. Requirement 详情页真实上仍是 Exploration 工作台
现状：

- `src/app/(dashboard)/requirements/[id]/page.tsx` 直接重定向到 `/explorations/[id]`
- 详情页标题、入口、列表、按钮都以 `exploration` 为主要文案

问题：

- Requirement 作为顶层对象存在，但用户进入的却是“探索页”
- Requirement 的顶层边界对象身份被路由和文案稀释

### 2. Issue Queue、Conflict Panel、Clarification 是并行问题面
现状：

- `Issue Queue` 展示 `IssueUnit` + Conflict 投影
- `Conflict Panel` 仍单独承载冲突查看与处理
- `Clarification` 区块仍保留“待回答问题 -> 转为 Issue”的平行流程

问题：

- 用户无法快速判断“问题默认应该去哪里处理”
- 同一种推进阻塞信息被拆成多个面

### 3. Stability 与推进建议没有真正闭环
现状：

- Requirement 和 Unit 都能保存稳定度
- 但提示逻辑主要集中在 `getGateHints`

问题：

- Stability 没有成为“成熟度判断器”
- 用户看不到“当前为什么不建议进入开发”“应该先补哪个单元”

### 4. Requirement 与 Requirement Unit 的边界提示不够强
现状：

- Requirement 页同时承载总览和很多颗粒推进动作
- Requirement Unit 面板中已经有编辑、状态、稳定度

问题：

- 用户容易误解为 Requirement Unit 也可以定义顶层边界
- 也容易把所有日常推进动作重新堆回 Requirement 顶层

## 当前页面 / 组件梳理

### 展示 Requirement 的页面

- `src/app/(dashboard)/requirements/page.tsx`
- `src/app/(dashboard)/requirements/[id]/page.tsx`
- `src/app/(dashboard)/explorations/page.tsx`
- `src/app/(dashboard)/explorations/[id]/page.tsx`
- `src/app/(dashboard)/explorations/exploration-index-page.tsx`
- `src/app/(dashboard)/explorations/explorations-list-client.tsx`

说明：

- `requirements/*` 目前基本是别名或重定向
- 真正承载 Requirement 列表与详情的是 `explorations/*`

### 展示 Requirement Units 的页面 / 组件

- `src/app/(dashboard)/explorations/[id]/requirement-units-panel.tsx`
- Requirement 列表卡片也会展示 unit count，但不是入口面

### 展示 Issues 的页面 / 组件

- `src/app/(dashboard)/explorations/[id]/issue-units-panel.tsx`
- `src/app/(dashboard)/explorations/[id]/conflict-panel.tsx`
- `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx` 中的 clarification 区块

### 展示 Stability 的页面 / 组件

- `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
- `src/app/(dashboard)/explorations/[id]/requirement-units-panel.tsx`
- `src/app/(dashboard)/explorations/[id]/stability-badge.tsx`
- Requirement 列表卡片会展示 Requirement 稳定度

### 重复入口

- `/requirements` 与 `/explorations` 指向同一批对象，但主入口认知不统一
- `Issue Queue` 与 `Conflict Panel` 都在做问题查看
- `Clarification` 与 `Issue Queue` 都在承载待推进问题
- Stability 同时出现在页头 badge、详情编辑区、Unit 列表，但缺少统一 summary

### 缺失入口

- 缺少一个明确命名的 `Requirement Worksurface`
- 缺少一个 Requirement 详情页内的四段式主结构：
  - 总览区
  - Requirement Units 区
  - Issue Queue 区
  - Stability Summary 区
- 缺少一个轻量 impact summary

## 建议的最终工作面结构

### 页面级主结构

1. `Requirement Header`
2. `Requirement Worksurface Summary`
3. `总览区`
4. `Stability Summary 区`
5. `Requirement Units 区`
6. `Issue Queue 区`
7. `Secondary Tools`

### 四个核心区块定义

#### 总览区
承载：

- Requirement 顶层说明
- 当前 workflow status
- 版本链入口
- 顶层统计
- Requirement 顶层影响摘要

不承载：

- 日常问题逐条处理
- 所有颗粒化推进动作

#### Requirement Units 区
承载：

- 需求颗粒拆分
- 每个单元的状态、稳定度、问题关联

不承载：

- Requirement 顶层边界重新定义
- 顶层版本链或全局工作流

#### Issue Queue 区
承载：

- 问题推进默认主入口
- 手工 Issue + Clarification 映射问题 + Conflict 投影问题
- 类型、严重程度、阻断、状态、过滤

保留但弱化：

- 独立 Conflict 视图
- Clarification 原始问答区

#### Stability Summary 区
承载：

- Requirement 总体稳定度
- Requirement Units 稳定度摘要
- 推荐型推进提示
- 轻量成熟度建议

不承载：

- 强阻断门禁
- 审批流控制

## 页面级入口建议

### 主入口

- 把 `/requirements` 视为主入口命名
- `/requirements/[id]` 视为主 Requirement Worksurface

### 保留但弱化的旧入口

- `/explorations`
- `/explorations/[id]`

处理原则：

- 短期保留兼容
- UI 文案和跳转优先朝 `Requirement` 收敛
- 不做本轮大规模路由迁移

## API / router / service 收敛建议

### Router

- `requirement` router 继续负责顶层对象与 worksurface summary 聚合
- `requirementUnit` router 继续负责颗粒单元维护
- `issueUnit` router 负责统一问题队列
- `conflict` router 保留，但更多作为扫描与兼容入口

### Service

建议新增或收敛一层 worksurface 计算：

- `buildRequirementWorksurfaceSummary`
- `buildRequirementGuidanceHints`
- `buildRequirementImpactSummary`

这层服务负责：

- 统计 Requirement Units / Issues / Stability 之间的关系
- 生成软提示
- 生成 impact summary

### 本轮不做的 router / service 级工作

- 不新建独立 `Change Unit` 子系统
- 不引入 Impact Graph
- 不做复杂事件驱动影响计算
- 不做强阻断 gate engine

## P1 / P2-lite 范围

### P1 本轮只做

1. 在 Requirement 详情页明确主工作面四区结构
2. 收紧 Issue 类型体系与过滤能力
3. 让 Issue Queue 成为默认问题推进入口
4. 让 Stability 成为推荐型判断器
5. 强化 Requirement 与 Requirement Unit 的文案边界

### P2-lite 本轮只做

1. 新增轻量 impact summary
2. 基于现有 Requirement / Requirement Unit / Issue 数据做规则驱动摘要
3. 展示“影响到多少单元 / 多少 open issues / 是否有 blocking issue / 是否可能影响稳定度”

### P2-lite 当前已落地

- 顶部 `Impact Summary` 已从“纯数字 + 原因标签”增强为：
  - headline
  - signal cards
  - suggested next step
- 当前使用的信号仍全部来自现有对象聚合，不引入 Change Unit 子系统：
  - `affectedRequirementUnitCount`
  - `openIssueCount`
  - `blockingIssueCount`
  - `openConflictCount`
  - `pendingClarificationCount`
  - `unitsBelowTarget`
  - `requirementStabilityLevel`
- 当前解释重点是：
  - 为什么系统认为这次推进会继续牵动其他 Requirement Units
  - 为什么 Issue Queue / Clarification / Conflict / Stability 会继续影响推进
  - 下一步建议优先回到哪里处理

### 本轮明确不做

- 正式 Change Unit 全量扩展
- Impact Graph / 图数据库
- Prototype Mapping 全量接入
- 强阻断门禁
- 大规模页面重构
- 多智能体壳扩展

## 风险点

### 风险 1
如果只改文案，不改区块结构，用户仍然会把详情页理解成“探索混合工作台”。

### 风险 2
如果 Issue Queue 继续让 Conflict/Clarification 保持更强入口，统一问题面不会真正成立。

### 风险 3
如果 Stability 仍然只保留编辑字段，而没有推荐语义，后续成熟度判断会继续漂移。

## 后续预留

下一轮适合继续推进：

- Change Unit 与本轮 impact summary 的关系收紧
- Clarification 到 Issue Queue 的更自然自动映射
- Stability 与 signoff / workflow 的更明确协同
- Prototype / Doc mismatch 的更完整接入

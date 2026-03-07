# Stability Layer Rules V1

## 当前状态

### 相关对象与入口
- `RequirementUnit.layer`：`prisma/schema.prisma`
- `requirementUnit` router：`src/server/trpc/routers/requirementUnit.ts`
- Requirement Units UI：`src/app/(dashboard)/explorations/[id]/requirement-units-panel.tsx`
- worksurface guidance：`src/server/requirements/worksurface.ts`
- Requirement worksurface UI：`src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`

### 当前 layer 现状
当前 Requirement Unit 的 layer 在 UI 与 router 中以字符串方式维护，页面显式可选项来自：
- `goal`
- `role`
- `scenario`
- `flow`
- `data`
- `permission`
- `exception`
- `ui`
- `constraint`

来源位置：
- 创建 / 编辑 Requirement Unit：`src/app/(dashboard)/explorations/[id]/requirement-units-panel.tsx`
- `requirementUnit.create/update` 目前只做 `toLowerCase()`，没有统一 layer helper

### 当前 Stability 规则现状
- Requirement worksurface 目前只有统一目标线：
  - `TARGET_REQUIREMENT_UNIT_STABILITY_LEVEL = S3_ALMOST_READY`
- 所有非归档 Requirement Unit 只按一条规则判断：
  - 是否低于 `S3_ALMOST_READY`
- 当前 guidance 生成位置：
  - `src/server/requirements/worksurface.ts`

### 当前 UI 展示
- Requirement 详情页会显示总体 Stability Summary
- Requirement Unit 列表会显示：
  - layer
  - stability level
  - stability score
  - stability reason
- 但不会告诉用户：
  - 当前 layer 的推荐目标稳定度是什么
  - 为什么这个 layer 需要这个目标线

## 存在问题

### 1. layer 已存在，但没有进入 Stability 解释逻辑
- layer 只是展示字段
- guidance 仍然是统一规则

### 2. 不同 layer 的成熟度要求其实天然不同
- `goal` / `scenario` / `flow` 通常更接近主推进骨架
- `exception` / `permission` / `constraint` 更像边界闭合层
- `ui` 往往需要更明确的交互与文档一致性

但当前代码没有表达这种差异。

### 3. layer 仍是字符串散落
- 创建和编辑处重复枚举 layer
- worksurface summary 没有 layer helper
- 后续如果补分层规则，容易继续散

## 本轮范围

### 要做
1. 把当前 layer 集合抽成统一 helper / constant
2. 定义一版最小的：
  - `layer -> target stability`
  - `layer -> guidance copy`
3. 在 Requirement worksurface 和 Unit 列表中体现：
  - 当前单元 layer
  - 推荐目标稳定度
  - 分层提示原因

### 规则设计原则
- 不做复杂策略中心
- 不做可配置后台
- 不做自动评分引擎
- 只做静态映射 + 软提示

### 建议的实现位置
- helper：
  - 新增 `src/lib/requirement-unit-layer.ts`
  - 或在 `src/server/requirements/worksurface.ts` 基础上拆出 layer helper
- UI：
  - `src/app/(dashboard)/explorations/[id]/requirement-units-panel.tsx`
  - `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`

## 本轮落地规则（已实现）

### 已统一的 layer 集合
- `goal`
- `role`
- `scenario`
- `flow`
- `data`
- `permission`
- `exception`
- `ui`
- `constraint`

统一位置：
- `src/lib/requirement-unit-layer.ts`

### layer -> target stability 映射
- `goal -> S2_MAIN_FLOW_CLEAR`
- `role -> S2_MAIN_FLOW_CLEAR`
- `scenario -> S3_ALMOST_READY`
- `flow -> S3_ALMOST_READY`
- `data -> S3_ALMOST_READY`
- `ui -> S3_ALMOST_READY`
- `permission -> S4_READY_FOR_DEVELOPMENT`
- `exception -> S4_READY_FOR_DEVELOPMENT`
- `constraint -> S4_READY_FOR_DEVELOPMENT`

### 页面体现方式
- Requirement Units 列表现在会显示：
  - 当前 layer
  - 该 layer 的推荐目标稳定度
  - 当前是否达到本层目标
  - 为什么该层使用这个目标线
- Requirement 详情页的 Stability Summary 现在会显示分层目标带：
  - `S2_MAIN_FLOW_CLEAR`：`Goal / Role`
  - `S3_ALMOST_READY`：`Scenario / Flow / Data / UI`
  - `S4_READY_FOR_DEVELOPMENT`：`Permission / Exception / Constraint`

### worksurface guidance 的最小变化
- `unitsBelowTarget` 不再按统一 `S3` 计算
- 改为按各自 layer 的推荐目标计算
- Guidance 文案会优先提示哪些 layer 仍低于目标线

## 非目标
- 不做复杂权重评分
- 不做 layer 级强阻断
- 不做 layer 级审批流
- 不引入新表或复杂策略 DSL

## 后续预留
- 针对不同 layer 的更细 guidance
- 将 layer target 与 Impact Summary / Issue 类型进一步结合
- 根据 Requirement status 调整不同 layer 的目标线

## 状态更新

### 已完成
- `RequirementUnit.layer` 已统一收口到 `src/lib/requirement-unit-layer.ts`
- layer-aware `target stability` 和 guidance copy 已进入 helper、worksurface 和 Unit 列表
- `unitsBelowTarget` 已改为按各自 layer 的推荐目标计算
- Stability Summary 已补“推荐型治理”信息：
  - 可优先推进的 Units
  - 应优先补齐的 Units
  - 当前主要风险 Layer
  - 准备进入下一阶段前的软提示
- Requirement Unit 列表已补逐条推进建议，不再只显示稳定度标签

### 当前残留
- 仍是静态映射，不按 Requirement status 或领域上下文动态调整
- 自定义 layer 仍按默认 `S3` fallback 处理
- 下一阶段提示仍是规则摘要，不是状态门禁

### 下一轮可继续推进
- 根据 Requirement status 调整不同 layer 的目标线
- 在 worksurface 中给出更明确的具体 Unit 优先级

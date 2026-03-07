# Worksurface 1.0 Closing Plan

## 当前状态

### 当前 Requirement Worksurface 已经具备什么
- 主入口已经切回：
  - `src/app/(dashboard)/requirements/page.tsx`
  - `src/app/(dashboard)/requirements/new/page.tsx`
  - `src/app/(dashboard)/requirements/[id]/page.tsx`
- Requirement 详情页已经形成四个主区，主实现位于：
  - `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx`
  - Overview
  - Requirement Units
  - Issue Queue
  - Stability Summary
- Requirement Unit / Issue Queue / Stability 的核心推进面已经迁回：
  - `src/app/(dashboard)/requirements/[id]/requirement-units-panel.tsx`
  - `src/app/(dashboard)/requirements/[id]/issue-units-panel.tsx`
  - `src/app/(dashboard)/requirements/[id]/conflict-panel.tsx`
  - `src/app/(dashboard)/requirements/[id]/stability-badge.tsx`
- Clarification 已具备最小闭环：
  - queue eligibility
  - issue projection
  - `primaryRequirementUnitId`
  - callback needed
  - `conclusionSignal`
- Conflict 已退回来源 / 证据面，Issue Queue 已成为默认处理面。
- Impact Summary 已具备：
  - `affectedRequirementUnits`
  - `Advance First`
  - `Stabilize First`
  - `Conclusion Sink Highlights`
  - `actionPlan`
- Issue Queue 已具备统一优先级信号：
  - `Phase Blocker`
  - `Highest Leverage`
  - `Fast Stabilization Win`

### 距离 Worksurface 1.0 还差哪几步
1. Requirement 主路径还残留少量非核心共享壳依附在 `explorations/[id]/*`
2. 结论落点已经细到内容块类型，但还没有细到具体正文位置
3. stage-aware priority 已建立，但仍是轻量规则而不是正式阶段机
4. 还需要一份里程碑固化文档，把 Worksurface 1.0 的边界讲清楚

## 本轮范围

### 本轮“收官型迭代”的 3 个核心目标
1. 主路径更纯
   - 优先迁移仍直接挂在 `explorations/[id]/*` 的确认 / 共识 / 验证面板
2. 结论落点更细
   - 把 Clarification 来源结论从“落到哪个 Unit”推进到“更像落到 Unit 的哪类内容块”
3. 优先级更 stage-aware
   - 让 Issue Queue / Stability / Impact Summary 更直接回答“当前阶段先处理哪个最值”

### 实现顺序建议
1. 先补本轮 planning 文档
2. 先做主路径纯度迁移，收掉 `signoff-panel / consensus-status / test-case-panel`
3. 再做 conclusion sink 细化，保持闭环链路最短
4. 再做 stage-aware priority，让问题面、判断面、结论面口径一致
5. 最后补里程碑文档和状态更新

### 收官验收标准建议
- `/requirements/[id]` 主路径中，确认 / 共识 / 验证相关核心组件不再直接从 `explorations/[id]/*` 引入
- Clarification / Issue Queue / Requirement Unit / Impact Summary 都能提示“结论更像沉到 Unit 的哪类内容块”
- Issue Queue 和 Stability Summary 能共同回答“当前阶段先处理哪个最值”
- 里程碑文档能够明确说明：
  - 已解决什么
  - 还没解决什么
  - 1.0 明确不包含什么

## 当前状态更新
- `signoff-panel / consensus-status / test-case-panel` 已迁回 `requirements/[id]/*`
- conclusionSignal 已细化为内容块级提示：
  - `boundary_note`
  - `risk_note`
  - `missing_info`
  - `conflict_decision`
  - `assumption_resolution`
  - `implementation_hint`
  - `no_content_sink`
- Issue Queue / Stability / Impact Summary 已共享轻量 stage context：
  - 边界澄清阶段
  - 需求收敛阶段
  - 开发准备阶段
  - 验证收尾阶段
- 本轮新增里程碑文档：
  - `.planning/MILESTONE_REQUIREMENT_WORKSURFACE_1_0.md`

## 非目标
- 不修改数据库 schema
- 不做正式 Change Unit
- 不做完整 Impact Graph
- 不做 Prototype Mapping 大接入
- 不做强门禁
- 不做大规模目录重构
- 不把系统扩成项目管理平台或 DevOps 平台

## 风险

### 风险 1
- 如果把“收官型迭代”做成大面积目录清理，会偏离 Worksurface 1.0 的真正目标

### 风险 2
- 如果把“结论落点更细”做成自动写正文，会把系统带向重型知识映射或内容块系统

### 风险 3
- 如果 stage-aware priority 规则过深，会损失当前已经建立起来的可解释性

## 后续预留
- `model-tabs / role-view-tabs / chat-panel / assumption-card` 仍可在后续继续迁移或抽共享
- “结论沉淀到哪个 Unit 字段”可作为下一阶段轻量深化点
- stage-aware priority 后续可继续细化到阶段特定 bucket，但仍保持规则驱动

# Unit Callback Link Plan V1

## 当前状态

### Clarification / Issue / Requirement Unit / Impact Summary 当前关系
- Clarification 来源面：
  - `src/server/trpc/routers/clarification.ts`
  - `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx`
- Issue Queue 处理面：
  - `src/server/trpc/routers/issueUnit.ts`
  - `src/app/(dashboard)/explorations/[id]/issue-units-panel.tsx`
- Requirement Unit 推进面：
  - `src/server/trpc/routers/requirementUnit.ts`
  - `src/app/(dashboard)/explorations/[id]/requirement-units-panel.tsx`
- Impact Summary 汇总面：
  - `src/server/requirements/worksurface.ts`
  - `src/server/trpc/routers/requirement.ts`
  - `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx`

### 哪些链路已经存在
- Clarification 可以进入 Issue Queue：
  - `clarification.createIssue`
- Issue 可以绑定 `primaryRequirementUnitId`
- Issue Queue 当前已经能显示：
  - `primaryRequirementUnit`
  - 来源标签
  - 来源状态
  - 回源确认语义
- Impact Summary 当前会把以下 Unit 视为受影响：
  - 关联 active issue 的 Unit
  - 低于分层稳定度目标的 Unit

### 哪些链路还靠人工脑补
- Clarification 自己当前看不到：
  - 对应 issue 影响了哪个 Requirement Unit
  - 这个结论会改善哪个 Unit 的推进条件
- Requirement Unit 当前看不到：
  - 它为什么会被某个 Clarification 来源问题影响
  - 是否有待回源确认的来源问题仍挂在它身上
- Impact Summary 当前虽然能列出 affected units，但还不能直接指出：
  - 这些影响里哪些来自 Clarification 来源问题
  - 这些问题关闭后对 Unit 的推进帮助是什么

## 本轮范围

### 本轮最小回链方案
1. Clarification 侧补最小 Unit 关系表达
   - 如果对应 issue 已绑定 `primaryRequirementUnitId`
   - 或能低成本判断推荐目标 unit
   - 则在 Clarification 区直接显示“影响 Unit / 已关联 Unit”
2. Issue Queue 侧强化 Unit 回链
   - Clarification 来源问题在队列中更明确显示影响 Unit
   - 关闭后更明确显示“将改善哪个 Unit 的推进理解”
3. Requirement Unit 侧补来源问题投影
   - 最小展示与当前 Unit 直接关联的：
     - Clarification 来源问题
     - 待回源确认项
4. Impact Summary 侧补来源归因
   - affected units 不只列原因，还能更直白区分：
     - 来源问题
     - 稳定度未达标
     - 回源确认未完成

### 当前状态更新
- `ISSUE 1` 已落实最小 Clarification -> Requirement Unit 回链：
  - `clarification.createIssue` 允许直接写入 `primaryRequirementUnitId`
  - `clarification.list` 会回传 `issueProjection.primaryRequirementUnit`
  - `requirementUnit.listByRequirement` 会回传 linked clarifications 与 callback 摘要
  - Requirement 详情页 Clarification 区、Issue Queue 区、Requirement Units 区已经可以直接看到这条回链
- `ISSUE 2` 已把 Requirement Unit -> Impact Summary 的解释补齐一层：
  - Impact Summary 会点名当前优先推进 / 优先补齐的 Unit
  - Requirement Unit 卡片能直接看到自己为什么被总体摘要关注
  - `nextActions` 不再只描述状态，而会优先指向具体 Unit 推进动作

### 哪些动作自动
- Clarification -> Issue 的最小投影
- Issue -> `primaryRequirementUnitId` 的现有绑定
- Impact Summary 根据 active issue / below-target unit 生成受影响摘要
- UI 基于当前态给出回链提示

### 哪些动作仍然人工确认
- Clarification 最终影响哪个 Requirement Unit，如果当前没有明确绑定，仍允许人工决定
- issue 关闭后是否真的改善某个 Unit 的推进条件
- Clarification 是否可以标记为已收敛
- Unit 是否应升级状态或稳定度

## 非目标
- 不做复杂自动匹配引擎
- 不引入 Clarification 与 Requirement Unit 的新表关系
- 不做完整问题状态机
- 不自动变更 Unit 状态或稳定度

## 风险

### 风险 1
- 如果直接把 Clarification 强绑定到 Requirement Unit，容易把来源对象做得过重

### 风险 2
- 如果回链表达只加在 Impact Summary，不加在 Clarification / Unit 局部，用户仍需要跨区脑补

### 风险 3
- 如果过度依赖推荐绑定而没有明确区分“已绑定 / 推荐绑定”，会造成伪真源

## 后续预留
- Clarification -> Unit 的更明确推荐绑定动作
- Unit 局部的更多来源问题摘要
- Impact Summary 与来源问题类型的更细归因

# Issue Lifecycle Alignment V1

## 当前状态

### 相关对象与入口
- `IssueUnit`：`prisma/schema.prisma`
- `issueUnit` router：`src/server/trpc/routers/issueUnit.ts`
- `clarification` router：`src/server/trpc/routers/clarification.ts`
- `conflict` router：`src/server/trpc/routers/conflict.ts`
- `Issue Queue` UI：`src/app/(dashboard)/explorations/[id]/issue-units-panel.tsx`
- `Conflict Panel` UI：`src/app/(dashboard)/explorations/[id]/conflict-panel.tsx`
- Requirement worksurface：`src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`

### 现在已经成立的最小生命周期

#### Clarification -> Issue
- `clarification.createIssue` 当前允许把澄清问题手动转为 `IssueUnit`
- 当前映射规则是：
  - `RISK` 类问题 -> `risk`
  - 其他问题 -> `pending_confirmation`
- 转入后的 `IssueUnit` 会写入：
  - `sourceType = clarification`
  - `sourceRef = questionId`
- Requirement 详情页中的 Clarification 区块文案已改成“转入 Issue Queue”

#### Conflict -> Issue Projection
- `issueUnit.listByRequirement` 会把 `RequirementConflict` 以 projection 形式并入 Issue Queue
- 当前映射规则是：
  - `RequirementConflict.status.OPEN -> Issue status.OPEN`
  - `RequirementConflict.status.RESOLVED -> Issue status.RESOLVED`
  - `RequirementConflict.status.DISMISSED -> Issue status.REJECTED`
- 当前在 Issue Queue 中可以直接改 projection 状态，并回写到 `conflict.updateStatus`

#### Issue Queue
- 已经成为默认问题推进入口
- 已具备：
  - 类型体系：`src/lib/issue-queue.ts`
  - 严重度、状态、阻断标识
  - 来源标签
  - 筛选：`type / status / severity / blocking`

### 当前展示语义
- Issue Queue 会显示：
  - 来源标签
  - 阻断标识
  - 当前状态
  - 建议处理文案
- Conflict Panel 已被下沉为辅助证据面
- Clarification 保留原始问答面，但已不是默认问题推进面

## 存在问题

### 1. Clarification 仍然是“手动转入”
- 当前没有明确规则告诉用户“哪些 Clarification 应该转入 Issue Queue”
- 回答 Clarification 之后，如果没有手动转入，用户仍可能把它当成独立问题系统继续停留在原区块

### 2. Conflict projection 的关闭语义仍然偏隐式
- Issue Queue 中可以关闭 projection
- 但用户不一定知道：
  - 关闭 projection 其实是在更新原始 `RequirementConflict`
  - 处理完后是否还需要回到 Conflict Panel 看证据

### 3. Issue 关闭后的含义还不够可解释
- 当前 UI 有状态，但没有明确说明：
  - 关闭后意味着“问题已解决 / 当前不成立 / 已归档”
  - 哪些来源对象仍需要继续确认

### 4. 生命周期规则目前分散在多个地方
- Clarification 的来源逻辑在 `clarification.ts`
- Conflict 映射逻辑在 `issueUnit.ts` 与 `issue-queue.ts`
- UI 的说明散在 `IssueUnitsPanel`、`ConflictPanel`、`exploration-detail-client.tsx`

## 本轮范围

### 要做
1. 把 Clarification -> Issue 的最小规则写清楚并补到 UI / helper / 文案
2. 把 Conflict -> Issue projection 的状态关系与关闭含义写清楚
3. 在 Issue Queue 中强化生命周期说明：
  - 来源
  - 是否阻断
  - 关闭后意味着什么
  - 是否需要回到来源对象继续确认
4. 只做最小 helper / service / router 增量调整

### 建议实现位置
- helper：
  - `src/lib/issue-queue.ts`
- router：
  - `src/server/trpc/routers/clarification.ts`
  - `src/server/trpc/routers/issueUnit.ts`
- UI：
  - `src/app/(dashboard)/explorations/[id]/issue-units-panel.tsx`
  - `src/app/(dashboard)/explorations/[id]/conflict-panel.tsx`
  - `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`

## 本轮落地规则（已实现）

### Clarification -> Issue 的最小准入规则
- Clarification 继续作为原始问答面保留
- 只有以下情况默认允许转入 `Issue Queue`：
  - `category = RISK`
  - `status = ANSWERED`
  - `status = SKIPPED`
- `status = OPEN` 且非风险类问题，先留在 Clarification 中收敛，不直接转入 Issue Queue
- 转入后：
  - Clarification 不自动关闭
  - UI 会显示“已转入 Issue Queue，Clarification 保留为来源问答记录”
  - Clarification 列表会带上 `issueProjection` 状态，避免形成第二套主问题面

### Conflict -> Issue Projection 的最小规则
- Conflict 继续作为来源 / 证据面保留
- Issue Queue 继续作为默认处理状态的主入口
- 在 Issue Queue 中关闭 Conflict projection 时：
  - `RESOLVED -> RequirementConflict.RESOLVED`
  - `REJECTED / ARCHIVED -> RequirementConflict.DISMISSED`
  - 其他活跃状态继续映射为 `RequirementConflict.OPEN`
- Conflict Panel 按兼容入口保留，按钮文案明确为“同步”语义，不再强调其为主问题面

### Issue Queue 生命周期说明
- 每个问题项都补充四类说明：
  - 来源说明
  - 当前影响 / 是否阻断
  - 关闭含义
  - 是否需要回到来源对象继续确认
- Clarification 来源项在关闭后不会自动回写 Clarification 状态，系统会提示用户回到来源对象完成最终确认
- Conflict projection 会明确提示状态同步与证据查看位置

## 非目标
- 不做全自动 issue lifecycle engine
- 不删除 `ClarificationQuestion` / `RequirementConflict`
- 不把 Conflict 并表为 `IssueUnit`
- 不做完整 SLA、分配、提醒、批量操作系统

## 后续预留
- 回答 Clarification 后的自动转入建议或自动投影
- Clarification / Conflict / Issue 的更清晰来源回链
- Issue 生命周期与 Stability / Impact Summary 的更强联动

## 状态更新

### 已完成
- Clarification 准入规则已下到 helper / router / UI
- Clarification 列表已能显示 `issueProjection`
- Conflict projection 的状态同步与关闭语义已明确
- Issue Queue 已能解释来源、阻断、关闭含义和回源确认

### 当前残留
- Clarification 关闭后仍不自动回写来源状态
- Conflict 仍是 projection，而不是统一数据模型

### 下一轮可继续推进
- 回答 Clarification 后的自动转入建议
- 更明确的来源回链和关闭后自动确认策略

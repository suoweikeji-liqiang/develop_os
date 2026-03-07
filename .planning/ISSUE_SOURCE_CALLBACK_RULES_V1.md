# Issue Source Callback Rules V1

## 当前状态

### 当前来源对象与处理对象关系
- Clarification 来源对象：
  - router：`src/server/trpc/routers/clarification.ts`
  - UI：`src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
- Conflict 来源对象：
  - router：`src/server/trpc/routers/conflict.ts`
  - UI：`src/app/(dashboard)/explorations/[id]/conflict-panel.tsx`
- Issue Queue 处理对象：
  - router：`src/server/trpc/routers/issueUnit.ts`
  - UI：`src/app/(dashboard)/explorations/[id]/issue-units-panel.tsx`

### Clarification 当前状态
- `clarification.list` 已返回：
  - `queueEligible`
  - `queueEligibilityReason`
  - `issueProjection`
- `clarification.createIssue` 当前只允许以下 Clarification 默认进入 Issue Queue：
  - `category = RISK`
  - `status = ANSWERED`
  - `status = SKIPPED`
- 已转入后会生成 `IssueUnit`
  - `sourceType = clarification`
  - `sourceRef = questionId`
- 当前缺口：
  - Issue 关闭后，Clarification 侧还没有明确“是否需要人工确认已收敛”的回源提示

### Conflict 当前状态
- `issueUnit.listByRequirement` 会把 `RequirementConflict` 投影成 Issue Queue item
- Issue Queue 更新 projection 状态时，已会同步原 `RequirementConflict`
- 当前缺口：
  - 用户仍可能把 Conflict Panel 误解成主处理面
  - projection 关闭后，原 Conflict 当前状态意味着什么，说明还不够直接

## 本轮范围

### Clarification -> Issue Queue -> Clarification 的最小闭环规则
1. Clarification 继续是原始问答面
2. 默认问题推进在 Issue Queue，不在 Clarification 区块内长期停留
3. 允许进入 Issue Queue 的 Clarification 规则保持最小集：
   - 风险类问题
   - 已回答但未收敛的问题
   - 已跳过但仍需继续推进的问题
4. 已进入 Issue Queue 的 Clarification 必须明确显示：
   - 对应 issue 是否存在
   - issue 当前状态
   - Clarification 仍然是来源记录，不等于已完成闭环
5. 当对应 issue 已关闭时：
   - 不自动把 Clarification 改成 `RESOLVED`
   - 但必须给出“需要回源确认”的提示
   - 提示用户人工判断该澄清是否真正收敛

### Conflict -> Issue Queue -> Conflict 的最小闭环规则
1. Conflict 继续是扫描结果、证据和上下文来源面
2. 默认问题推进在 Issue Queue
3. projection 状态与原 Conflict 状态保持最小映射：
   - Issue `OPEN / TRIAGED / IN_PROGRESS / WAITING_CONFIRMATION` -> Conflict `OPEN`
   - Issue `RESOLVED` -> Conflict `RESOLVED`
   - Issue `REJECTED / ARCHIVED` -> Conflict `DISMISSED`
4. UI 中需要让用户看懂：
   - 当前 projection 来自哪个 Conflict
   - 当前原 Conflict 的状态是什么
   - projection 关闭或驳回后，原 Conflict 将被同步到什么状态
5. 如果需要重新查看证据或上下文，回到 Conflict Panel，而不是把 Conflict Panel 当成主处理面

### 什么叫“回源确认”
- 回源确认 = Issue Queue 中的问题虽然已经关闭，但来源对象未必自动闭环，系统需要提示用户回到来源对象做人为确认
- 当前只针对以下两类来源强调：
  - Clarification：确认原问答是否已真正收敛，可否标记为 `RESOLVED`
  - Conflict：确认扫描证据与处理备注是否足够，是否需要补充说明

### 哪些动作自动，哪些动作仍然人工确认

#### 自动
- Clarification 创建 issue 时自动建立 `issueProjection`
- Conflict projection 在 Issue Queue 中改状态时自动回写原 Conflict 状态
- Issue Queue 展示来源标签、来源状态、关闭含义、是否需要回源确认

#### 仍然人工确认
- Clarification 对应 issue 关闭后，是否把原 Clarification 视为已收敛
- Conflict 被处理或驳回后，是否还要补充扫描备注、证据判断或重新扫描
- 问题关闭是否真的足以支持进入更后阶段

## 非目标
- 不做 Clarification / Conflict / Issue 的统一状态机
- 不做全自动回源关闭
- 不删除 Clarification 或 Conflict 对象
- 不做批量同步、订阅、提醒或 SLA 系统

## 风险

### 风险 1
- 如果回源确认只写在单个页面文案里，后续很容易再次丢失

### 风险 2
- 如果 Clarification 被做成“自动关闭”，会错误制造伪闭环

### 风险 3
- 如果 Conflict 和 Issue Queue 的映射说明不够稳定，用户仍会在两个入口之间来回切换

## 后续预留
- Clarification 回源确认的轻量动作按钮或标记
- 更明确的来源回链
- Issue 关闭后的来源对象状态建议
- 与 impact summary / stability guidance 的进一步联动

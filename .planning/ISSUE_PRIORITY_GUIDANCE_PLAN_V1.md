# Issue Priority Guidance Plan V1

## 当前状态

### 当前 Issue Queue / Stability 已有联动能力
- `src/lib/issue-queue.ts`
  - 已有 issue 类型、来源、Clarification / Conflict 生命周期说明
  - 已有稳定度影响的基础 helper
- `src/server/requirements/worksurface.ts`
  - 已有 `issuePressure`
  - 已有 `Hot Issue Types`
  - 已有 `Hot Layers`
  - 已有 `nextQueueAction`
- Requirement 详情页 Stability Summary 已开始引用这些聚合结果，用户已经能看到“风险来自哪里”的初步解释

### 当前优先级判断仍然不够直白的点
- 用户目前能看见热点，但还不够容易立刻回答：
  - 如果现在只能先处理 1 到 3 个问题，最值得先处理哪几个
  - 哪些 issue 是当前 phase blocker
  - 哪些 issue 处理后会最直接改善稳定度
  - 哪些 issue 属于低成本但高收益的 fast win
- 当前更多是“有压力说明”，还不是足够锋利的“优先处理价值说明”

## 本轮范围

### 本轮如何回答“先处理哪类问题最值”
1. 为活跃 issue 增加轻量优先级信号
   - `phase_blocker`
   - `highest_leverage`
   - `fast_stabilization_win`
   - 无优先标签则保持普通项
2. 用当前已有数据做规则驱动排序，不引入复杂评分系统
   - 综合参考：
     - `blockDev`
     - `severity`
     - 是否压在高要求 layer（`permission` / `exception` / `constraint`）
     - 是否影响多个 Units 或至少一个主 Unit
     - issue type 是否处于当前热点
     - 是否直接阻塞当前阶段推进
3. 在 Stability Summary 中直接复用这些信号
   - 不只显示 hot issue / hot layer
   - 还要明确给出：
     - 当前最值的优先处理方向
     - 处理哪一类 issue 最可能改善阶段推进
     - 哪些属于可以快速换来稳定度改善的处理项

### 推荐标签 / 排序信号 / 解释维度建议
推荐标签：
- `Phase Blocker`
- `Highest Leverage`
- `Fast Stabilization Win`

排序信号建议顺序：
1. `blockDev`
2. 高 severity
3. 高要求 layer 压力
4. 影响 Unit 数 / 是否绑定主 Unit
5. 热点 issue type
6. 当前 stage advance hint 中是否被点名

解释维度建议：
- 当前主要压在哪个 Requirement Unit
- 当前主要压在哪个 layer
- 处理后更可能改善什么：
  - 阶段推进
  - layer 稳定度
  - 回源确认量
  - 未收敛问题密度

### 当前状态更新
- `ISSUE 3` 已为 Issue Queue 活跃问题补上统一优先级信号：
  - `Phase Blocker`
  - `Highest Leverage`
  - `Fast Stabilization Win`
- 当前排序开始综合参考：
  - `blockDev`
  - `severity`
  - 是否压在高要求 layer
  - 同类问题是否为热点
  - 同一 Unit 是否已有多条开放问题
- Stability Summary 已开始直接引用这些信号，不再只停留在 `Hot Issue Types / Hot Layers`
- `ISSUE 4` 已把这些信号继续投到推进结论面：
  - Impact Summary 会直接给出动作化的 `actionPlan`
  - 被点名的 Requirement Units 会显示为什么被关注、当前建议动作是什么
  - 用户看到优先级后，可以直接追到对应 Unit 或对应工作区继续推进

## 非目标
- 不做复杂优先级算法平台
- 不做强阻断器
- 不做全局配置中心
- 不做历史事件级优先级学习
- 不引入复杂策略后台

## 风险

### 风险 1
- 如果标签过多或规则过深，用户会重新掉进“算法不透明”的问题

### 风险 2
- 如果排序只看 severity，不结合 layer / blocker / current stage，就仍然回答不了“先处理哪个最值”

### 风险 3
- 如果 Stability Summary 与 Issue Queue 各说各话，会继续形成两个并行优先级系统

## 后续预留
- 后续可补更细的单位影响度，例如多 Unit 影响或阶段特定权重
- 后续可把优先级信号扩展到来源对象回链上
- 后续可引入更细的 current-stage-aware 排序，但仍保持规则驱动和可解释

## 已完成
- Issue Queue 已能用 `Phase Blocker / Highest Leverage / Fast Stabilization Win` 回答“先处理哪类问题最值”
- 排序与标签已联动到 Stability Summary
- Impact Summary 已开始把优先级信号转成面向推进动作的结论卡片

## 当前残留
- 当前优先级仍是规则驱动，没有显式 stage-specific 权重
- 多 Unit 影响仍主要通过热点和关联数近似表达，没有单独影响度模型
- 结论面虽然已动作化，但还没细到“处理这个 issue 预计改善多少稳定度”

## 下一轮建议
- 继续加强 stage-aware 优先级解释，但保持规则透明
- 让优先级信号更直接回链到来源对象和 Unit 内容落点
- 只在必要时再补更细的多 Unit 影响信号，避免把规则做成复杂评分系统

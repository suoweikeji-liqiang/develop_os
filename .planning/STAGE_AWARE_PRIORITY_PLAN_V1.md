# Stage Aware Priority Plan V1

## 当前状态

### 当前 Issue Queue 优先级排序依据
- helper 位于：`src/lib/issue-queue.ts`
- 当前已有信号：
  - `Phase Blocker`
  - `Highest Leverage`
  - `Fast Stabilization Win`
- 当前排序主要综合：
  - `blockDev`
  - `severity`
  - 是否压在高要求 layer
  - 热点 issue type
  - 同一 Unit 是否已有多条开放问题
  - 是否存在主 Requirement Unit
- 当前结果已经投影到：
  - Issue Queue 卡片
  - Stability Summary 的 `Issue Pressure`
  - Impact Summary 的 `actionPlan`

### 当前为什么还不够 stage-aware
- 现有排序更像通用优先级，而不是“当前 Requirement 阶段最值处理项”
- 现在还没有直接解释：
  - 当前更偏向先补澄清、还是先做收敛、还是先做开发前准备
  - 哪类 issue 在当前阶段最贵阻塞
  - 哪类 issue 在当前阶段属于最快能换来推进改善的处理项
- 结果是用户能看懂“问题很重要”，但还不够直接看懂“为什么在现在这个阶段最值先处理它”

## 本轮范围

### 本轮如何回答“当前阶段先处理哪个最值”
1. 基于现有 Requirement 状态 + Stability + Unit 分布，推一个轻量 stage context
   - 不做新状态机
   - 只做可解释的当前阶段语义
2. 让 Issue 优先级带上 stage-aware 信号
   - 当前阶段最值
   - 当前阶段最贵阻塞
   - 当前阶段快速稳定化收益
3. 让 Stability Summary 与 Impact Summary 直接复用这层信号
   - 不只是告诉用户“风险在哪”
   - 还要告诉用户“当前阶段先去哪里处理什么”

### 推荐标签 / 排序逻辑 / 解释维度建议
推荐标签：
- `Stage Priority`
- `Stage Blocker`
- `Stage Fast Win`

排序逻辑建议：
1. 先判断当前阶段上下文
2. 再按现有 blocker / severity / layer / hotspot / unit density 打分
3. 对符合当前阶段重点的 issue 追加阶段权重
4. 最终仍保持规则透明，不隐藏解释来源

解释维度建议：
- 当前 Requirement 更偏哪个推进阶段
- 该 issue 为什么在这个阶段最值
- 它更影响设计推进、开发准备还是边界收敛
- 处理后更可能改善哪一块：
  - Issue Queue 压力
  - Unit 稳定度
  - Clarification 回源量
  - 阶段切换前风险

## 非目标
- 不做复杂阶段引擎
- 不做强阻断
- 不做复杂评分平台
- 不做规则后台
- 不引入动态可配置策略系统

## 风险

### 风险 1
- 如果阶段语义命名太抽象，用户会看不懂它和当前页面状态的关系

### 风险 2
- 如果阶段权重压过现有 blocker / severity 信号，可能导致排序失真

### 风险 3
- 如果只在 Stability Summary 体现 stage-aware，不回投到 Issue Queue 和 Impact Summary，用户依旧需要跨面板脑补

## 后续预留
- 后续可继续细化不同 Requirement 状态下的 stage-aware bucket
- 后续可把阶段语义与 next stage guidance 做更自然的对齐
- 后续可评估是否让 Unit 层也带轻量 stage-aware 建议，但仍不引入复杂策略配置

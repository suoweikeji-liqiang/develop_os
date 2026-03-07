# Stability Guidance Rules V1

## 定位
本轮固定：

- `Stability = 推进成熟度判断器`

它的职责不是审批器，也不是强阻断 gate。

本轮只做：

- 推荐型提示
- 可解释提示
- 与 Requirement Unit / Issue Queue 的最小协同

## 判断原则

### 1. Stability 评估的是“成熟度”
它回答的问题是：

- 当前需求是否已经足够清楚，适合继续推进
- 哪些 Requirement Units 仍然不稳定
- 是否存在阻断问题会显著影响成熟度判断

### 2. Stability 不直接代替工作流状态
它不是：

- Requirement workflow 的替代品
- 审批流
- 强阻断器

### 3. Stability 必须可解释
所有提示都应让用户知道：

- 为什么会出现这个提示
- 下一步建议补什么

## Requirement 稳定度等级的提示策略

### S0_IDEA
建议提示：

- 当前仍处于想法或采样阶段，不建议进入开发
- 先收敛目标、边界、主流程

### S1_ROUGHLY_DEFINED
建议提示：

- 已有初步定义，但关键边界和异常路径仍不足
- 不建议直接进入开发，优先补齐 Requirement Units 和问题项

### S2_MAIN_FLOW_CLEAR
建议提示：

- 主流程已经明确，但关键约束、异常与权限边界仍需继续补齐
- 可继续进入设计收敛，不建议直接视为开发就绪

### S3_ALMOST_READY
建议提示：

- 已接近可开发状态
- 如果仍有 blocking issues 或关键单元未达标，建议先补齐

### S4_READY_FOR_DEVELOPMENT
建议提示：

- 已具备进入开发的基础
- 仍建议持续关注 open issues 与关键单元稳定度

### S5_VERIFIED_STABLE
建议提示：

- 需求已高度稳定
- 重点转向变更影响与回归控制

## Requirement Unit 稳定度目标

本轮建议目标线：

- 对“需要继续推进的 Requirement Unit”，目标稳定度至少达到 `S3_ALMOST_READY`

本轮不引入复杂分层目标矩阵。

采用最小规则：

- 非归档单元若低于 `S3_ALMOST_READY`，则视为“尚未达到推进目标稳定度”

## 推荐型提示规则

### 规则 1：总体稳定度偏低
触发条件：

- Requirement 稳定度为 `S0_IDEA` 或 `S1_ROUGHLY_DEFINED`

提示：

- `当前总体稳定度偏低，不建议进入开发，建议先收敛需求边界与主流程。`

### 规则 2：存在 blocking issues
触发条件：

- 存在 open blocking issues

提示：

- `当前存在阻断问题，建议先在 Issue Queue 处理后再继续推进。`

### 规则 3：关键 Requirement Units 未达到目标稳定度
触发条件：

- 非归档 Requirement Units 中，存在稳定度低于 `S3_ALMOST_READY` 的单元

提示：

- `存在尚未达到目标稳定度的 Requirement Units，建议优先补齐颗粒推进。`

### 规则 4：尚未建立 Requirement Units
触发条件：

- 当前 Requirement 尚无 Requirement Units

提示：

- `当前尚未拆出 Requirement Units，建议先完成颗粒化拆分，再判断是否适合继续推进。`

### 规则 5：总体稳定度较高但仍有开放问题
触发条件：

- Requirement 稳定度 >= `S3_ALMOST_READY`
- 仍存在 open issues

提示：

- `整体已接近可推进，但仍有待处理问题，建议先清理关键问题后进入开发。`

## blocking issue 与稳定度的关系

本轮判断：

- blocking issue 不直接改写 Stability 字段
- 但 blocking issue 会显著影响 Stability guidance

也就是说：

- Stability 是成熟度判断
- blocking issue 是成熟度判断的重要输入

这是“协同关系”，不是“字段覆盖关系”。

## 本轮为何不做强阻断

原因：

1. 当前系统已经有 workflow status、signoff、change 等机制
2. Stability 还处于第一轮落地后的收敛阶段
3. 如果现在就做强阻断，会让用户误以为系统已经具备完整门禁语义

因此本轮只做：

- 明确提示
- 可解释建议
- 轻量引导

不做：

- 禁用按钮
- 自动退回流程状态
- 强制用户先解决所有问题才能继续

## 本轮输出形态

推荐输出到 Requirement 详情页的 `Stability Summary` 区：

- Requirement 总体稳定度
- Requirement Unit 稳定度摘要
- 建议提示列表
- “本轮为软提示，不是强阻断”的说明

## 后续预留

下一轮可以继续演进：

- 不同 layer 的 Unit 采用不同目标稳定度
- Stability 与 signoff / status transition 的关系收紧
- 结合 Change / Impact summary 做更细的稳定度波动解释

# UI Entry Plan - Requirement Evolution V3

## 目标
在第二阶段已经接入 `Change Queue` 的基础上，为第三阶段补上“变更落地痕迹”和“轻门禁提示”的最小 UI 方案，让用户在现有需求详情页上能够同时看见：
- 哪些 Change 已真正落到版本或模型修订上
- 哪些风险信号会影响继续推进

本轮仍坚持：
- 不做大改版
- 不新增独立 Change 工作台
- 不新增复杂审批界面
- 不做图谱页

## 实施状态（2026-03-06 第三阶段最小实现）
- 已完成：Stability、Requirement Units、Issue Queue、Change Queue 已接入详情页
- 已完成：列表页与 Dashboard 已具备 change 摘要
- 已完成：Change Queue 的 `Applied Trace`
- 已完成：Version History 的来源 Change 标签
- 已完成：需求详情页的轻门禁提示区
- 已完成：详情页“当前变更上下文”选择器
- 本轮不实现：独立 Gate 页面
- 本轮不实现：Change 时间线页面
- 本轮不实现：强阻断式审批交互

## 当前 UI 判断
第二阶段解决的是“Change 对象能不能被创建和管理”。
第三阶段要解决的是“Change 是否真正落地，以及当前是否适合继续推进”。

因此 UI 不应再新增新页面，而应增强现有三个区域：
- `Workflow status`
- `Change Queue`
- `Version History`

## 一、Change Queue 如何增强

### 新增信息
每张 Change 卡片增加：
- linked version count
- linked model change log count
- latest applied trace

建议展示文案：
- `已关联版本 2`
- `已关联模型变更 3`
- `最近落地：v4 · 手动修正`

### Applied Trace 展示
在卡片底部增加轻量 trace 区：
- 最近一次关联版本号
- 最近一次关联日志来源
- 最近一次落地时间

如果还没有落地痕迹：
- 显示 `尚未发现关联的版本/模型变更`

### 为什么放在 Change Queue
因为用户对 Change 的主要疑问之一就是：
- 批准了没有
- 落地了没有

这类信息应该在 Change 自身卡片里可见，而不是藏到别处。

## 二、Version History 如何增强

### 最小增强方案
在现有 `Version History` 条目中增加来源 Change 标签。

展示建议：
- `v4`
- `来源 Change: CHG-02`

如果没有关联：
- 不展示来源标签

### 交互建议
- 先只做只读标签
- 点击可跳转或滚动定位到对应 Change 卡片，作为后续增强
- 本轮不做复杂联动动画

## 三、Workflow Status 如何增加轻门禁提示

### 提示场景
在现有 `Workflow status` 区块增加一组 Gate Hints。

建议覆盖三类风险：
- blocking issue 未清零
- high-risk open change 仍存在
- requiresResignoff 的 change 未处理

### 展示形态
使用卡片上方或状态控件下方的提示条：
- 黄色：建议谨慎推进
- 红色：存在明确高风险信号

示例文案：
- `存在 2 个阻断问题，建议先处理再推进`
- `存在 1 个高风险变更仍未关闭`
- `存在需要重新 signoff 的变更，请先确认评审范围`

### 边界
- 本轮只提示
- 不直接禁用按钮
- 不改变现有状态机

## 四、Consensus / Signoff 区域如何增强

### 最小增强方案
在 `ConsensusStatus` 或 `SignoffPanel` 上方增加一行说明：
- 如果存在 `requiresResignoff=true` 且仍 open 的 Change，则提示：
  - `当前存在需要重新 signoff 的变更，建议重新确认相关角色意见`

### 不建议做
- 自动清空 signoff
- 自动把 signoff 状态标红并阻断提交

这些属于后续约束执行层。

## 五、详情页信息结构建议

### 建议顺序
1. Requirement 头部
2. Workflow status + Gate Hints
3. Requirement Evolution 概览
4. Requirement Units
5. Issue Queue
6. Change Queue（增强 Applied Trace）
7. Version History（增强来源 Change）

### 原因
- Gate Hints 是推进决策信息，应尽量靠前
- Change Queue 与 Version History 的增强应形成前后呼应

## 六、列表页与 Dashboard 的最小增强建议

### 列表页
可选增加：
- `requiresResignoff change` 数量提示

但不建议一次塞太多标签。

建议优先保持当前：
- open change
- high risk change

### Dashboard
可选新增：
- 需要重新 signoff 的未完成 change 数

本轮不是强制项。

## 七、本轮不做的大 UI
- Gate 中心页
- Change 时间线页
- Version / Change 双栏对照页
- 自动跳转的审批向导
- 全局风控看板

## 八、实现风险提示

### 风险 1
如果在 UI 上把 Gate Hints 做成“像报错一样的强拦截”，用户会误以为系统已经具备完整门禁能力。

建议：
- 明确使用提示文案：
  - `建议`
  - `提醒`
  - `请确认`

### 风险 2
如果 Change Trace 信息过多，会把 Change Queue 变成日志页。

建议：
- 只显示摘要
- 详细 trace 留给 hover 或后续展开

### 风险 3
如果 Version History 和 Change Queue 之间联动过重，会增加详情页复杂度。

建议：
- 第一版只做标签与摘要

## 九、建议的第三阶段用户路径

1. 用户在 `Issue Queue` 发现需要正式推进的问题
2. 用户在 `Change Queue` 创建并推进 Change
3. 用户修改模型时把本次操作绑定到对应 Change
4. 用户在 Change 卡片中看到已关联的版本与模型变更痕迹
5. 用户在 `Workflow status` 中看到是否仍存在阻断问题、高风险变更、重签字提醒
6. 用户在确认风险后继续走现有评审、签字、测试资产流程

这条路径让系统从“能创建变更”进一步升级为“能解释变更是否真正落地，以及当前是否适合继续推进”。

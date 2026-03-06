# UI Entry Plan - Requirement Evolution V2

## 目标
在不大改现有信息架构、不打断第一阶段已落地 `Requirement Unit / Issue Unit / Stability` 工作流的前提下，把 `Change Unit` 接入当前工作台，使用户能够在现有需求详情页中完成“问题进入正式变更、变更进入评审、变更进入应用”的最小闭环。

## 实施状态（2026-03-06 第二阶段最小实现）
- 已完成：第一阶段 Stability、Requirement Units、Issue Queue 已接入详情页
- 已完成：列表页与 Dashboard 已具备稳定度、unit 数、issue 数的基础可见性
- 已完成：详情页 `Change Queue` panel
- 已完成：Change Unit 的最小创建、编辑、状态流转入口
- 已完成：列表页 change 相关摘要字段
- 已完成：Dashboard change 指标
- 已完成：详情页沿用现有工作台布局，无新增独立主页面
- 本轮不实现：独立 Change 页面
- 本轮不实现：Impact Graph 图谱页
- 本轮不实现：Prototype Mapping 页面

## 当前 UI 现状
- `/explorations/[id]` 已经是需求详情工作台
- 详情页已有：
  - Requirement 头部信息
  - Stability
  - Requirement Units
  - Issue Queue
  - Conflict / Clarification / Signoff / Version / Spec / Test 等现有能力
- 列表页和 Dashboard 已具备基础运营可见性

这意味着第二阶段最优策略仍然不是新增独立大页面，而是在现有详情页上增加一个新的“正式变更层”。

## 一、需求详情页如何展示 Change Units

### 接入位置建议
在现有 `/explorations/[id]` 详情页左侧工作区新增 `Change Queue` section。

建议位置：
- 放在 `Issue Queue` 之后
- 放在 `Version History` 或相关历史信息之前

原因：
- 阅读顺序更自然：
  - Requirement 本体
  - Requirement Units
  - Issues
  - Changes
  - Versions / Signoff / Assets
- `Issue` 是问题层
- `Change` 是应对问题的正式变更层
- `Version` 是变更落地后的记录层

### 展示形态
- 初版采用卡片列表
- 不做独立二级路由
- 不做表格工作台
- 不做复杂时间线

每张 Change 卡片建议展示：
- 标题
- `changeKey`
- 状态
- 风险等级
- 变更原因摘要
- 影响摘要
- 关联 Requirement Unit 数
- 关联 Issue Unit 数
- 是否需要重新 signoff
- 是否影响测试 / 原型 / 代码
- 创建时间 / 最近更新时间

### 分组建议
初版按状态分段展示：
- `Proposed`
- `Under Review`
- `Approved`
- `Applied`

可选补充：
- `Rejected / Archived` 默认折叠

## 二、最小交互设计

### 1. 创建入口
在 `Change Queue` 顶部放置 `新增 Change` 按钮。

创建表单最小字段：
- 标题
- 原因
- 变更范围
- 风险等级
- 是否要求重新 signoff
- 是否影响测试
- 是否影响原型
- 是否影响代码
- 关联 Requirement Unit
- 关联 Issue Unit

### 2. 编辑入口
每张卡片提供轻量 `编辑` 操作。

初版可编辑字段：
- 标题
- 原因
- 变更范围
- 影响摘要
- 风险等级
- 重新 signoff 标记
- 影响测试 / 原型 / 代码
- 关联 Requirement Unit / Issue Unit

### 3. 状态流转入口
每张卡片支持最小状态更新：
- `PROPOSED -> UNDER_REVIEW`
- `UNDER_REVIEW -> APPROVED`
- `APPROVED -> APPLIED`

次要状态：
- `REJECTED`
- `ARCHIVED`

建议交互：
- 使用和第一阶段相同的内联 select + 保存按钮模式
- 避免引入新的复杂审批组件

### 4. 标记 Applied
在 `APPROVED` 状态卡片上提供 `标记为 Applied` 按钮。

说明文案建议：
- `表示该变更已被正式采纳并进入实施/落地，不等同于代码已发布。`

## 三、与 Requirement Unit / Issue Unit 的关系展示

### Change -> Requirement Unit
在 Change 卡片中展示：
- 关联单元标签列表
- 如数量较多，只显示前 3 个并附 `+N`

建议文案：
- `影响对象`

### Change -> Issue Unit
在 Change 卡片中展示：
- 来源 issue 标签列表
- 显示 blocking issue 时可强调

建议文案：
- `来源问题`

### 详情页上的整体语义
- `Issue Queue` 告诉用户“现在有哪些问题”
- `Change Queue` 告诉用户“这些问题准备如何正式改变系统”

这个区分必须清晰，否则用户会继续把 change 当 issue 记。

## 四、稳定度与变更的联动显示

### 需求头部提示
当存在以下情况时，在详情页头部稳定度区域附近给出提醒：
- 存在 `HIGH / CRITICAL` 且未完成的 Change
- 存在 `requiresResignoff=true` 且未完成的 Change
- 存在 `affectsPrototype=true` 的高风险 Change

展示建议：
- 一行摘要提示
- 不改变现有 Stability badge 的基础展示

### Change Queue 顶部摘要
建议增加轻量统计行：
- open changes
- high risk changes
- resignoff-needed changes

### 不建议做
- 自动根据 Change 直接重算 Stability 分数
- 自动把 Requirement 状态回退

第一版只做提示，不做自动驱动。

## 五、哪些页面需要新增 tab / panel / section

### 1. `/explorations/[id]`
新增：
- `Change Queue` section

可选增强：
- 在现有概览区加一行 Change summary

不建议：
- 新增独立 tab 体系
- 重排整个详情页 IA

### 2. `/explorations`、`/models`、`/evolution`
列表项新增轻量字段：
- open change count
- high risk change count

筛选可预留但不必首轮实现：
- `hasOpenChanges`
- `hasHighRiskChanges`

### 3. Dashboard
新增最小指标：
- pending review change 数
- high risk unresolved change 数

### 4. `requirements/[id]`
- 无需单独改，继续复用当前 redirect 到 `explorations/[id]`

## 六、不做大改版前提下的最小 UI 接入方案

### 方案核心
继续复用现有详情页工作台布局，把 `Change Queue` 作为第一阶段对象层之后的新增 section。

建议接入顺序：
1. 详情页 `Change Queue`
2. 列表页 change 数量摘要
3. Dashboard change 指标

### 为什么这是最小方案
- 不需要新增主导航
- 不需要新增独立 Change 工作台
- 不需要改写现有 Requirement / Issue 的操作路径
- 用户仍在熟悉的页面里完成新增动作

## 七、页面内容建议

### Change Queue section 文案建议
- 标题：`Change Queue`
- 说明：`把问题收敛成正式变更对象，明确原因、影响和是否需要重评审。`

### Change 风险标签建议
- `Low Risk`
- `Medium Risk`
- `High Risk`
- `Critical Risk`

### Change 状态说明建议
- `Proposed`：已提出，但尚未进入正式评审
- `Under Review`：已进入评审讨论
- `Approved`：已批准，可进入落地
- `Applied`：语义上已采纳并进入实施

### 头部提醒文案建议
- `存在 2 个高风险变更待处理`
- `存在需要重新 signoff 的变更`
- `存在影响原型的未完成变更`

## 八、Impact Graph 与 Prototype Mapping 的 UI 预埋

### Impact Graph
本轮只在 Change 卡片中显示：
- 影响测试
- 影响原型
- 影响代码
- 影响摘要

不做：
- 图谱视图
- 节点跳转图
- 跨对象路径追踪

### Prototype Mapping
本轮只通过 `影响原型` 标签表达。

不做：
- 原型页面列表
- HTML 解析入口
- 原型差异对比页

## 九、本轮只定义、不实现的 UI 内容
- 独立 `Change Unit` 页面
- `Issue -> Change` 拖拽式转化操作
- `Change -> Version` 自动对照视图
- 图谱可视化
- 原型映射页
- 自动重签字引导流程
- 审批人专属工作台

## 十、实现风险提示

### 风险 1
如果把 `Change Queue` 和 `Issue Queue` 合并成一个面板，用户会继续混淆“问题”和“正式变更”。

建议：
- 两个 section 保持并列但分层

### 风险 2
如果一开始就上复杂审批交互，会把第二阶段拖成流程系统重构。

建议：
- 继续沿用第一阶段的内联编辑模式

### 风险 3
如果在 UI 上暗示 Change 会自动影响稳定度和主状态，用户会产生错误预期。

建议：
- 文案明确：
  - Change = 正式变更对象
  - Stability = 成熟度判断
  - Status = 主流程位置

### 风险 4
如果过早展示图谱和原型入口，但没有真实对象，会形成空壳交互。

建议：
- 只显示影响标签，不做虚假的图谱页

## 十一、建议的第二阶段用户路径

1. 用户进入现有需求详情页
2. 在 `Issue Queue` 中识别需要正式处理的问题
3. 在 `Change Queue` 中创建对应 Change
4. 关联受影响的 Requirement Unit 和来源 Issue Unit
5. 评估风险、signoff 需求、测试/原型/代码影响
6. 将 Change 推进到 `Approved`
7. 在实际模型或实现调整后，标记为 `Applied`
8. 继续沿现有 Version / Signoff / Test 主链推进

这条路径可以在不大改 UI 的前提下，把系统从“发现问题”进一步推进到“管理正式变更”。

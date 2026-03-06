# UI Entry Plan - Requirement Evolution V1

## 目标
在不大改现有信息架构和视觉结构的前提下，把 Requirement Unit、Issue Unit、Stability Model 接入当前工作台，使用户可以在现有 `/explorations/[id]` 详情页上完成第一阶段“需求演化管理”闭环。

## 实施状态（2026-03-06 第二阶段）
- 已完成：详情页头部接入 Stability badge
- 已完成：详情页新增 Requirement Evolution 概览区块
- 已完成：详情页左侧新增 `Requirement Units` 只读 panel
- 已完成：详情页左侧新增 `Issue Queue` 只读 panel
- 未完成：Requirement Unit / Issue Unit 的创建和编辑入口
- 未完成：列表页稳定度筛选、阻断问题筛选与数量摘要
- 未完成：Dashboard 扩展指标

## 当前 UI 现状
- 详情页已经是工作台形态，包含状态推进、版本历史、对话、冲突检测、结构化、澄清、Spec、测试资产、签字、ModelCard
- `requirements/[id]` 已重定向到 `explorations/[id]`
- `requirements` / `models` / `evolution` 都围绕同一批 Requirement 列表展开

这意味着本轮最优策略不是新增独立大页面，而是在现有详情页和列表页增加最小入口。

## 一、需求详情页如何展示 Requirement Units

### 接入位置建议
在现有详情页左侧工作区中，插入一个新的 `Requirement Units` section。

建议位置：
- 放在 `ConflictPanel` 之后、`结构化区块` 之前
- 原因：它属于“对象层”，比澄清、Spec、测试更靠近需求本体

### 展示形态
- 默认使用卡片列表，不做树形大组件
- 支持按 `layer` 分组
- 每张卡片展示：
  - 标题
  - 摘要
  - layer 标签
  - unit 状态
  - 稳定度 badge
  - 关联 issue 数
  - 负责人

### 最小交互
- `新增 Unit`
- `编辑标题/摘要/layer`
- `更新状态`
- `更新稳定度`
- `查看关联 Issue`

### 暂不做
- 复杂树形拖拽
- 多列视图
- 单独详情页
- 从原型页面直接跳转到 unit

## 二、问题清单如何展示 Issue Units

### 接入位置建议
新增 `Issue Queue` panel，保留现有 `ConflictPanel`，但放在同一语义区域。

建议方式：
- `Issue Queue` 作为主 panel
- `Conflict Scan` 作为其下一个子区块，或并列 secondary panel

### 展示形态
- 按状态分段：
  - Open
  - Waiting Confirmation
  - Resolved
- Issue 卡片展示：
  - 类型
  - 严重度
  - 是否阻断开发
  - 标题
  - 描述
  - 关联 Requirement Unit
  - 负责人
  - 建议处理动作

### 最小交互
- `新增 Issue`
- `变更状态`
- `标记阻断/取消阻断`
- `关联/取消关联 Requirement Unit`
- `填写处理说明`

### 与现有冲突面板的关系
- 第一阶段不删除 `ConflictPanel`
- 用户看到的心智应是：
  - `ConflictPanel` = AI 自动发现的一类问题
  - `Issue Queue` = 全量问题对象池

## 三、稳定度如何显示

### Requirement 总体稳定度
建议在详情页头部现有状态胶囊旁增加稳定度 badge。

展示建议：
- `Stability S2`
- hover 或旁侧文案显示简述，如“主流程明确，异常/权限待补齐”

### Requirement Unit 稳定度
- 在每张 unit 卡片上显示
- 使用统一色阶：
  - `S0-S1` 红/橙
  - `S2-S3` 黄/蓝
  - `S4-S5` 绿

### 稳定度摘要
在 `Issue Queue` 或 `Requirement Units` 顶部增加一行汇总：
- 总体稳定度
- 阻断 issue 数
- 未达开发基线的关键 unit 数

### 暂不做
- 稳定度趋势图
- 自动评分轨迹
- 全局大盘复杂分析

## 四、哪些页面需要新增 tab / panel / section

### 1. `/explorations/[id]`
新增：
- `Requirement Units` section
- `Issue Queue` section
- `Stability` badge + summary
状态：已完成最小只读版本。

可选小改：
- 在现有 `ModelCard` 区域加一个轻量 toggle：
  - `Model View`
  - `Unit View`

但第一阶段更稳妥的方案是先不加 toggle，只在左侧工作区新增 section。

### 2. `/explorations`、`/models`、`/evolution`
列表项增加轻量字段：
- Stability badge
- Open issue count
- Requirement unit count

筛选可最小新增：
- `stability`
- `hasBlockingIssues`
状态：本轮未实现。

### 3. Dashboard
本轮不是必须项，但可预留统计位：
- 低稳定度 Requirement 数
- 阻断 issue 总数
状态：本轮未实现。

### 4. `requirements/[id]`
- 无需单独改，当前已 redirect 到 `explorations/[id]`

## 五、不做大改版前提下的最小 UI 接入方案

### 方案核心
完全复用当前详情页工作台布局：
- 左侧继续承载“推进动作”和“对象清单”
- 右侧继续承载 `ModelCard`

### 推荐接入顺序
1. 头部增加 Stability badge
2. 左侧增加 `Requirement Units` section
3. 左侧增加 `Issue Queue` section
4. 列表页增加稳定度和问题汇总字段

### 为什么这是最小方案
- 不需要新增新的主导航
- 不需要重写详情页布局
- 不需要把现有 `ModelCard` 区重构成全新对象工作台
- 用户仍能沿既有路径工作，只是看到更多“对象化”的入口

## 六、页面内容建议

### Requirement Units section 文案建议
- 标题：`Requirement Units`
- 说明：`把整份需求拆成可追踪的对象单元，逐步收敛状态与稳定度。`

### Issue Queue section 文案建议
- 标题：`Issue Queue`
- 说明：`把模糊项、缺失项、风险项与待确认项对象化，避免问题只停留在讨论里。`

### Stability 文案建议
- 标题：`Stability`
- 说明：`状态表示流程位置，稳定度表示成熟程度。二者并行判断。`

## 七、本轮只定义、不实现的 UI 内容
- Change Unit 独立页面
- Impact Graph 可视化图谱页
- Prototype Mapping 页面与原型对照视图
- 多维大屏 / 管理驾驶舱
- 基于 graph 的跳转导航
- Requirement Unit 独立详情页

## 八、实现风险提示

### 风险 1
如果把 Requirement Unit 强塞进右侧 `ModelCard` 内部，会和现有五层模型编辑逻辑耦合过深。

建议：
- Requirement Unit 先作为左侧独立 section

### 风险 2
如果一开始就把 `Issue Queue` 和 `ConflictPanel` 合并成一个组件，容易影响现有冲突扫描已验证的交互。

建议：
- 先并列展示，再逐步收敛

### 风险 3
如果稳定度被用户理解成新的流程状态，会造成推进逻辑混乱。

建议：
- 页面文案始终明确：
  - `Status = 流程位置`
  - `Stability = 成熟度`

## 九、建议的第一版用户路径

1. 用户进入现有需求详情页
2. 查看 Requirement 总体稳定度
3. 在 `Requirement Units` 中拆分和维护关键单元
4. 在 `Issue Queue` 中记录并关闭关键问题
5. 当关键 unit 稳定度达到基线、阻断问题清零后，再继续走现有评审/签字/测试资产流程

这条路径能够在不打断当前工作流的前提下，把系统从“澄清需求”推进到“管理需求演化”。

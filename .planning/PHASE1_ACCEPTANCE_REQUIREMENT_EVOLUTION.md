# Phase 1 Acceptance - Requirement Evolution

## 目标
确认 develop_os 已从“需求澄清平台”进入“需求演化管理系统”第一阶段，并具备最小可运营闭环。

## 验收结论
当前结论：第一阶段闭环已完成，可进入阶段一收尾或阶段二规划。

## 验证状态
- 已通过：`npm run lint`
- 已通过：`npm run build`
- 已通过：`npm run test:api:db`
- 已覆盖：阶段一数据库级业务流测试，包含 stability、Requirement Unit、Issue Unit、Clarification -> Issue、列表筛选统计

## 验收范围
- Requirement Stability
- Requirement Unit
- Issue Unit
- Clarification -> Issue
- Issue Queue 统一问题视图
- 列表页与 Dashboard 可见性

## 验收清单

### 1. Requirement Stability
- [x] Requirement 持久化稳定度字段
- [x] 需求详情页可查看稳定度
- [x] 需求详情页可手动更新稳定度等级、分数和说明
- [x] 列表页可查看稳定度
- [x] 列表页支持按稳定度筛选

### 2. Requirement Unit
- [x] Requirement 下存在独立 Requirement Unit 对象
- [x] Requirement Unit 可列表查询
- [x] Requirement Unit 可手动创建
- [x] Requirement Unit 可从当前五层模型初始化草稿
- [x] Requirement Unit 可编辑标题、摘要、layer
- [x] Requirement Unit 可更新状态
- [x] Requirement Unit 可更新稳定度
- [x] 列表页可汇总 Requirement Unit 数量

### 3. Issue Unit
- [x] Requirement 下存在独立 Issue Unit 对象
- [x] Issue Unit 可列表查询
- [x] Issue Unit 可手动创建
- [x] Issue Unit 可编辑标题、描述、类型、严重度、阻断标记、建议处理
- [x] Issue Unit 可更新状态
- [x] Issue Unit 可关联 Requirement Unit
- [x] 列表页可汇总 Open / Blocking Issue 数量

### 4. Clarification -> Issue
- [x] 澄清问题可显式转为 Issue Unit
- [x] 转换后可在 Issue Queue 中看到结果
- [x] 使用 `sourceType/sourceRef` 保留来源追踪
- [ ] 自动将所有待确认澄清问题转换为 Issue
- [ ] Issue 关闭结果自动回流澄清状态

### 5. Issue Queue 统一视图
- [x] Issue Queue 统一展示手工 Issue 与 Clarification 生成 Issue
- [x] Issue Queue 可展示 Conflict Scan 投影
- [x] Conflict 投影保留只读边界，不破坏现有冲突处理链
- [ ] Issue 与 Conflict 底层对象统一

### 6. 全局可见性
- [x] `explorations / models / evolution` 列表展示稳定度
- [x] 列表展示 Requirement Unit 数
- [x] 列表展示 Open / Blocking Issue 数
- [x] 列表支持 `hasBlockingIssues` 筛选
- [x] Dashboard 展示低稳定度需求数
- [x] Dashboard 展示阻断问题总数
- [x] Dashboard 展示已对象化需求数

## 未纳入第一阶段验收
- Change Unit
- Impact Graph
- Prototype Mapping
- Issue / Conflict 自动统一
- Clarification / Issue 自动回流
- 强门禁策略

## 风险说明
- Requirement Unit 与 `Requirement.model` 仍存在双层表达，需要靠规则和使用约束维持一致性
- Conflict 目前只是投影进入 Issue Queue，尚未形成统一问题状态机
- 列表页有了可见性，但跨对象影响分析仍未建立

## 建议
第一阶段可视为完成。下一步建议优先做：

1. 阶段一收尾测试与小修
2. 进入第二阶段的 `Change Unit`

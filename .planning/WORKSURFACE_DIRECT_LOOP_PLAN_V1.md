# Worksurface Direct Loop Plan V1

## 当前状态

### 当前闭环已经做到哪里
- `/requirements` 已是主入口
- `/requirements/[id]` 已拥有详情页主实现：
  - `src/app/(dashboard)/requirements/[id]/page.tsx`
  - `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx`
- Requirement 详情页已经形成四个主区：
  - Overview
  - Requirement Units
  - Issue Queue
  - Stability Summary
- Clarification 已具备最小闭环：
  - `queueEligible`
  - `queueEligibilityReason`
  - `issueProjection`
  - `queueStatus`
  - “待回源确认”
- Conflict 已收紧为来源 / 证据面：
  - 处理默认在 Issue Queue
  - projection 与原 Conflict 状态关系可见
- Stability 已具备：
  - layer-aware target
  - 推荐型治理提示
  - 阶段切换前软提示
- Impact Summary 已具备：
  - `headline`
  - `signals`
  - `nextStep`
  - `nextActions`
  - `affectedRequirementUnits`

### 当前闭环仍然不够直接的点
- Clarification 已能进入 Issue Queue，但用户还不够容易直接看出：
  - 这个来源问题最终影响哪个 Requirement Unit
  - issue 关闭后是否改善了某个 Unit 的推进条件
- Requirement Unit 已能显示自身状态和稳定度建议，但用户还不够容易直接看出：
  - 这个 Unit 为什么会被列入 Impact Summary
  - 当前该 Unit 与哪些来源问题直接相关
- Issue Queue 与 Stability 已经有弱联动，但还不够直接：
  - 哪些 issue 最影响当前阶段推进
  - 哪些 issue 处理后最可能改善 layer / stability 判断
- Requirement 主路径虽然已收回详情页，但列表页、新建页、详情子组件仍残留较多 `explorations/*` 依附

## 本轮范围

### 本轮要缩短的链路
1. Clarification -> Issue Queue -> Requirement Unit
   - 让来源问题与颗粒推进单元的关系更直观
2. Requirement Unit -> Impact Summary
   - 让 Unit 不只是被 summary 统计，而是能直接解释为什么影响总体推进
3. Issue Queue -> Stability
   - 让问题面更明确表达“哪些问题最影响当前阶段推进”
4. Requirement 主路径 -> 历史 exploration 实现
   - 继续减少 `/requirements` 对 `explorations/*` 的实现依赖

### 当前状态更新
- `ISSUE 1` 已先把第一段链路缩短：
  - Clarification 转入 Issue Queue 时可以直接绑定主要受影响的 Requirement Unit
  - Clarification、Issue Queue、Requirement Unit 三处都能看到这条回链
  - issue 关闭后是否还要回源确认，也开始能结合具体 Unit 解释
- `ISSUE 2` 已开始把第二段链路收紧：
  - Impact Summary 会直接列出优先推进 / 优先补齐的 Requirement Units
  - Requirement Unit 卡片会反向显示自己为什么进入总体 summary
  - `nextStep / nextActions` 会优先落到具体 Unit，而不只停留在抽象状态摘要
- `ISSUE 3` 已开始把 Issue Queue -> Stability 收紧：
  - Issue Queue 单项会直接解释自己怎样影响当前稳定度和阶段推进
  - Stability Summary 会点名当前压力最大的 issue 类型与 layer
  - 当前应先回到 Issue Queue 处理什么，已开始变成明确建议而不是泛泛提醒
- `ISSUE 4` 已开始把 Requirement 主路径实现迁回：
  - `/requirements`、`/requirements/new` 以及 3 个核心详情子组件已迁到 `requirements/*`
  - `explorations/*` 对应位置已退为 wrapper / alias

### 预期落点
- Clarification 区、Issue Queue、Requirement Units 区、Impact Summary 区之间的回链更短
- 用户在同一页内更容易顺着以下链路理解：
  - 来源问题
  - 默认处理面
  - 影响的 Unit
  - 对 Stability / 推进判断的影响
  - 是否需要回源确认

## 非目标
- 不修改数据库 schema
- 不引入正式 Change Unit
- 不做完整 Impact Graph
- 不做 Prototype Mapping 大接入
- 不做强阻断门禁
- 不做复杂自动匹配引擎
- 不做大规模目录重构

## 风险

### 风险 1
- 如果只在页面文案里加提示，不把最小回链规则沉到 helper / router，后续很容易再次散掉

### 风险 2
- 如果试图一次性把 Clarification、Issue、Unit 做成强绑定，会把本轮带偏成重型关系建模

### 风险 3
- 如果主语迁移扩到全仓库 rename，会把“闭环缩短”变成“目录整理”

## 后续预留
- 更明确的 Clarification -> Unit 推荐绑定动作
- 更细的 issue 对 layer / unit / stage 的影响映射
- Requirement 列表页、新建页和详情子组件的进一步迁移

## 已完成
- Clarification -> Issue Queue -> Requirement Unit 已形成最小直接回链
- Requirement Unit -> Impact Summary 已形成可见的双向解释
- Issue Queue -> Stability 已形成轻量 pressure / guidance 联动
- Requirement 主入口的列表页、新建页与 3 个核心详情子组件已迁回 `requirements/*`

## 当前残留
- Clarification 关闭后对 Unit 的改善仍主要依赖人工确认，不会自动提升状态或稳定度
- Issue pressure 仍是 current-state 规则聚合，不是事件级变化分析
- Requirement 详情页仍有一批非核心子组件留在 `explorations/[id]/*`

## 下一轮建议
1. 继续迁移 `status-control`、`version-history`、`change-units-panel`、`comments-panel`
2. 把 Clarification / Unit / Impact Summary 的回链继续补成“结论沉淀”视角
3. 细化 issue 对 layer / stage 的影响排序，但仍保持轻量规则实现

## 实现顺序建议
1. 先补 Clarification -> Requirement Unit 的直接回链
2. 再补 Requirement Unit -> Impact Summary 的直接回链
3. 再强化 Issue Queue 与 Stability 的联动
4. 再继续推进 Requirement 主语迁移
5. 最后做一轮命名、注释、planning 状态收口

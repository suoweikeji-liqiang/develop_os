# Requirement Surface Purity Plan V1

## 当前状态

### 当前 Requirement 主路径还残留哪些 exploration 依附
- `src/app/(dashboard)/requirements/[id]/page.tsx`
  - 仍直接从 `../../explorations/[id]/comments-panel` 引入 `CommentsPanel`
- `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx`
  - 仍直接从 `../../explorations/[id]/*` 引入以下子组件：
    - `status-control.tsx`
    - `version-history.tsx`
    - `change-units-panel.tsx`
    - `model-tabs.tsx`
    - `role-view-tabs.tsx`
    - `signoff-panel.tsx`
    - `consensus-status.tsx`
    - `chat-panel.tsx`
    - `test-case-panel.tsx`
  - 同时仍从 `../../explorations/[id]/assumption-card` 引入 `PendingAssumption` 类型
- 当前 `/requirements`、`/requirements/new`、`/requirements/[id]` 的 page 级主实现已经迁回 `requirements/*`，但详情页中推进/演化相关的几个高频子组件仍挂在 `explorations/[id]/*`

### 哪些组件最该优先迁移
本轮只优先处理与 Requirement 主路径纯度直接相关、且已经被用户点名的 4 个组件：
1. `status-control.tsx`
2. `version-history.tsx`
3. `change-units-panel.tsx`
4. `comments-panel.tsx`

这些组件都直接服务 Requirement 的顶层状态、版本链、变更演化和讨论沉淀，继续留在 `explorations/*` 下会持续制造主语混乱。

### 哪些组件可以继续保留兼容层
以下组件本轮先不迁，只保留现状或 wrapper：
- `model-tabs.tsx`
- `role-view-tabs.tsx`
- `signoff-panel.tsx`
- `consensus-status.tsx`
- `chat-panel.tsx`
- `test-case-panel.tsx`
- `/explorations`
- `/explorations/new`
- `/explorations/[id]`

这些对象要么是辅助视图，要么与后续更大范围的 UI 抽取有关。本轮不为了目录纯度扩大迁移面。

## 本轮范围

### 本轮最小迁移顺序
1. 先迁 `comments-panel.tsx`
   - 直接从 Requirement server page 依赖点切断 `requirements/[id]/page.tsx -> explorations/[id]` 的引用
2. 再迁 `status-control.tsx`
   - 这是 Requirement 顶层状态控制面，应该尽快回到 Requirement 主语下
3. 再迁 `version-history.tsx`
   - 这是 Requirement 版本链展示面，属于顶层边界对象职责
4. 最后迁 `change-units-panel.tsx`
   - 这是 Requirement 演化面的一部分，但仍需保持轻量，不在本轮扩展 Change Unit 主题
5. 原 `explorations/[id]/*` 对应文件退为 wrapper / re-export，并补兼容说明注释

### 本轮只做什么
- 把上述 4 个组件的 Requirement 主路径实现迁回 `requirements/[id]/*` 或抽到更中性的共享位置
- 保持用户可见文案继续以 Requirement 为主语
- 在旧 `explorations/[id]/*` 位置保留最薄兼容层，避免路由和引用瞬时断裂

### 当前状态更新
- `ISSUE 1` 已把以下组件迁回 `src/app/(dashboard)/requirements/[id]/*`：
  - `comments-panel.tsx`
  - `status-control.tsx`
  - `version-history.tsx`
  - `change-units-panel.tsx`
- `comment-input.tsx` 与 `version-diff-view.tsx` 已作为配套依赖迁回 `requirements/[id]/*`
- 原 `src/app/(dashboard)/explorations/[id]/*` 对应文件已退为兼容 wrapper

## 非目标
- 不做全仓库 rename
- 不做大规模目录重构
- 不迁本轮未点名的辅助组件
- 不顺手重写详情页布局
- 不调整数据库 schema

## 风险

### 风险 1
- 若直接大批量迁移所有详情子组件，容易把本轮从“主路径纯度”带偏成“目录整理工程”

### 风险 2
- 若只迁文件不补兼容说明，后续仍可能有人把 `explorations/*` 误当成产品主语继续扩写

### 风险 3
- `change-units-panel.tsx` 名称本身带有演化语义，迁移时需要明确它仍是 Requirement 附属面板，不代表系统进入正式 Change Unit 子系统

## 后续预留
- 后续再评估 `model-tabs.tsx`、`role-view-tabs.tsx`、`signoff-panel.tsx`、`consensus-status.tsx` 的迁移顺序
- 后续再做最小的组件命名清理，减少新的 `Exploration*` 心智残留
- `/explorations*` 路由继续保留兼容，但不再承载主实现

# Requirement Surface Migration Plan V2

## 当前状态

### 当前 `/requirements` 与 `/explorations` 的残留耦合点
- `/requirements/[id]` 已拥有详情页主实现：
  - `src/app/(dashboard)/requirements/[id]/page.tsx`
  - `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx`
- `/explorations/[id]` 已退回 alias wrapper：
  - `src/app/(dashboard)/explorations/[id]/page.tsx`
- 当前主要残留依附已收缩到 Requirement 详情页的非核心共享子组件：
  - `comments-panel.tsx`
  - `model-tabs.tsx`
  - `role-view-tabs.tsx`
  - `signoff-panel.tsx`
  - `consensus-status.tsx`
  - `chat-panel.tsx`
  - `version-history.tsx`
  - `status-control.tsx`
  - `test-case-panel.tsx`
  - `change-units-panel.tsx`

### Requirement 列表页现状
- `src/app/(dashboard)/requirements/page.tsx`
  - 当前直接渲染 `RequirementIndexPage`
- 真实主实现已迁到：
  - `src/app/(dashboard)/requirements/requirement-index-page.tsx`
  - `src/app/(dashboard)/requirements/requirements-list-client.tsx`

### Requirement 新建页现状
- `src/app/(dashboard)/requirements/new/page.tsx`
  - 当前直接渲染 `new-requirement-page`
- 真实主实现已迁到：
  - `src/app/(dashboard)/requirements/new/new-requirement-page.tsx`
  - `src/app/(dashboard)/requirements/new/requirement-form.tsx`

### 详情页子组件现状
- detail client 已迁到 `requirements/[id]`
- 3 个核心子组件已迁到 `requirements/[id]/*`：
  - `issue-units-panel.tsx`
  - `requirement-units-panel.tsx`
  - `conflict-panel.tsx`
- 当前仍留在 `explorations/[id]/*` 的主要是非核心共享子组件：
  - `status-control.tsx`
  - `version-history.tsx`
  - `change-units-panel.tsx`
  - 以及其余辅助面板

## 本轮范围

### 本轮建议先迁哪些
1. Requirement 列表页主实现
   - 目标是把 Requirement 主入口的真实实现迁回 `requirements/*`
   - 这是主入口残留最明显的一块
2. Requirement 新建页主实现
   - 目标是把新建入口的真实实现迁回 `requirements/new/*`
3. 详情页最核心子组件
   - 优先迁最常改、最直接影响闭环的几个：
     - `issue-units-panel.tsx`
     - `requirement-units-panel.tsx`
     - `conflict-panel.tsx`

### 当前状态更新
- `ISSUE 4` 已完成本轮最小迁移：
  - `/requirements` 列表页主实现已迁到 `requirements/*`
  - `/requirements/new` 新建页主实现已迁到 `requirements/new/*`
  - `issue-units-panel.tsx`、`requirement-units-panel.tsx`、`conflict-panel.tsx` 已迁到 `requirements/[id]/*`
  - `explorations/*` 对应文件已退回 wrapper / alias 层

### 哪些先保持 wrapper / 兼容层
- `/explorations`
- `/explorations/new`
- `/explorations/[id]`
- 仍保留 alias / wrapper，不删除
- 目标是 Requirement 主路径脱钩，不是一次性消灭兼容路由

### 最小迁移顺序
1. 先迁 `/requirements` 列表页 page + list 主实现
2. 再迁 `/requirements/new` page + form 主实现
3. 再迁详情页最核心子组件到 `requirements/[id]` 或中性共享位置
4. 旧 `explorations/*` 页面退回 wrapper / re-export

## 非目标
- 不做全仓库 rename
- 不做大规模目录重构
- 不迁与本轮闭环无关的子组件
- 不为了“代码漂亮”强行挪所有文件

## 风险

### 风险 1
- 如果一次迁太多详情页子组件，容易引入大量相对路径和共享依赖噪音

### 风险 2
- 如果只迁 page 不迁主实现，Requirement 主路径仍然只是壳

### 风险 3
- 如果先迁低频子组件，而不迁列表页和新建页，用户主入口残留心智不会明显改善

## 后续预留
- 列表页、新建页迁完后，再继续清理详情页共享子组件
- 后续再考虑组件名层面的 `Exploration* -> Requirement*` rename
- 兼容 alias 长期可保留，但应退化为薄 wrapper

## 已完成
- `/requirements` 列表页主实现已迁回 `requirements/*`
- `/requirements/new` 新建页主实现已迁回 `requirements/new/*`
- `IssueUnitsPanel`、`RequirementUnitsPanel`、`ConflictPanel` 已迁回 `requirements/[id]/*`
- 旧 `explorations/*` 对应文件已经退为 wrapper / alias

## 当前残留
- Requirement 详情页仍有一批非核心共享子组件留在 `explorations/[id]/*`
- `/models` 与 `/evolution` 仍通过旧 wrapper 进入新的 Requirement 列表实现
- 组件和类型名层面仍残留少量历史 `Exploration*` 命名

## 下一轮建议
1. 继续迁移 `status-control`、`version-history`、`change-units-panel`、`comments-panel`
2. 再做一轮组件名与类型名的最小清理，减少新的认知债
3. 继续保留 `/explorations*` 路由兼容，但不再让它承载主实现

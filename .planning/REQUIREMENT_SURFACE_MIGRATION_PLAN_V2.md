# Requirement Surface Migration Plan V2

## 当前状态

### 当前 `/requirements` 与 `/explorations` 的残留耦合点
- `/requirements/[id]` 已拥有详情页主实现：
  - `src/app/(dashboard)/requirements/[id]/page.tsx`
  - `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx`
- `/explorations/[id]` 已退回 alias wrapper：
  - `src/app/(dashboard)/explorations/[id]/page.tsx`
- 但以下 Requirement 主路径仍残留 `explorations/*` 依附：
  - `/requirements` -> `src/app/(dashboard)/explorations/exploration-index-page.tsx`
  - `/requirements/new` -> `src/app/(dashboard)/explorations/new/page.tsx`
  - Requirement detail client 仍引用很多 `explorations/[id]/*` 子组件

### Requirement 列表页现状
- `src/app/(dashboard)/requirements/page.tsx`
  - 当前仍直接渲染 `ExplorationIndexPage`
- 真实主实现仍在：
  - `src/app/(dashboard)/explorations/exploration-index-page.tsx`
  - `src/app/(dashboard)/explorations/explorations-list-client.tsx`

### Requirement 新建页现状
- `src/app/(dashboard)/requirements/new/page.tsx`
  - 当前仍直接 re-export `../../explorations/new/page`
- 真实主实现仍在：
  - `src/app/(dashboard)/explorations/new/page.tsx`
  - `src/app/(dashboard)/explorations/new/exploration-form.tsx`

### 详情页子组件现状
- detail client 已迁到 `requirements/[id]`
- 但以下核心子组件仍主要位于 `explorations/[id]/*`：
  - `issue-units-panel.tsx`
  - `requirement-units-panel.tsx`
  - `conflict-panel.tsx`
  - `status-control.tsx`
  - `version-history.tsx`
  - `change-units-panel.tsx`

## 本轮范围

### 本轮建议先迁哪些
1. Requirement 列表页主实现
   - 当前 `/requirements` 仍直接依赖 `ExplorationIndexPage`
   - 这是主入口残留最明显的一块
2. Requirement 新建页主实现
   - 当前 `/requirements/new` 仍直接依赖 `NewExplorationPage`
3. 详情页最核心子组件
   - 优先迁最常改、最直接影响闭环的几个：
     - `issue-units-panel.tsx`
     - `requirement-units-panel.tsx`
     - `conflict-panel.tsx`

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

# Requirement Entry Migration Plan V1

## 当前状态

### 当前 `/requirements` 与 `/explorations` 的关系
- `/requirements` 已是主入口
- `/explorations` 保留兼容 alias
- 但当前主路径很多页面仍直接复用 `explorations/*` 的实现

### 当前主路径的真实实现关系
- `/requirements`
  - `src/app/(dashboard)/requirements/page.tsx`
  - 当前只是调用 `ExplorationIndexPage`
- `/requirements/[id]`
  - `src/app/(dashboard)/requirements/[id]/page.tsx`
  - 当前直接 re-export `../../explorations/[id]/page`
- `/requirements/new`
  - `src/app/(dashboard)/requirements/new/page.tsx`
  - 当前直接 re-export `../../explorations/new/page`

### 当前哪些核心实现仍在 `explorations/*`
- Requirement 列表主实现
  - `src/app/(dashboard)/explorations/exploration-index-page.tsx`
  - `src/app/(dashboard)/explorations/explorations-list-client.tsx`
- Requirement 详情主实现
  - `src/app/(dashboard)/explorations/[id]/page.tsx`
  - `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
- Requirement 新建主实现
  - `src/app/(dashboard)/explorations/new/page.tsx`
  - `src/app/(dashboard)/explorations/new/exploration-form.tsx`

### 当前内部残留的实现主语
- 文件名仍大量是 `Exploration*`
- `requirements/page.tsx` 当前仍传 `listView=\"explorations\"`
- 兼容层虽然已经注释说明，但 Requirement 主路径仍然直接依附历史实现目录

## 本轮范围

### 建议先迁哪些实现
1. Requirement 详情页主实现
   - 这是当前最核心的 Worksurface
   - 直接关系到 Requirement / Requirement Unit / Issue Queue / Stability 四者闭环
2. Requirement 新建入口主实现
   - 影响 Requirement 主语的一致性
3. Requirement 列表主实现
   - 影响较大，但相对容易做共享抽取

### 哪些先保留 wrapper / 兼容层
- `/explorations`
- `/explorations/[id]`
- `/explorations/new`
- 仍可保留为 wrapper 或 alias
- 目标不是删除兼容路由，而是让 `requirements/*` 不再直接依赖历史目录中的核心实现

### 本轮最小迁移范围
- 优先把 Requirement 详情主实现从 `explorations/[id]` 抽到：
  - `requirements/[id]` 下的真实实现，或
  - 更中性的共享目录
- 如果本轮范围不允许完整迁移：
  - 至少把最关键的 detail client / server page 做最小共享抽取
  - 同时补足边界说明，避免后续继续把 `explorations/*` 当主实现目录

## 非目标
- 不做全仓库 rename
- 不做所有 `Exploration*` 组件重命名
- 不大规模改动路由结构
- 不改数据库或业务对象模型

## 风险

### 风险 1
- 如果一次性迁完整个 `explorations/*`，会把本轮从“闭环收口”带偏成“目录重构”

### 风险 2
- 如果继续只靠 wrapper 而完全不动核心实现，Requirement 主路径会长期依附历史目录

### 风险 3
- 详情页、列表页、新建页的迁移粒度不同，若不先定顺序，容易出现半迁移后命名更乱

## 后续预留
- 详情页迁完后，再考虑列表页和新建页
- 目录迁移完成后，再决定是否 rename `Exploration*` 组件
- 兼容 alias 可继续保留，但应退化为薄 wrapper

## 状态更新

### 已完成
- `/requirements/[id]` 已不再直接 re-export `explorations/[id]/page`
- Requirement 详情页的 server page 与 detail client 主实现已迁到：
  - `src/app/(dashboard)/requirements/[id]/page.tsx`
  - `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx`
- `/explorations/[id]` 已退回 legacy alias wrapper
- `explorations/[id]/exploration-detail-client.tsx` 已退回兼容 re-export

### 当前残留
- Requirement 列表主实现仍在 `explorations/*`
- Requirement 新建主实现仍在 `explorations/*`
- 详情页子组件仍主要位于 `explorations/[id]/*`

### 下一轮可继续推进
- 若继续迁移，优先抽详情页子组件到中性共享位置
- 再处理列表页与新建页主实现

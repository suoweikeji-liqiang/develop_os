# Entry Renaming Cleanup Plan V1

## 当前状态

### 已完成的 Requirement 主入口收敛
- `/requirements` 已重新立为主入口
- `/requirements/[id]` 与 `/requirements/new` 已可直接使用
- 顶部导航主入口已显示 `Requirements`
- 新建入口按钮已显示 `New Requirement`

相关实现位置：
- `src/app/(dashboard)/requirements/page.tsx`
- `src/app/(dashboard)/requirements/[id]/page.tsx`
- `src/app/(dashboard)/requirements/new/page.tsx`
- `src/components/layout/dashboard-nav.tsx`

### 当前仍由 exploration 目录承载的主实现
- Requirement 列表实现仍在：
  - `src/app/(dashboard)/explorations/exploration-index-page.tsx`
  - `src/app/(dashboard)/explorations/explorations-list-client.tsx`
- Requirement 详情页实现仍在：
  - `src/app/(dashboard)/explorations/[id]/page.tsx`
  - `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
- 新建 Requirement 实现仍在：
  - `src/app/(dashboard)/explorations/new/page.tsx`
  - `src/app/(dashboard)/explorations/new/exploration-form.tsx`

### 当前命名残留
- 组件 / 文件名仍大量使用 `Exploration*`
- helper 文案中仍有“探索”“exploration”“Launch lane”这类历史措辞
- `isActivePath` 仍把 `/explorations` 视作兼容激活路径
- Dashboard 和部分说明文本仍带历史 exploration 心智

## 存在问题

### 1. 产品主语和实现主语仍不一致
- 用户可见主入口已经是 `Requirement`
- 但开发实现主要仍位于 `explorations` 目录和 `Exploration*` 组件名下

### 2. 用户可见文案还未完全收口
- 入口与标题已基本改过一轮
- 但 helper text、空状态、兼容提示、Dashboard 描述仍有残留

### 3. 当前缺少“兼容实现位置”的边界说明
- 代码层没有明确告诉后续维护者：
  - 这些文件在 `explorations/` 目录下，只是历史兼容位置
  - 并不代表产品主语仍然是 Exploration

## 本轮范围

### 要做
1. 继续梳理用户可见残留文案：
  - 页面标题
  - helper text
  - 空状态
  - 按钮文案
  - Dashboard 文案
2. 对仍承载 Requirement Worksurface 的 `explorations/*` 页面与核心组件补兼容说明注释
3. 保持 `/explorations` 路由兼容，但弱化其主语地位

### 建议实现位置
- UI：
  - `src/app/(dashboard)/explorations/exploration-index-page.tsx`
  - `src/app/(dashboard)/explorations/explorations-list-client.tsx`
  - `src/app/(dashboard)/explorations/new/page.tsx`
  - `src/app/(dashboard)/explorations/new/exploration-form.tsx`
  - `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
  - `src/app/(dashboard)/page.tsx`
- 注释：
  - `src/app/(dashboard)/explorations/[id]/page.tsx`
  - `src/app/(dashboard)/explorations/new/page.tsx`
  - 其他仍对外承载 Requirement 主流程的 `explorations/*`

## 本轮落地结果（已实现）

### 已收口的主文案
- Requirement 列表页：
  - `Launch lane -> Primary Actions`
  - `Active list -> Requirement List`
  - `Entries -> Requirements`
- Dashboard 卡片动作：
  - `Open lane -> 打开工作面`
- Requirement 详情页阶段文案：
  - `open / refining / stabilized` 改为面向 Requirement 的中文阶段标签
  - `发散探索` 语义改为 `采样与边界收敛`
- 新建 Requirement 表单侧栏：
  - `Prompt hints -> Requirement hints`
- 认证页 / 管理页残留的“探索流”文案已改成 Requirement 主语

### 已补的兼容说明注释
- `src/app/(dashboard)/explorations/exploration-index-page.tsx`
- `src/app/(dashboard)/explorations/explorations-list-client.tsx`
- `src/app/(dashboard)/explorations/new/page.tsx`
- `src/app/(dashboard)/explorations/new/exploration-form.tsx`
- `src/app/(dashboard)/explorations/[id]/page.tsx`
- `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
- `src/app/(dashboard)/explorations/page.tsx`
- `src/components/layout/dashboard-nav.tsx`

### 当前保留但已弱化的历史包袱
- `/explorations`
- `/explorations/new`
- `/explorations/[id]`
- `ExplorationIndexPage / ExplorationDetailClient / ExplorationForm` 这些实现名

这些保留项目前只承担兼容职责，不再代表产品主语。

## 非目标
- 不做全仓库 rename
- 不做大规模目录迁移
- 不把 `Exploration*` 组件全部重命名
- 不重写路由结构

## 后续预留
- 后续若继续清理，可把 `explorations/*` 迁到 `requirements/*` 下的真实实现目录
- 再下一步才考虑组件名 rename
- 这一轮先优先清用户心智，不优先清物理目录

## 状态更新

### 已完成
- 主流程可见文案已优先回到 `Requirement` 主语
- `/explorations` 已被明确标记为 legacy alias
- 主要兼容实现位置都已补边界说明注释

### 当前残留
- 组件名和目录名仍保留 `Exploration*`
- `requirements/*` 仍有少量 wrapper 直接复用 `explorations/*` 实现

### 下一轮可继续推进
- 若继续清理，再考虑把真实实现目录迁到 `requirements/*`
- 组件名 rename 放到目录迁移之后处理

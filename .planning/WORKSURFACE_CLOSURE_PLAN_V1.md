# Worksurface Closure Plan V1

## 当前状态

### 当前 Worksurface 已有能力
- 主入口已经切到 `/requirements`
  - `src/app/(dashboard)/requirements/page.tsx`
  - `src/app/(dashboard)/requirements/[id]/page.tsx`
  - `src/app/(dashboard)/requirements/new/page.tsx`
- Requirement 详情页已经整理成四个主区
  - Overview
  - Requirement Units
  - Issue Queue
  - Stability Summary
- 主工作面真实实现仍主要在：
  - `src/app/(dashboard)/explorations/[id]/exploration-detail-client.tsx`
  - `src/app/(dashboard)/explorations/[id]/issue-units-panel.tsx`
  - `src/app/(dashboard)/explorations/[id]/requirement-units-panel.tsx`
  - `src/app/(dashboard)/explorations/[id]/conflict-panel.tsx`
- Issue Queue 已经具备统一问题面基础：
  - 类型体系与生命周期 helper：`src/lib/issue-queue.ts`
  - 聚合入口：`src/server/trpc/routers/issueUnit.ts`
  - Clarification 最小投影：`src/server/trpc/routers/clarification.ts`
  - Conflict projection：`src/server/trpc/routers/issueUnit.ts`
- Stability 已经具备 layer-aware 解释：
  - layer helper：`src/lib/requirement-unit-layer.ts`
  - worksurface guidance / impact summary：`src/server/requirements/worksurface.ts`

### 当前已经统一的入口
- 用户从导航、列表、新建、详情进入时，主语已经是 `Requirement`
- `Issue Queue` 已是默认问题推进入口
- `Conflict Panel` 与 `Clarification Queue` 已退为辅助来源面

### 当前“统一入口”与“统一闭环”的差距
- Clarification 目前只是“可转入 Issue Queue”，但关闭后如何提示回源确认还不够明确
- Conflict projection 已能同步状态，但“证据面”和“处理面”的关系还可以更直白
- Stability 已能解释 layer target，但对“下一步先推进什么、先补什么”的治理建议还不够强
- impact summary 已经有 `headline / signals / nextStep`，但还不够像“变化后果提示”
- `/requirements` 已经是主入口，但核心实现仍大量依附 `explorations/*`

## 本轮范围

### 本轮要补的闭环点
1. Clarification -> Issue Queue -> Clarification
   - 明确 queue eligibility 的 UI 表达
   - 明确已投影 issue 的跟踪关系
   - 明确 issue 关闭后是否需要回源人工确认
2. Conflict -> Issue Queue -> Conflict
   - 更清楚表达 Conflict 是来源 / 证据面
   - 更清楚表达 projection 状态与原 conflict 状态关系
   - 在关闭或驳回 projection 后补充回源含义说明
3. Stability -> 推进建议
   - 从“解释器”再往前推进半步，给出优先推进 / 优先补齐建议
   - 在准备进入更后阶段时给出软提示
4. Impact summary -> 轻量 change-like 摘要
   - 提高“为什么当前不宜推进”的可解释性
   - 提高 `nextStep` 的动作性
5. Requirement 主语迁移
   - 开始把 Requirement 主路径的核心实现逐步从 `explorations/*` 脱钩
   - 本轮只做最小迁移或最小共享抽取

### 对四个核心对象的收口判断
- Requirement
  - 继续只管顶层边界、总览、状态、版本链、全局摘要
- Requirement Unit
  - 继续只管颗粒推进、局部状态、局部稳定度
- Issue Queue
  - 继续只管问题分诊、推进、关闭语义和来源回链
- Stability
  - 继续只做推荐型成熟度判断，不接管强流程阻断

## 非目标
- 不修改数据库 schema
- 不上正式 Change Unit
- 不做完整 Impact Graph
- 不做 Prototype Mapping 全量接入
- 不做强阻断门禁
- 不做全仓库 rename 或大规模目录迁移
- 不把系统扩成项目管理平台或 DevOps 平台

## 风险

### 风险 1
- Clarification / Conflict / Issue Queue 三方闭环如果只做 UI 提示、不补最小 helper，很容易再次分散在多个文件里

### 风险 2
- 如果 Requirement 主语迁移过急，容易把本轮目标从“闭环收口”带偏成“代码重构”

### 风险 3
- Stability 如果推进过头，容易滑向强门禁或复杂规则系统，偏离“推荐型判断器”定位

### 风险 4
- impact summary 如果直接追求“变化追踪”，容易越界到正式 Change 体系

## 后续预留
- Clarification / Conflict 的更明确回源动作
- Impact summary 与未来轻量 Change 语义的自然对接
- Requirement 主路径核心实现继续从 `explorations/*` 迁出
- layer-aware stability 与 issue type 的进一步联动

## 实现顺序建议
1. 先补 Clarification 最小闭环
2. 再补 Conflict projection 最小闭环
3. 再加强 Stability 的推进建议
4. 再增强 impact summary 的变化后果提示
5. 再做 Requirement 主语的最小实现迁移
6. 最后做一轮命名、注释、planning 状态收口

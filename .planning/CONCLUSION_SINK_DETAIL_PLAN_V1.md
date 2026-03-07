# Conclusion Sink Detail Plan V1

## 当前状态

### 当前 conclusionSignal 已做到什么
- helper 位于：`src/lib/issue-queue.ts`
- 当前 conclusionSignal 已能表达：
  - `boundary_clarified`
  - `risk_confirmed`
  - `missing_filled`
  - `conflict_decided`
  - `closed_without_content_sink`
- 当前信号已投影到：
  - Clarification 区：`src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx`
  - Issue Queue：`src/app/(dashboard)/requirements/[id]/issue-units-panel.tsx`
  - Requirement Unit：`src/app/(dashboard)/requirements/[id]/requirement-units-panel.tsx`
  - Impact Summary：`src/server/requirements/worksurface.ts` + `requirement-detail-client.tsx`
- 当前已经能说明：
  - 结论主要沉淀到哪个 Unit
  - 结论对推进面的影响
  - 是否仍需人工回源确认或补内容

### 当前“结论落到哪个 Unit”还不够细的地方
- 现在只知道结论主要落到某个 Unit，例如 `RU-03`，但还不清楚更像落到：
  - 边界备注
  - 风险说明
  - 缺失信息补充
  - 冲突裁定
  - 假设消解
  - 实现提示
- 用户仍然需要自己脑补“应该把这条结论写进 Unit 的哪类内容”
- 对于已关闭但未完全沉淀的结论，目前只能看到“待回源确认 / 需补内容”，还不够具体

## 本轮范围

### 本轮如何把落点细到“Unit 的哪类字段 / 内容块”
1. 在现有 conclusionSignal 上补一层轻量 sink detail
   - `boundary_note`
   - `risk_note`
   - `missing_info`
   - `conflict_decision`
   - `assumption_resolution`
   - `implementation_hint`
   - `no_content_sink`
2. 这层 detail 继续由当前已有信号推导
   - issue type
   - clarification category
   - issue status
   - 是否已有 primary unit sink
3. 在 4 个位置统一提示这层 detail
   - Clarification
   - Issue Queue
   - Requirement Unit
   - Impact Summary / Conclusion Sink Highlights
4. 明确它只是“建议写入哪类内容块”
   - 不自动生成正文
   - 不自动落写 Requirement Unit 字段

### 哪些只是提示，哪些仍不自动改状态
自动提示：
- 更像沉到哪类内容块
- 为什么是这个内容块
- 对推进的含义
- 是否仍需人工把结论正式写入内容

仍然人工确认：
- Clarification 是否标记为已收敛
- Requirement Unit 状态 / 稳定度是否更新
- 结论是否真正写入 Unit 的 summary、风险说明或其他正文

## 非目标
- 不自动改 Requirement Unit 正文
- 不引入重型内容块 schema
- 不做复杂结论推理引擎
- 不做多 Unit 自动传播
- 不做结论编辑器

## 风险

### 风险 1
- 如果 sink detail 标签太多，会削弱当前闭环的可读性

### 风险 2
- 如果把 “建议写入哪类内容块” 说成 “已经写入”，会制造错误心智

### 风险 3
- 如果只在某一个页面展示 sink detail，用户仍需要跨面板脑补完整链路

## 后续预留
- 未来可继续细到“建议写入 Unit 的哪个字段或区块标题”
- 未来可把 sink detail 与 change evidence 或 version notes 轻量关联
- 未来可评估 Conflict projection 是否也复用同一套 sink detail 规则

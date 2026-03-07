# Requirement Worksurface 1.0 Milestone

## 里程碑定义

### Requirement Worksurface 1.0 解决了什么
- Requirement 已重新成为主入口：
  - `/requirements`
  - `/requirements/new`
  - `/requirements/[id]`
- Requirement 详情页已经稳定为四个主区：
  - Overview
  - Requirement Units
  - Issue Queue
  - Stability Summary
- Requirement / Requirement Unit / Issue Queue / Stability 的职责边界已经基本清晰：
  - Requirement：顶层边界与总览
  - Requirement Unit：颗粒推进
  - Issue Queue：默认问题推进主入口
  - Stability：推荐型成熟度判断器
- Clarification 与 Conflict 已不再各自形成独立主问题面，而是被收敛进统一问题闭环：
  - 来源面保留
  - 处理面进入 Issue Queue
  - 关闭后可以回看结论落点
- Impact Summary 已从静态摘要推进为轻量推进结论面：
  - 哪些 Unit 正受影响
  - 为什么受影响
  - 当前建议先推进什么
- Issue Queue 的优先级已具备阶段感知能力，可以更直接回答“当前阶段先处理哪个最值”

### 现在系统已经能回答什么问题
1. 当前这个 Requirement 主要看哪里推进
2. 哪些 Requirement Units 已经可以推进，哪些仍需补齐
3. 哪些 issue 是默认处理入口中的关键阻断或高杠杆问题
4. 某条 Clarification 进入 Issue Queue 后，主要影响哪个 Unit
5. 问题关闭后，结论更像沉淀到 Unit 的哪类内容块
6. 当前阶段更适合先清边界、先做收敛，还是先清开发准备阻塞

## 1.0 边界

### 1.0 明确不包含什么
- 正式 Change Unit 子系统
- 完整 Impact Graph
- Prototype Mapping 全量接入
- 强阻断门禁
- 自动写回 Requirement Unit 正文内容
- 全流程 AI 协作壳
- 项目管理、排期管理、交付管理、DevOps 运营能力

### 这是哪个层面的 1.0
- 这是 Requirement Worksurface / Requirement Evolution Loop 的 1.0
- 不是整个 `develop_os` 的 1.0
- 不是变更管理、原型治理或强流程门禁的 1.0

## 当前主要残留债务
- `explorations/*` 兼容壳仍然存在，少量非核心子组件尚未迁回 `requirements/*`
- 结论落点还停留在“建议沉淀到哪类内容块”，还没有细到具体正文位置
- stage-aware priority 仍是规则驱动，不是正式阶段机
- Impact Summary 仍是当前态结论，不是事件级 diff

## 下一阶段最自然的演化方向
1. 继续清掉 Requirement 主路径上的剩余兼容壳
2. 把结论落点从“内容块提示”推进到“建议补到哪个内容片段”
3. 继续细化 stage-aware priority，让不同阶段的 top actions 更稳定

## 收官判断

### 当前可以视为成立的标准
- Requirement 已是默认主入口，`explorations/*` 已退为兼容层
- 详情页四个主区已经稳定，且围绕统一推进闭环工作
- 问题来源、问题处理、成熟度判断、推进摘要之间已形成可解释闭环
- 用户可以从来源问题一路追到：
  - Issue Queue
  - Requirement Unit
  - Impact Summary
  - Stability guidance

### 当前仍需明确说明的限制
- 系统给的是推进建议，不是自动裁决
- 系统给的是轻量回链，不是全自动知识沉淀
- 系统给的是推荐型治理，不是硬门禁或流程引擎

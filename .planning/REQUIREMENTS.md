# Requirements: DevOS

**Defined:** 2026-02-28
**Core Value:** 在实现之前暴露误解，让团队对"要做什么"达成结构化共识

## v1 Requirements

### AI 核心引擎

- [x] **AI-01**: 用户可输入自然语言需求（中英文），AI 自动生成五层结构化模型（目标/假设/行为/场景/可验证性）
- [x] **AI-02**: 用户可通过对话方式修正和精炼 AI 生成的结构化模型
- [x] **AI-03**: AI 自动识别需求中的隐含假设并标注置信度
- [ ] **AI-04**: AI 自动检测需求之间、假设与行为之间的矛盾冲突
- [x] **AI-05**: AI 输出必须经过 schema 验证，失败自动重试

### 需求模型管理

- [x] **MOD-01**: 需求模型支持版本化，每次变更生成不可变快照
- [x] **MOD-02**: 支持结构化 diff 视图（目标/场景/状态变更级别，非文本行级别）
- [x] **MOD-03**: 需求状态流转：草稿 → 评审中 → 共识达成 → 实现中 → 完成
- [x] **MOD-04**: 支持全文搜索、按状态/标签/角色/日期筛选

### 多角色协作

- [ ] **COL-01**: 产品/开发/测试/UI 各角色可查看同一需求模型的角色专属视图
- [x] **COL-02**: 各角色按职责签字确认，全部签字才能推进状态
- [ ] **COL-03**: 支持评论、@提及、异步讨论
- [ ] **COL-04**: 应用内通知 + 邮件/webhook 通知

### 外部需求入口

- [ ] **EXT-01**: 外部部门可通过简单表单提交原始需求（无需完整登录）
- [ ] **EXT-02**: 提交者可查看需求处理进度

### 知识库

- [ ] **KB-01**: 支持上传背景文档，AI 建模时自动检索相关上下文
- [ ] **KB-02**: 支持接入代码仓库，AI 理解现有系统结构和约束
- [ ] **KB-03**: 历史澄清过程和决策记录自动沉淀，AI 随使用积累变聪明

### 基础设施

- [x] **INF-01**: 用户认证与角色管理（产品/开发/测试/UI/外部）
- [x] **INF-02**: 事件驱动架构，模块间通过事件总线通信
- [ ] **INF-03**: Agent 插件接口预留，当前实现澄清 Agent，未来可扩展

## v2 Requirements

- **V2-01**: AI 自动生成测试用例
- **V2-02**: AI 自动生成代码骨架
- **V2-03**: AI 代码审核 Agent
- **V2-04**: SSO / 飞书 / Confluence 集成
- **V2-05**: 需求模型 API（供下游工具消费）
- **V2-06**: 变更影响预测引擎

## Out of Scope

| Feature | Reason |
|---------|--------|
| 实时协同编辑 | 工程复杂度极高，需求澄清本质是异步思考过程 |
| 通用画图工具 | 只做行为状态图，不做通用 diagramming |
| 形式化规约语言 | 降低使用门槛，用自然语言+AI，不要求用户写 DSL |
| 移动端 App | Web 优先 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01 | Phase 2: Core AI Structuring | Complete |
| AI-02 | Phase 3: Conversational Refinement | Complete |
| AI-03 | Phase 3: Conversational Refinement | Complete |
| AI-04 | Phase 10: Conflict Detection & Agent Architecture | Pending |
| AI-05 | Phase 2: Core AI Structuring | Complete |
| MOD-01 | Phase 4: Model Versioning | Complete |
| MOD-02 | Phase 4: Model Versioning | Complete |
| MOD-03 | Phase 5: Workflow & Search | Complete |
| MOD-04 | Phase 5: Workflow & Search | Complete |
| COL-01 | Phase 6: Role Views & Consensus | Pending |
| COL-02 | Phase 6: Role Views & Consensus | Complete |
| COL-03 | Phase 7: Communication | Pending |
| COL-04 | Phase 7: Communication | Pending |
| EXT-01 | Phase 8: External Intake | Pending |
| EXT-02 | Phase 8: External Intake | Pending |
| KB-01 | Phase 9: Knowledge Base | Pending |
| KB-02 | Phase 9: Knowledge Base | Pending |
| KB-03 | Phase 9: Knowledge Base | Pending |
| INF-01 | Phase 1: Foundation | In Progress |
| INF-02 | Phase 1: Foundation | Complete |
| INF-03 | Phase 10: Conflict Detection & Agent Architecture | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Traceability updated: 2026-02-28*

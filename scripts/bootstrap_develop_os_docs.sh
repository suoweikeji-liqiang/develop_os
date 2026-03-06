#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-.}"
cd "$ROOT_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

backup_if_exists() {
  local file="$1"
  if [ -f "$file" ]; then
    cp "$file" "${file}.bak.${TIMESTAMP}"
    echo "Backed up existing file: $file -> ${file}.bak.${TIMESTAMP}"
  fi
}

write_file() {
  local file="$1"
  backup_if_exists "$file"
  mkdir -p "$(dirname "$file")"
  cat > "$file"
  echo "Created: $file"
}

echo "Creating develop_os documentation scaffold..."

write_file "docs/product-positioning.md" <<'EOF'
# develop_os 产品定位

## 一句话定义
develop_os 是一个面向 AI 时代复杂研发工作的协同操作系统。

## 核心目标
它的目标不是单纯提高代码生成速度，也不是替代某个行业应用，而是把复杂研发工作组织成一条：

- 可澄清
- 可约束
- 可执行
- 可验证
- 可沉淀

的人机协同链路。

## 核心价值
1. 在实现之前暴露误解
2. 让规范真正参与研发过程
3. 让需求成为执行的总线
4. 让研发过程持续沉淀为资产

## 目标用户
- 产品经理
- 技术负责人
- 开发工程师
- 测试工程师
- UI / UX 协作者
- AI 协同开发实践者

## 典型问题
- 需求复杂且经常变化
- 多角色理解不一致
- AI 生成快但质量和约束不稳
- 文档、代码、测试、决策相互割裂
- 历史经验难复用

## 与 AI 工作台的关系
- develop_os：认知与协同内核
- AI 工作台：执行与验证界面

AI 工作台是 develop_os 的关键落地层，但不是 develop_os 的全部定义。

## 行业知识的位置
暖通、IoT、工业控制等知识属于：
- 背景知识层
- 模板层
- 规则层
- 案例层
- 验证约束层

它们增强系统判断质量，但不定义产品本体。
EOF

write_file "docs/product-boundary-and-nongoals.md" <<'EOF'
# develop_os 产品边界与非目标

## 产品边界
develop_os 聚焦四层能力：
1. 认知中枢：需求澄清、冲突识别、结构化建模、共识建立
2. 约束中枢：开发/UI/测试/架构规范的执行化
3. 执行编排：从需求模型派生测试、评审、实现建议与验证动作
4. 组织记忆：沉淀需求历史、决策记录、失败模式、修复经验与模板

## 非目标
以下方向不是当前产品主题：

### 1. 不是行业应用本体
系统可服务暖通/IoT/工业等项目，但不等于这些行业软件本身。

### 2. 不是单纯聊天助手
对话只是交互方式之一，不是产品本质。

### 3. 不是另一个 Jira / 禅道 / 项目管理软件
任务、状态、评审会被涉及，但项目管理不是核心定位。

### 4. 不是纯 DevOps / CI 平台
可连接仓库、测试、门禁，但执行平台不是系统本体。

### 5. 不是自动写代码平台
代码生成、审查、修复是能力，不是主题。

### 6. 不是多智能体社交平台
多角色协同是手段，不追求“agent 社交化”本身。

## 当前阶段判断标准
每新增一个功能，先问：
1. 是否强化结构化认知？
2. 是否强化约束执行？
3. 是否进入验证闭环？
4. 是否沉淀为可复用资产？

如果都答不上来，应降级优先级。
EOF

write_file "docs/capability-map.md" <<'EOF'
# develop_os 能力地图

## 总体结构
develop_os 的能力分为四层：

## 1. 认知层
负责：
- 需求澄清
- 非结构化输入解析
- 五层/多层结构化建模
- 冲突识别
- 假设显性化
- 多角色共识
- 版本演化

### 当前状态
- 已有：需求建模、对话修正、冲突检测、版本化、协作评审
- 待增强：需求单元化、问题单元化、原型映射

## 2. 约束层
负责：
- 开发规范
- UI 规范
- 测试规范
- 架构边界
- 审核规则
- 门禁规则
- 人工兜底策略

### 当前状态
- 已有：规范意识、测试与评审方向
- 待增强：规范对象化、执行型规则、门禁体系

## 3. 执行层
负责：
- 测试资产生成
- 实现建议/骨架生成
- 评审清单生成
- 仓库联动
- 验证触发
- 结果回流

### 当前状态
- 已有：测试用例生成能力方向
- 待增强：执行编排、变更影响分析、结果回流

## 4. 记忆层
负责：
- 需求演化历史
- 决策记录
- 评审记录
- 失败模式
- 修复回路
- 模板与案例复用
- 长期组织记忆

### 当前状态
- 已有：历史沉淀方向
- 待增强：研发资产系统化、记忆检索与复用

## 能力跃迁
1. 从需求澄清到需求总线
2. 从共识达成到约束执行
3. 从模型展示到资产派生
4. 从工具接入到闭环验证
5. 从知识库到研发记忆系统
EOF

write_file "docs/evolution-roadmap.md" <<'EOF'
# develop_os 能力演化路线图

## 阶段一：需求澄清平台
目标：
- 将模糊需求结构化
- 支持对话修正与冲突识别
- 支持多角色评审与签字
- 建立版本链与 diff

## 阶段二：需求总线
目标：
- 让结构化需求模型成为全系统唯一上游真源
- 下游测试、评审、实现建议都引用同一需求对象
- 支持需求单元、问题单元、变更单元

## 阶段三：约束执行系统
目标：
- 将开发/UI/测试/架构规范转为可执行规则
- 建立需求门禁、测试门禁、评审门禁
- 引入人工兜底与豁免机制

## 阶段四：执行编排系统
目标：
- 从需求模型派生测试资产、实现建议、评审清单
- 对接仓库、测试、PR、验证流程
- 将执行动作结果回流

## 阶段五：研发记忆系统
目标：
- 沉淀需求演化、决策记录、失败模式、修复经验
- 支持复用模板、案例、历史判定逻辑
- 构建组织级研发资产

## 当前建议优先级
P1：
- 需求单元
- 问题单元
- 稳定度模型

P2：
- 变更单元
- 影响关系图

P3：
- 原型映射层
EOF

write_file "docs/domain-model/requirement-unit.md" <<'EOF'
# Requirement Unit（需求单元）

## 定义
Requirement Unit 是大系统需求中的最小可管理对象。  
它用于替代“只管理整份需求文档”的方式，让系统可以管理细粒度需求颗粒。

## 典型层级
- 目标层
- 角色层
- 场景层
- 流程层
- 数据层
- 权限层
- 异常层
- 界面层
- 约束层

## 建议字段
- id
- title
- summary
- layer
- domain
- source_type
- source_ref
- status
- stability_level
- owner
- reviewers
- parent_id
- dependency_ids
- related_page_ids
- related_flow_ids
- related_data_ids
- related_test_asset_ids
- related_issue_ids
- related_change_ids
- created_at
- updated_at

## 生命周期
- draft
- refining
- waiting_confirmation
- agreed
- ready_for_design
- ready_for_dev
- changed_pending_review
- archived

## 关系
- 一个需求单元可关联多个问题单元
- 一个需求单元可产生多个变更单元
- 一个需求单元可映射到多个页面/流程/测试资产

## 目标
从“管理需求文档”升级为“管理需求对象”。
EOF

write_file "docs/domain-model/issue-unit.md" <<'EOF'
# Issue Unit（问题单元）

## 定义
Issue Unit 用于管理需求中的模糊、缺失、冲突、风险、待确认项，以及原型/文档不一致等问题。

## 问题类型
- ambiguity：模糊项
- missing：缺失项
- conflict：冲突项
- risk：风险项
- pending_confirmation：待确认项
- prototype_doc_mismatch：原型与文档不一致
- permission_gap：权限缺失
- exception_gap：异常流程缺失

## 建议字段
- id
- type
- severity
- title
- description
- layer
- source_type
- source_ref
- related_requirement_unit_ids
- suggested_resolution
- owner
- reviewers
- status
- block_dev
- created_at
- updated_at

## 严重度
- low
- medium
- high
- critical

## 状态
- open
- triaged
- in_progress
- waiting_confirmation
- resolved
- rejected
- archived

## 是否阻断开发
建议布尔字段：
- true：阻断当前阶段推进
- false：记录但不阻断

## 目标
把“这里不清楚”变成可追踪、可关闭、可统计的问题系统。
EOF

write_file "docs/domain-model/change-unit.md" <<'EOF'
# Change Unit（变更单元）

## 定义
Change Unit 用于描述一次正式需求变更，而不仅仅是文档内容被修改。

## 解决的问题
版本历史只能回答“改了什么”；  
Change Unit 还要回答：
- 为什么改
- 谁发起
- 影响谁
- 要不要重新评审
- 是否影响既有实现/测试/原型

## 建议字段
- id
- title
- reason
- initiator
- related_requirement_unit_ids
- related_issue_unit_ids
- change_scope
- impact_summary
- risk_level
- requires_resignoff
- affects_tests
- affects_prototype
- affects_code
- status
- created_at
- updated_at

## 风险等级
- low
- medium
- high
- critical

## 状态
- proposed
- under_review
- approved
- rejected
- applied
- archived

## 与版本/快照关系
- Change Unit 是语义层对象
- Snapshot / Diff 是表现层与记录层对象
- 一个 Change Unit 可对应一个或多个快照差异

## 目标
从“有历史”升级成“有可管理的演化链”。
EOF

write_file "docs/domain-model/stability-model.md" <<'EOF'
# Stability Model（稳定度 / 成熟度模型）

## 为什么需要
状态流转描述的是流程位置；  
稳定度描述的是需求成熟程度。  
对于大系统早期需求，二者必须分开。

## 建议等级
### S0 - Idea
仅有初始想法、描述模糊、范围不清。

### S1 - Roughly Defined
目标和主路径初步明确，但存在较多待确认项。

### S2 - Main Flow Clear
主要场景与主流程明确，仍缺异常/权限/数据边界。

### S3 - Almost Ready
异常、权限、关键数据关系基本明确，可进入详细设计。

### S4 - Ready for Development
已满足开发前基线，存在少量不阻断项。

### S5 - Verified Stable
经过验证与回流，当前版本较稳定。

## 升级条件（示例）
- S0 -> S1：目标与范围达成初步一致
- S1 -> S2：关键角色与主流程补齐
- S2 -> S3：异常/权限/关键数据明确
- S3 -> S4：关键问题关闭，达到开发基线
- S4 -> S5：执行验证完成并回流

## 降级条件（示例）
- 新变更引入高风险问题
- 原型与文档主流程不一致
- 新增关键角色/关键路径未覆盖
- 核心数据对象重新定义

## 与状态流转的区别
- 状态：流程走到哪
- 稳定度：这件事到底成熟到什么程度

## 目标
让大系统需求可以分层冻结、分层开发，而不是非黑即白。
EOF

write_file "docs/domain-model/impact-graph.md" <<'EOF'
# Impact Graph（影响关系图）

## 定义
Impact Graph 用于描述需求、页面、流程、数据、权限、测试、代码模块等对象之间的关联关系。

## 核心目标
系统要从“能看 diff”升级到“能看后果”。

## 节点类型
- Requirement Unit
- Issue Unit
- Change Unit
- Prototype Page
- Flow
- Data Object
- Permission Rule
- Test Asset
- Code Module

## 边类型
- defines
- affects
- depends_on
- validates
- maps_to
- blocked_by
- implemented_by
- reviewed_by

## 核心问题
系统应能回答：
- 改一个场景，会影响哪些页面？
- 改一个字段定义，会影响哪些接口和测试？
- 改一个权限规则，要不要重新评审 UI 和测试？
- 原型改了，哪些需求单元要重审？

## 最小实现建议
第一版可先做到：
- Requirement -> Page
- Requirement -> Flow
- Requirement -> Test Asset
- Change -> Requirement
- Change -> Test Asset
- Page -> Flow

## 目标
从“版本变化”升级为“影响分析”。
EOF

write_file "docs/domain-model/prototype-mapping.md" <<'EOF'
# Prototype Mapping（原型映射层）

## 定义
Prototype Mapping 用于把 HTML 原型纳入需求系统，使“文档 + 原型”成为可统一管理的双源输入。

## 为什么需要
大系统早期最常见的问题之一：
- 文档这么写
- 原型那么画
- 开发按第三种理解做

## 第一版能力建议
- 页面识别
- 页面命名
- 页面与需求单元绑定
- 页面与流程绑定
- 页面与问题单元绑定
- 原型更新后的差异提醒

## 输入来源
- HTML 原型
- 页面截图（后续可扩展）
- 链接化原型（后续可扩展）

## 建议字段
- page_id
- page_name
- source_file
- source_hash
- related_requirement_unit_ids
- related_flow_ids
- related_issue_unit_ids
- version
- updated_at

## 差异分析建议
可比较：
- 页面结构变化
- 关键交互入口变化
- 页面命名变化
- 页面是否失去需求绑定

## 目标
让原型页面成为系统中的一级对象，而不是外挂参考物。
EOF

write_file "docs/workflows/large-system-requirements.md" <<'EOF'
# 大系统早期需求演化工作流

## 场景
在新系统启动前，产品通常会先产出：
- 大需求说明书
- HTML 原型
- 会议纪要
- 背景材料

这些输入天然存在：
- 模糊
- 缺漏
- 矛盾
- 原型与文档不一致

develop_os 的目标不是一次写出完美需求，而是把这些内容组织成可持续收敛的需求演化过程。

## 工作流

### 阶段 1：导入初始材料
输入：
- 需求说明书
- HTML 原型
- 会议纪要
- 背景资料
- 需求来源

输出：
- 初始需求全景图
- 初始对象映射
- 初始问题清单

### 阶段 2：生成需求全景图
从输入中抽取：
- 系统目标树
- 能力域地图
- 关键角色列表
- 核心场景清单
- 页面地图
- 数据对象清单
- 待确认项清单

### 阶段 3：自动发现问题
围绕以下维度扫描：
- 角色覆盖是否完整
- 主流程与异常流程是否完整
- 页面与文档是否一致
- 数据对象是否定义充分
- 权限是否完整
- 验收标准是否存在

### 阶段 4：问题归类与分派
每个问题单元需要：
- 类型
- 严重度
- 负责人
- 是否阻断开发
- 关联需求单元

### 阶段 5：滚动收敛
每轮修订后：
- 关闭已解决问题
- 标记新增问题
- 更新需求稳定度
- 更新影响关系
- 更新需复核对象

### 阶段 6：冻结当前可开发基线
冻结的是当前开发基线，而不是永远不变。  
系统应明确：
- 哪些需求已达到开发条件
- 哪些仍待确认
- 哪些高风险点必须先解决
- 哪些测试/评审资产已可派生

## 目标
把“大需求书 + 原型 + 讨论”变成一个可演化、可追踪、可收敛的需求操作面。
EOF

write_file "docs/workflows/ai-workbench.md" <<'EOF'
# AI 工作台在 develop_os 中的位置

## 核心结论
AI 工作台不是 develop_os 的定义，而是 develop_os 在研发执行场景中的关键落地方向。

## 分层关系
- develop_os：认知与协同内核
- AI 工作台：执行与验证界面

## AI 工作台关注的内容
- 规范统一管理
- UI 门禁
- 测试门禁
- 仓库关联
- AI 审核
- 人工审核兜底
- bug 回流
- 自动化验证

## 为什么它不是产品定义
如果直接把产品定义成“AI 工作台”，系统容易滑向：
- 智能 DevOps 平台
- 更智能的项目管理系统
- 流水线工具集

而 develop_os 的主题仍然应是：
- 需求澄清
- 结构化建模
- 约束执行
- 闭环验证
- 知识沉淀

## 正确理解
AI 工作台 = develop_os 执行层的重要界面  
不是 develop_os 全部本体。
EOF

write_file "docs/governance/spec-governance.md" <<'EOF'
# 规范治理（Spec Governance）

## 目标
将开发、UI、测试、架构等规范从“供阅读的文档”升级为“参与系统执行的规则”。

## 规范分类
### 1. 解释型规范
作用：
- 帮助人和 AI 理解上下文
- 解释设计原则与边界原因

### 2. 执行型规范
作用：
- 被系统调用
- 参与校验、阻断、审批、豁免

## 规范来源
- 团队内部规范
- 项目级约束
- 架构原则
- UI 设计原则
- 测试策略
- 安全与合规要求

## 建议管理维度
- 规范名称
- 规范类别
- 生效范围
- 生效对象
- 是否阻断
- 是否支持豁免
- 修改权限
- 审批要求
- 版本历史

## 原则
1. 规范不是越多越好，而是越可执行越好
2. 阻断型规则必须可解释
3. 关键规则不得由 agent 自行绕过
4. 豁免必须有审批与留痕

## 目标
让规范成为 develop_os 约束层的一等公民。
EOF

write_file "docs/governance/review-and-gates.md" <<'EOF'
# 评审与门禁机制

## 目标
建立从需求到执行的关键门禁，确保系统不是只会生成内容，还会守住边界。

## 门禁类型
### 1. 需求门禁
- 关键问题未关闭时不可进入开发
- 核心角色未确认时不可推进
- 关键异常/权限未明确时不可冻结基线

### 2. UI 门禁
- 不符合 UI 规范的变更不可合入
- 关键交互缺失或与需求不一致时需阻断

### 3. 测试门禁
- 冒烟测试未通过不可上线
- 关键接口测试缺失或失败不可合入

### 4. 合入门禁
- 需经过 AI 审核
- 必要时需人工审核兜底
- 高风险变更需重新签字

## 审核边界
### AI 审核适合做
- 一致性检查
- 规范对照
- 测试建议
- 影响提示

### 人工审核必须保留
- 高风险决策
- 规则豁免
- 关键上线判断
- 复杂业务解释权

## 原则
1. 门禁不可被 agent 任意更改
2. 门禁失败要能解释失败原因
3. 门禁结果必须回流到需求与变更历史
EOF

write_file ".planning/PRODUCT_DECISIONS_2026-03-06.md" <<'EOF'
# Product Decisions - 2026-03-06

## 本次决策主题
对 develop_os 的产品边界、能力定位和下一阶段补强方向进行校准。

## 决策结论

### 1. 产品本体定义
develop_os 是一个面向 AI 时代复杂研发工作的协同操作系统。

### 2. 非主题确认
以下不是产品主题：
- 暖通/工业等行业应用本体
- 单纯聊天助手
- 项目管理软件替代品
- DevOps / CI 平台
- 自动写代码平台
- 多智能体社交平台

### 3. AI 工作台定位
AI 工作台属于 develop_os 的执行层重要界面，不是产品全部定义。

### 4. 当前能力判断
当前仓库已经具备：
- 需求澄清
- 结构化建模
- 冲突识别
- 版本化
- 协作共识
- 测试用例生成方向

但尚未完全具备：
- 大系统需求演化管理
- 需求单元化
- 问题单元化
- 变更单元化
- 稳定度模型
- 影响关系图
- 原型映射层

### 5. 下一阶段优先补强
P1：
- Requirement Unit
- Issue Unit
- Stability Model

P2：
- Change Unit
- Impact Graph

P3：
- Prototype Mapping

## 说明
本文件用于固定本次讨论形成的关键产品判断，避免后续方向漂移。
EOF

write_file ".planning/GAP_ANALYSIS_REQUIREMENT_EVOLUTION.md" <<'EOF'
# Gap Analysis - Requirement Evolution

## 目标
评估 develop_os 从“需求澄清平台”升级到“需求演化管理系统”的差距。

## 当前已有能力
- 结构化需求建模
- 对话修正
- 冲突检测
- 版本化
- 结构化 diff
- 多角色协作
- 知识上下文接入
- 测试资产生成方向

## 当前缺口
### 1. 需求单元化不足
当前更偏整份需求模型管理，缺少细粒度需求对象层。

### 2. 问题单元化不足
有冲突识别，但缺少模糊/缺失/风险/待确认等对象化问题系统。

### 3. 变更语义层不足
有版本与 diff，但缺少变更原因、影响范围、复核要求等正式对象。

### 4. 稳定度模型缺失
状态流转存在，但未形成“成熟度/稳定度”体系。

### 5. 影响关系图缺失
尚不能系统性回答“改了什么会影响什么”。

### 6. 原型映射能力缺失
尚未把 HTML 原型纳入正式对象图。

## 缺口带来的影响
- 难以管理大系统早期需求
- 需求收敛过程不够可控
- 变更影响评估不足
- 原型与文档双源不一致难管理
- 难以分层冻结与分层推进开发

## 优先级建议
P1：
- Requirement Unit
- Issue Unit
- Stability Model

P2：
- Change Unit
- Impact Graph

P3：
- Prototype Mapping

## 预期产物
- 对象模型定义
- 数据表设计草案
- 前端基础页面/卡片形态
- 需求与原型映射机制
- 影响分析基础能力

## 验收标准（示例）
1. 系统可将大需求拆成需求单元
2. 系统可将问题对象化并追踪
3. 系统可记录正式变更对象
4. 系统可显示需求稳定度
5. 系统可输出基础影响关系
6. 系统可将 HTML 原型页面映射到需求对象
EOF

echo
echo "All files created successfully."
echo "You can now review and commit them."


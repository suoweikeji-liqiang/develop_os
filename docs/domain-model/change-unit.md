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

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

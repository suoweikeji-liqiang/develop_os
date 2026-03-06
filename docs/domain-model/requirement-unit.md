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

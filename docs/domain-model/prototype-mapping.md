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

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

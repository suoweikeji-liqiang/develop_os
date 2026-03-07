# Requirement Worksurface Demo

## 目的
- 用一条最短路径演示 Requirement Worksurface 1.0 已经形成的统一闭环

## 演示路径
1. 打开 `/requirements`
   - 说明 Requirement 是默认主入口
2. 进入某个 `/requirements/[id]`
   - 指出四个主区：
     - Overview
     - Requirement Units
     - Issue Queue
     - Stability Summary
3. 在 Clarification 区找到一条已进入 Issue Queue 的问题
   - 观察 queue eligibility
   - 观察 issue 跟踪关系
   - 观察是否绑定了 `primaryRequirementUnitId`
4. 进入 Issue Queue
   - 观察来源标签
   - 观察 `Phase Blocker / Highest Leverage / Fast Stabilization Win`
   - 观察 stage-aware 标签，理解当前阶段最值先处理什么
5. 回看 Requirement Unit
   - 观察该 Unit 为什么被关注
   - 观察回链来的问题或结论提示
   - 观察该 Unit 当前是更适合推进还是更需要补齐
6. 查看 Impact Summary
   - 观察 `affectedRequirementUnits`
   - 观察 `Advance First`
   - 观察 `Stabilize First`
   - 观察 `Conclusion Sink Highlights`
   - 观察 `actionPlan`
7. 查看 Stability Summary
   - 观察当前 layer 风险
   - 观察当前阶段推荐先去 Issue Queue 处理什么

## 演示时要强调的结论
- Clarification 是来源面，不是主处理面
- Issue Queue 是默认问题推进主入口
- Requirement Unit 是颗粒推进面
- Stability 是推荐型判断器，不是强阻断器
- Impact Summary 是推进结论面，不是纯统计面

## 演示时不要误讲的点
- 不要把系统描述成项目管理平台
- 不要把 `actionPlan` 描述成强制流程
- 不要把 conclusion sink 描述成自动写回正文
- 不要把 stage-aware priority 描述成复杂评分引擎

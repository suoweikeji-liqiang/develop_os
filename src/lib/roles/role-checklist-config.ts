export interface ChecklistItem {
  readonly key: string
  readonly label: string
}

export const ROLE_CHECKLISTS: Record<string, readonly ChecklistItem[]> = {
  PRODUCT: [
    { key: 'goal_clear', label: '目标描述清晰且可衡量' },
    { key: 'metrics_defined', label: '成功指标已定义' },
    { key: 'assumptions_reviewed', label: '假设已审查并标注置信度' },
    { key: 'scenarios_complete', label: '核心场景覆盖完整' },
  ],
  DEV: [
    { key: 'behavior_feasible', label: '行为描述技术可行' },
    { key: 'edge_cases', label: '边界场景已考虑' },
    { key: 'error_paths', label: '错误处理路径已定义' },
    { key: 'no_ambiguity', label: '无歧义的实现描述' },
  ],
  TEST: [
    { key: 'criteria_executable', label: '验证标准可执行' },
    { key: 'automation_criteria', label: '自动化测试标准已定义' },
    { key: 'manual_justified', label: '手动测试项有合理理由' },
    { key: 'all_testable', label: '所有场景可测试' },
  ],
  UI: [
    { key: 'user_flow_clear', label: '用户流程清晰' },
    { key: 'roles_defined', label: '交互角色已明确' },
    { key: 'state_transitions', label: '前后状态变化已描述' },
    { key: 'error_states', label: '异常状态UI处理已考虑' },
  ],
} as const

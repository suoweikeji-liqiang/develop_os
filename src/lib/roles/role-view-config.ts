export type LayerKey = 'goal' | 'assumption' | 'behavior' | 'scenario' | 'verifiability'

export interface RoleViewConfig {
  readonly label: string
  readonly primaryTabs: readonly LayerKey[]
  readonly secondaryTabs: readonly LayerKey[]
  readonly emphasisFields: Record<string, readonly string[]>
}

export const ROLE_VIEWS: Record<string, RoleViewConfig> = {
  PRODUCT: {
    label: '产品视角',
    primaryTabs: ['goal', 'assumption', 'scenario'],
    secondaryTabs: ['behavior', 'verifiability'],
    emphasisFields: {
      goal: ['description', 'successMetrics'],
      scenario: ['mainFlow'],
    },
  },
  DEV: {
    label: '开发视角',
    primaryTabs: ['behavior', 'scenario', 'verifiability'],
    secondaryTabs: ['goal', 'assumption'],
    emphasisFields: {
      behavior: ['rules', 'errorHandling'],
      verifiability: ['criteria'],
    },
  },
  TEST: {
    label: '测试视角',
    primaryTabs: ['verifiability', 'scenario', 'behavior'],
    secondaryTabs: ['goal', 'assumption'],
    emphasisFields: {
      verifiability: ['criteria', 'automationNotes'],
      scenario: ['edgeCases'],
    },
  },
  UI: {
    label: 'UI视角',
    primaryTabs: ['goal', 'behavior', 'scenario'],
    secondaryTabs: ['assumption', 'verifiability'],
    emphasisFields: {
      behavior: ['interactions'],
      scenario: ['userFlow'],
    },
  },
} as const

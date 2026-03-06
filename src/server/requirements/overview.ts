import { prisma } from '@/server/db/client'
import { HIGH_RISK_CHANGE_LEVELS, OPEN_CHANGE_STATUSES } from './change-units'

const OPEN_ISSUE_STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CONFIRMATION'] as const
const BLOCKING_ISSUE_STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CONFIRMATION'] as const

interface RequirementOverviewSeed {
  id: string
  stabilityLevel: string
}

export async function attachRequirementOverviewStats<T extends RequirementOverviewSeed>(requirements: T[]) {
  if (requirements.length === 0) return []

  const requirementIds = requirements.map((item) => item.id)

  const [unitCounts, openIssueCounts, blockingIssueCounts, openChangeCounts, highRiskChangeCounts] = await Promise.all([
    prisma.requirementUnit.groupBy({
      by: ['requirementId'],
      where: { requirementId: { in: requirementIds } },
      _count: { _all: true },
    }),
    prisma.issueUnit.groupBy({
      by: ['requirementId'],
      where: {
        requirementId: { in: requirementIds },
        status: { in: [...OPEN_ISSUE_STATUSES] },
      },
      _count: { _all: true },
    }),
    prisma.issueUnit.groupBy({
      by: ['requirementId'],
      where: {
        requirementId: { in: requirementIds },
        blockDev: true,
        status: { in: [...BLOCKING_ISSUE_STATUSES] },
      },
      _count: { _all: true },
    }),
    prisma.changeUnit.groupBy({
      by: ['requirementId'],
      where: {
        requirementId: { in: requirementIds },
        status: { in: [...OPEN_CHANGE_STATUSES] },
      },
      _count: { _all: true },
    }),
    prisma.changeUnit.groupBy({
      by: ['requirementId'],
      where: {
        requirementId: { in: requirementIds },
        status: { in: [...OPEN_CHANGE_STATUSES] },
        riskLevel: { in: [...HIGH_RISK_CHANGE_LEVELS] },
      },
      _count: { _all: true },
    }),
  ])

  const unitCountMap = new Map(unitCounts.map((item) => [item.requirementId, item._count._all]))
  const openIssueCountMap = new Map(openIssueCounts.map((item) => [item.requirementId, item._count._all]))
  const blockingIssueCountMap = new Map(blockingIssueCounts.map((item) => [item.requirementId, item._count._all]))
  const openChangeCountMap = new Map(openChangeCounts.map((item) => [item.requirementId, item._count._all]))
  const highRiskChangeCountMap = new Map(highRiskChangeCounts.map((item) => [item.requirementId, item._count._all]))

  return requirements.map((item) => ({
    ...item,
    requirementUnitCount: unitCountMap.get(item.id) ?? 0,
    openIssueCount: openIssueCountMap.get(item.id) ?? 0,
    blockingIssueCount: blockingIssueCountMap.get(item.id) ?? 0,
    openChangeCount: openChangeCountMap.get(item.id) ?? 0,
    highRiskChangeCount: highRiskChangeCountMap.get(item.id) ?? 0,
  }))
}

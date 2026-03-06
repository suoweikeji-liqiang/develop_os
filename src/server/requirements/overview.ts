import { prisma } from '@/server/db/client'

const OPEN_ISSUE_STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CONFIRMATION'] as const
const BLOCKING_ISSUE_STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CONFIRMATION'] as const

interface RequirementOverviewSeed {
  id: string
  stabilityLevel: string
}

export async function attachRequirementOverviewStats<T extends RequirementOverviewSeed>(requirements: T[]) {
  if (requirements.length === 0) return []

  const requirementIds = requirements.map((item) => item.id)

  const [unitCounts, openIssueCounts, blockingIssueCounts] = await Promise.all([
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
  ])

  const unitCountMap = new Map(unitCounts.map((item) => [item.requirementId, item._count._all]))
  const openIssueCountMap = new Map(openIssueCounts.map((item) => [item.requirementId, item._count._all]))
  const blockingIssueCountMap = new Map(blockingIssueCounts.map((item) => [item.requirementId, item._count._all]))

  return requirements.map((item) => ({
    ...item,
    requirementUnitCount: unitCountMap.get(item.id) ?? 0,
    openIssueCount: openIssueCountMap.get(item.id) ?? 0,
    blockingIssueCount: blockingIssueCountMap.get(item.id) ?? 0,
  }))
}

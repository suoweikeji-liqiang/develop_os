import { createHash } from 'node:crypto'
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'
import { runAgent } from '@/server/agents/registry'
import '@/server/agents'
import type { ConflictStatus, DetectedConflict } from '@/lib/schemas/conflict'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

interface RequirementSnapshot {
  id: string
  title: string
  rawInput: string
  model: FiveLayerModel
}

function buildFingerprint(conflict: DetectedConflict): string {
  return createHash('sha256')
    .update(JSON.stringify({
      scope: conflict.scope,
      relatedRequirementId: conflict.relatedRequirementId ?? null,
      title: conflict.title.trim().toLowerCase(),
      summary: conflict.summary.trim().toLowerCase(),
    }))
    .digest('hex')
}

function normalizeRequirement(row: {
  id: string
  title: string
  rawInput: string
  model: unknown
}): RequirementSnapshot | null {
  if (!row.model || typeof row.model !== 'object') return null

  return {
    id: row.id,
    title: row.title,
    rawInput: row.rawInput,
    model: row.model as FiveLayerModel,
  }
}

export async function scanRequirementConflicts(input: {
  requirementId: string
  userId: string
}) {
  const requirementRow = await prisma.requirement.findUniqueOrThrow({
    where: { id: input.requirementId },
    select: {
      id: true,
      title: true,
      rawInput: true,
      model: true,
    },
  })

  const requirement = normalizeRequirement(requirementRow)
  if (!requirement) {
    return { conflicts: [], scanned: 0 }
  }

  const relatedRows = await prisma.requirement.findMany({
    where: {
      id: { not: input.requirementId },
    },
    select: {
      id: true,
      title: true,
      rawInput: true,
      model: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 12,
  })

  const relatedRequirements = relatedRows
    .map(normalizeRequirement)
    .filter((item): item is RequirementSnapshot => item !== null)
    .slice(0, 6)

  const detection = await runAgent<
    { requirement: RequirementSnapshot; relatedRequirements: RequirementSnapshot[] },
    { conflicts: DetectedConflict[] }
  >('conflict-detector', {
    requirement,
    relatedRequirements,
  }, {
    userId: input.userId,
    requirementId: input.requirementId,
  })

  const now = new Date()
  const fingerprints = detection.conflicts.map(buildFingerprint)
  const existingConflicts = await prisma.requirementConflict.findMany({
    where: { requirementId: input.requirementId },
    select: {
      id: true,
      fingerprint: true,
      status: true,
    },
  })
  const existingMap = new Map(existingConflicts.map((conflict) => [conflict.fingerprint, conflict]))

  await prisma.$transaction(async (tx) => {
    for (const conflict of detection.conflicts) {
      const fingerprint = buildFingerprint(conflict)
      const existing = existingMap.get(fingerprint)
      const nextStatus: ConflictStatus = existing?.status === 'DISMISSED' ? 'DISMISSED' : 'OPEN'

      await tx.requirementConflict.upsert({
        where: {
          requirementId_fingerprint: {
            requirementId: input.requirementId,
            fingerprint,
          },
        },
        create: {
          requirementId: input.requirementId,
          relatedRequirementId: conflict.scope === 'CROSS_REQUIREMENT' ? conflict.relatedRequirementId : null,
          fingerprint,
          scope: conflict.scope,
          severity: conflict.severity,
          title: conflict.title,
          summary: conflict.summary,
          rationale: conflict.rationale,
          evidence: conflict.evidence,
          recommendedAction: conflict.recommendedAction,
          status: nextStatus,
          reviewedAt: nextStatus === 'DISMISSED' ? now : null,
          lastDetectedAt: now,
        },
        update: {
          relatedRequirementId: conflict.scope === 'CROSS_REQUIREMENT' ? conflict.relatedRequirementId : null,
          scope: conflict.scope,
          severity: conflict.severity,
          title: conflict.title,
          summary: conflict.summary,
          rationale: conflict.rationale,
          evidence: conflict.evidence,
          recommendedAction: conflict.recommendedAction,
          status: nextStatus,
          reviewedAt: nextStatus === 'DISMISSED' ? existing?.status === 'DISMISSED' ? now : null : null,
          resolutionNote: nextStatus === 'OPEN' ? null : undefined,
          lastDetectedAt: now,
        },
      })
    }

    await tx.requirementConflict.updateMany({
      where: {
        requirementId: input.requirementId,
        agentId: 'conflict-detector',
        status: 'OPEN',
        ...(fingerprints.length > 0
          ? { fingerprint: { notIn: fingerprints } }
          : {}),
      },
      data: {
        status: 'RESOLVED',
        resolutionNote: '最新扫描未再检测到该冲突',
        reviewedAt: now,
      },
    })
  })

  eventBus.emit('requirement.conflicts.scanned', {
    requirementId: input.requirementId,
    agentId: 'conflict-detector',
    conflictCount: detection.conflicts.length,
  })

  return {
    conflicts: detection.conflicts,
    scanned: detection.conflicts.length,
  }
}

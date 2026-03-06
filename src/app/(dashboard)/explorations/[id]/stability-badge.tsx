'use client'

import {
  STABILITY_CLASSES,
  STABILITY_LABELS,
  type RequirementStabilityLevel,
} from '@/lib/requirement-evolution'

interface Props {
  level: string | null | undefined
}

export function StabilityBadge({ level }: Props) {
  if (!level || !(level in STABILITY_LABELS)) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        Stability 未评估
      </span>
    )
  }

  const typedLevel = level as RequirementStabilityLevel

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STABILITY_CLASSES[typedLevel]}`}>
      {STABILITY_LABELS[typedLevel]}
    </span>
  )
}

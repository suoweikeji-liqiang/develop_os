'use client'

import { useState } from 'react'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/workflow/status-labels'
import { getValidTransitions } from '@/lib/workflow/status-machine'
import type { RequirementStatus } from '@/lib/workflow/status-machine'

interface Props {
  requirementId: string
  currentStatus: string
  canManageWorkflow: boolean
  onStatusChanged: (newStatus: string) => void
}

export function StatusControl({ requirementId, currentStatus, canManageWorkflow, onStatusChanged }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = currentStatus as RequirementStatus
  const validTransitions = canManageWorkflow ? getValidTransitions(status) : []

  async function handleTransition(to: RequirementStatus) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/trpc/requirement.transitionStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requirementId, to }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const message = data?.error?.message ?? '状态流转失败'
        setError(message)
        return
      }

      onStatusChanged(to)
    } catch {
      setError('状态流转失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${STATUS_COLORS[status]}`}>
        {STATUS_LABELS[status]}
      </span>

      {validTransitions.length > 0 && (
        <div className="flex items-center gap-2">
          {validTransitions.map((target) => (
            <button
              key={target}
              onClick={() => handleTransition(target)}
              disabled={loading}
              className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : `转为 ${STATUS_LABELS[target]}`}
            </button>
          ))}
        </div>
      )}

      {!canManageWorkflow && (
        <span className="text-sm text-slate-500">
          仅产品、开发、测试、UI 角色或管理员可推进状态
        </span>
      )}

      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}
    </div>
  )
}

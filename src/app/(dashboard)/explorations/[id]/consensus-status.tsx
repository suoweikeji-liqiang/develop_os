'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'
import { ROLE_VIEWS } from '@/lib/roles/role-view-config'

const REQUIRED_ROLES = ['PRODUCT', 'DEV', 'TEST', 'UI'] as const

const SHOW_STATUSES = new Set(['IN_REVIEW', 'CONSENSUS', 'IMPLEMENTING', 'DONE'])

interface Signoff {
  role: string
  userId: string
  signedAt: string
  user: { name: string | null }
}

interface Props {
  requirementId: string
  currentStatus: string
}

export function ConsensusStatus({ requirementId, currentStatus }: Props) {
  const [signoffs, setSignoffs] = useState<Signoff[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!SHOW_STATUSES.has(currentStatus)) return

    let cancelled = false

    async function loadSignoffs() {
      setLoading(true)
      try {
        const params = encodeURIComponent(JSON.stringify({ requirementId }))
        const res = await fetch(`/api/trpc/signoff.list?input=${params}`)
        const data = await res.json()
        const result = data?.result?.data?.json ?? data?.result?.data ?? []
        if (!cancelled) {
          setSignoffs(Array.isArray(result) ? result : [])
        }
      } catch {
        if (!cancelled) {
          setSignoffs([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSignoffs()

    return () => {
      cancelled = true
    }
  }, [requirementId, currentStatus])

  if (!SHOW_STATUSES.has(currentStatus)) return null

  if (loading) {
    return (
      <div className="text-sm text-gray-400 py-2">加载签字状态...</div>
    )
  }

  const signoffMap = new Map(signoffs.map((s) => [s.role, s]))

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">共识签字状态</h3>
      <div className="grid grid-cols-2 gap-3">
        {REQUIRED_ROLES.map((role) => {
          const signoff = signoffMap.get(role)
          const config = ROLE_VIEWS[role]

          return (
            <div
              key={role}
              className={`flex items-start gap-2 p-2 rounded-md ${
                signoff ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              {signoff ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className={`text-xs font-medium ${signoff ? 'text-green-800' : 'text-gray-600'}`}>
                  {config.label}
                </p>
                {signoff ? (
                  <p className="text-xs text-green-600 truncate">
                    {signoff.user.name ?? '未知用户'}
                    {' · '}
                    {new Date(signoff.signedAt).toLocaleDateString('zh-CN')}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">待签字</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

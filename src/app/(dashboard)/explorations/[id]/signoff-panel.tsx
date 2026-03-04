'use client'

import { useEffect, useRef, useState } from 'react'
import { ReviewChecklist } from './review-checklist'
import { ROLE_VIEWS } from '@/lib/roles/role-view-config'
import { ROLE_CHECKLISTS } from '@/lib/roles/role-checklist-config'

const APPLICABLE_ROLES = ['PRODUCT', 'DEV', 'TEST', 'UI'] as const
type ApplicableRole = (typeof APPLICABLE_ROLES)[number]

interface Props {
  requirementId: string
  userRoles: string[]
  currentStatus: string
  refreshToken?: number
  invalidationToken?: number
  onSignoffSubmitted?: () => void
}

interface ChecklistState {
  key: string
  label: string
  checked: boolean
}

interface RoleSectionProps {
  requirementId: string
  role: ApplicableRole
  signed: boolean
  onSigned: (role: ApplicableRole) => void
}

function defaultChecklist(role: ApplicableRole): ChecklistState[] {
  return ROLE_CHECKLISTS[role].map((item) => ({ ...item, checked: false }))
}

function RoleSignoffSection({ requirementId, role, signed, onSigned }: RoleSectionProps) {
  const [items, setItems] = useState<ChecklistState[]>(
    defaultChecklist(role)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(!signed)

  const allChecked = items.every((item) => item.checked)

  useEffect(() => {
    if (signed) {
      setExpanded(false)
      setError(null)
      return
    }

    setItems(defaultChecklist(role))
    setExpanded(true)
  }, [role, signed])

  function handleChange(key: string, checked: boolean) {
    setItems((prev) => prev.map((item) => item.key === key ? { ...item, checked } : item))
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/trpc/signoff.submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId, role, checklist: items }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const message = data?.error?.message ?? '签字提交失败'
        setError(message)
        return
      }

      onSigned(role)
    } catch {
      setError('签字提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <span className="text-sm font-medium text-gray-800">
          {ROLE_VIEWS[role].label}
        </span>
        {signed ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 rounded-full px-2 py-0.5 font-medium">
            已签字确认
          </span>
        ) : (
          <span className="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
        )}
      </button>

      {expanded && !signed && (
        <div className="px-4 py-3 space-y-4">
          <ReviewChecklist items={items} onChange={handleChange} disabled={loading} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!allChecked || loading}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '提交中...' : '提交签字'}
          </button>
        </div>
      )}
    </div>
  )
}

export function SignoffPanel({
  requirementId,
  userRoles,
  currentStatus,
  refreshToken = 0,
  invalidationToken = 0,
  onSignoffSubmitted,
}: Props) {
  const [signedRoles, setSignedRoles] = useState<ApplicableRole[]>([])
  const [syncedInvalidationToken, setSyncedInvalidationToken] = useState(invalidationToken)
  const invalidationTokenRef = useRef(invalidationToken)

  useEffect(() => {
    invalidationTokenRef.current = invalidationToken
  }, [invalidationToken])

  useEffect(() => {
    if (currentStatus !== 'IN_REVIEW') return

    let cancelled = false

    async function loadSignoffs() {
      try {
        const params = encodeURIComponent(JSON.stringify({ requirementId }))
        const res = await fetch(`/api/trpc/signoff.list?input=${params}`)
        const data = await res.json()
        const result = data?.result?.data?.json ?? data?.result?.data ?? []
        if (!cancelled) {
          const roles = Array.isArray(result)
            ? result
              .map((item) => item?.role)
              .filter((role): role is ApplicableRole => APPLICABLE_ROLES.includes(role as ApplicableRole))
            : []
          setSignedRoles(roles)
          setSyncedInvalidationToken(invalidationTokenRef.current)
        }
      } catch {
        if (!cancelled) {
          setSignedRoles([])
          setSyncedInvalidationToken(invalidationTokenRef.current)
        }
      }
    }

    void loadSignoffs()

    return () => {
      cancelled = true
    }
  }, [currentStatus, requirementId, refreshToken])

  if (currentStatus !== 'IN_REVIEW') return null

  const roles = userRoles.filter((r): r is ApplicableRole =>
    APPLICABLE_ROLES.includes(r as ApplicableRole)
  )

  if (roles.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
        您的角色无需签字确认
      </div>
    )
  }

  const visibleSignedRoles = syncedInvalidationToken < invalidationToken ? [] : signedRoles

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">角色签字确认</h3>
      {roles.map((role) => (
        <RoleSignoffSection
          key={role}
          requirementId={requirementId}
          role={role}
          signed={visibleSignedRoles.includes(role)}
          onSigned={(signedRole) => {
            setSignedRoles((prev) => prev.includes(signedRole) ? prev : [...prev, signedRole])
            setSyncedInvalidationToken(invalidationToken)
            onSignoffSubmitted?.()
          }}
        />
      ))}
    </div>
  )
}

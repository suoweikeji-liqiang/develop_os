'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight, Clock3, Sparkles, Tag } from 'lucide-react'
import { SearchFilters, type FilterState } from './search-filters'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/workflow/status-labels'
import { STABILITY_CLASSES, STABILITY_LABELS, type RequirementStabilityLevel } from '@/lib/requirement-evolution'
import type { RequirementStatus } from '@/lib/workflow/status-machine'

type RequirementItem = {
  id: string
  title: string
  rawInput: string
  status: string
  stabilityLevel: RequirementStabilityLevel
  tags: string[]
  createdBy: string
  createdAt: string | Date
  updatedAt: string | Date
  version: number
  requirementUnitCount: number
  openIssueCount: number
  blockingIssueCount: number
  openChangeCount: number
  highRiskChangeCount: number
}

type Props = {
  initialRequirements: RequirementItem[]
  initialView: 'requirements' | 'models' | 'evolution'
}

// Primary location: this client renders the Requirement list/cards.
// Legacy exploration routes now forward to this implementation.
export function RequirementsListClient({ initialRequirements, initialView }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [requirements, setRequirements] = useState(initialRequirements)
  const [loading, setLoading] = useState(false)
  const currentView = useMemo(() => {
    const view = searchParams.get('view')
    if (view === 'models' || view === 'evolution') return view
    return initialView
  }, [initialView, searchParams])

  const currentFilters = useMemo(() => ({
    query: searchParams.get('q') ?? '',
    status: searchParams.get('status') ?? '',
    stabilityLevel: searchParams.get('stability') ?? '',
    hasBlockingIssues: searchParams.get('hasBlockingIssues') === 'true',
    tags: searchParams.get('tags')?.split(',').filter(Boolean) ?? [],
    role: searchParams.get('role') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
  }), [searchParams])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const req of initialRequirements) {
      for (const tag of req.tags) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  }, [initialRequirements])

  const handleFilterChange = useCallback(async (patch: FilterState) => {
    const merged = { ...currentFilters, ...patch }

    const params = new URLSearchParams()
    const basePath = currentView === 'models'
      ? '/models'
      : currentView === 'evolution'
        ? '/evolution'
        : '/requirements'
    if (merged.query) params.set('q', merged.query)
    if (merged.status) params.set('status', merged.status)
    if (merged.stabilityLevel) params.set('stability', merged.stabilityLevel)
    if (merged.hasBlockingIssues) params.set('hasBlockingIssues', 'true')
    if (merged.tags && merged.tags.length > 0) params.set('tags', merged.tags.join(','))
    if (merged.role) params.set('role', merged.role)
    if (merged.dateFrom) params.set('dateFrom', merged.dateFrom)
    if (merged.dateTo) params.set('dateTo', merged.dateTo)

    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)

    setLoading(true)
    try {
      const input: Record<string, unknown> = {}
      if (merged.query) input.query = merged.query
      if (merged.status) input.status = merged.status
      if (merged.stabilityLevel) input.stabilityLevel = merged.stabilityLevel
      if (merged.hasBlockingIssues) input.hasBlockingIssues = true
      if (merged.tags && merged.tags.length > 0) input.tags = merged.tags
      if (merged.role) input.role = merged.role
      if (merged.dateFrom) input.dateFrom = merged.dateFrom
      if (merged.dateTo) input.dateTo = merged.dateTo

      const hasFilters = Object.keys(input).length > 0
      const url = `/api/trpc/requirement.search?input=${encodeURIComponent(
        JSON.stringify(hasFilters ? input : undefined),
      )}`

      const res = await fetch(url)
      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()
      setRequirements(data.result?.data?.json ?? [])
    } catch {
      // On error, keep current results visible
    } finally {
      setLoading(false)
    }
  }, [currentFilters, currentView, router])

  const emptyLabel = currentView === 'models'
    ? '未找到匹配的 ModelCard'
    : currentView === 'evolution'
      ? '未找到匹配的演化记录'
      : '未找到匹配的需求'

  const viewLabel = currentView === 'models'
    ? 'Model Asset'
    : currentView === 'evolution'
      ? 'Evolution'
      : 'Requirement'

  return (
    <div className="space-y-5">
      <SearchFilters
        query={currentFilters.query}
        status={currentFilters.status}
        stabilityLevel={currentFilters.stabilityLevel}
        hasBlockingIssues={currentFilters.hasBlockingIssues}
        tags={currentFilters.tags}
        role={currentFilters.role}
        dateFrom={currentFilters.dateFrom}
        dateTo={currentFilters.dateTo}
        allTags={allTags}
        onFilterChange={handleFilterChange}
      />

      <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {requirements.length === 0 ? (
          <div className="app-panel flex min-h-[280px] flex-col items-center justify-center gap-4 border-dashed p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-slate-950/5 text-slate-500">
              <Sparkles className="size-6" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-900">{emptyLabel}</p>
              <p className="text-sm text-slate-500">
                调整筛选条件，或者创建一个新的 Requirement。
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {requirements.map((req) => (
              <Link
                key={req.id}
                href={`/requirements/${req.id}`}
                className="app-panel group flex min-h-[250px] flex-col justify-between p-5 sm:p-6"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="app-chip">{viewLabel}</span>
                        <span className="app-chip">v{req.version}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STABILITY_CLASSES[req.stabilityLevel]}`}>
                          {STABILITY_LABELS[req.stabilityLevel]}
                        </span>
                      </div>
                      <h2 className="text-xl font-semibold text-slate-950">{req.title}</h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        STATUS_COLORS[req.status as RequirementStatus] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[req.status as RequirementStatus] ?? req.status}
                    </span>
                  </div>

                  <p className="line-clamp-3 text-sm leading-6 text-slate-500">{req.rawInput}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="app-chip">Units {req.requirementUnitCount}</span>
                    <span className="app-chip">Open Issues {req.openIssueCount}</span>
                    <span className={`app-chip ${req.blockingIssueCount > 0 ? 'text-red-700' : ''}`}>
                      Blocking {req.blockingIssueCount}
                    </span>
                    <span className="app-chip">Open Changes {req.openChangeCount}</span>
                    <span className={`app-chip ${req.highRiskChangeCount > 0 ? 'text-orange-700' : ''}`}>
                      High Risk {req.highRiskChangeCount}
                    </span>
                  </div>
                  {req.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {req.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full border border-cyan-200/70 bg-cyan-100/70 px-3 py-1 text-xs font-medium text-cyan-950"
                        >
                          <Tag className="size-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="size-4" />
                      {new Date(req.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                      Open
                      <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

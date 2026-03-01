'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SearchFilters, type FilterState } from './search-filters'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/workflow/status-labels'
import type { RequirementStatus } from '@/lib/workflow/status-machine'

type RequirementItem = {
  id: string
  title: string
  rawInput: string
  status: string
  tags: string[]
  createdBy: string
  createdAt: string | Date
  updatedAt: string | Date
  version: number
}

type Props = {
  initialRequirements: RequirementItem[]
}

export function RequirementsListClient({ initialRequirements }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [requirements, setRequirements] = useState(initialRequirements)
  const [loading, setLoading] = useState(false)

  const currentFilters = useMemo(() => ({
    query: searchParams.get('q') ?? '',
    status: searchParams.get('status') ?? '',
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
    if (merged.query) params.set('q', merged.query)
    if (merged.status) params.set('status', merged.status)
    if (merged.tags && merged.tags.length > 0) params.set('tags', merged.tags.join(','))
    if (merged.role) params.set('role', merged.role)
    if (merged.dateFrom) params.set('dateFrom', merged.dateFrom)
    if (merged.dateTo) params.set('dateTo', merged.dateTo)

    const qs = params.toString()
    router.push(qs ? `/requirements?${qs}` : '/requirements')

    setLoading(true)
    try {
      const input: Record<string, unknown> = {}
      if (merged.query) input.query = merged.query
      if (merged.status) input.status = merged.status
      if (merged.tags && merged.tags.length > 0) input.tags = merged.tags
      if (merged.role) input.role = merged.role
      if (merged.dateFrom) input.dateFrom = merged.dateFrom
      if (merged.dateTo) input.dateTo = merged.dateTo

      const hasFilters = Object.keys(input).length > 0
      const url = `/api/trpc/requirement.search?input=${encodeURIComponent(
        JSON.stringify({ json: hasFilters ? input : undefined })
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
  }, [currentFilters, router])

  return (
    <div className="space-y-4">
      <SearchFilters
        query={currentFilters.query}
        status={currentFilters.status}
        tags={currentFilters.tags}
        role={currentFilters.role}
        dateFrom={currentFilters.dateFrom}
        dateTo={currentFilters.dateTo}
        allTags={allTags}
        onFilterChange={handleFilterChange}
      />

      <div className={`space-y-2 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {requirements.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-gray-500">未找到匹配的需求</p>
          </div>
        ) : (
          requirements.map((req) => (
            <Link
              key={req.id}
              href={`/requirements/${req.id}`}
              className="block rounded-lg border p-4 hover:border-black transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium">{req.title}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      STATUS_COLORS[req.status as RequirementStatus] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_LABELS[req.status as RequirementStatus] ?? req.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(req.updatedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{req.rawInput}</p>
              {req.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {req.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import { useDeferredValue, useEffect, useState } from 'react'
import { STATUS_LABELS } from '@/lib/workflow/status-labels'
import type { RequirementStatus } from '@/lib/workflow/status-machine'

export type FilterState = {
  query?: string
  status?: string
  tags?: string[]
  role?: string
  dateFrom?: string
  dateTo?: string
}

const ROLE_LABELS: Record<string, string> = {
  PRODUCT: '产品',
  DEV: '开发',
  TEST: '测试',
  UI: '设计',
  EXTERNAL: '外部',
}

type SearchFiltersProps = {
  query: string
  status: string
  tags: string[]
  role: string
  dateFrom: string
  dateTo: string
  allTags: string[]
  onFilterChange: (filters: FilterState) => void
}

export function SearchFilters({
  query,
  status,
  tags,
  role,
  dateFrom,
  dateTo,
  allTags,
  onFilterChange,
}: SearchFiltersProps) {
  const [localQuery, setLocalQuery] = useState(query)
  const deferredQuery = useDeferredValue(localQuery)

  useEffect(() => {
    if (deferredQuery !== query) {
      onFilterChange({ query: deferredQuery || undefined })
    }
  }, [deferredQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="搜索需求..."
          aria-label="搜索需求"
          className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
        aria-label="按状态筛选"
        className="rounded border px-3 py-2 text-sm"
      >
        <option value="">全部状态</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={role}
        onChange={(e) => onFilterChange({ role: e.target.value || undefined })}
        aria-label="按角色筛选"
        className="rounded border px-3 py-2 text-sm"
      >
        <option value="">全部角色</option>
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {allTags.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const tag = e.target.value
            if (tag && !tags.includes(tag)) {
              onFilterChange({ tags: [...tags, tag] })
            }
          }}
          aria-label="按标签筛选"
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">添加标签筛选</option>
          {allTags
            .filter((t) => !tags.includes(t))
            .map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
        </select>
      )}

      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onFilterChange({ dateFrom: e.target.value || undefined })}
        aria-label="开始日期"
        className="rounded border px-3 py-2 text-sm"
      />

      <input
        type="date"
        value={dateTo}
        onChange={(e) => onFilterChange({ dateTo: e.target.value || undefined })}
        aria-label="结束日期"
        className="rounded border px-3 py-2 text-sm"
      />

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 w-full mt-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onFilterChange({ tags: tags.filter((t) => t !== tag) })}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
            >
              {tag}
              <span aria-hidden="true">&times;</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

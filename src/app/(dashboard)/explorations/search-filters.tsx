'use client'

import { useDeferredValue, useEffect, useState } from 'react'
import { CalendarRange, Search, SlidersHorizontal, X } from 'lucide-react'
import { STATUS_LABELS } from '@/lib/workflow/status-labels'

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
  const hasActiveFilters = Boolean(
    query || status || role || dateFrom || dateTo || tags.length > 0,
  )

  useEffect(() => {
    if (deferredQuery !== query) {
      onFilterChange({ query: deferredQuery || undefined })
    }
  }, [deferredQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="app-kicker">Filter matrix</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">筛选当前信号流</h3>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setLocalQuery('')
                onFilterChange({
                  query: undefined,
                  status: undefined,
                  tags: [],
                  role: undefined,
                  dateFrom: undefined,
                  dateTo: undefined,
                })
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/76 px-4 py-2 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:-translate-y-0.5 hover:bg-white"
            >
              <X className="size-4" />
              清空筛选
            </button>
          )}
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,0.7fr))]">
          <div className="rounded-[22px] border border-white/65 bg-white/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
              <Search className="size-3.5" />
              Search
            </div>
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="搜索标题、上下文或关键词"
              aria-label="搜索需求"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="rounded-[22px] border border-white/65 bg-white/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
              <SlidersHorizontal className="size-3.5" />
              Status
            </div>
            <select
              value={status}
              onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
              aria-label="按状态筛选"
              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
            >
              <option value="">全部状态</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[22px] border border-white/65 bg-white/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
              <SlidersHorizontal className="size-3.5" />
              Role
            </div>
            <select
              value={role}
              onChange={(e) => onFilterChange({ role: e.target.value || undefined })}
              aria-label="按角色筛选"
              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
            >
              <option value="">全部角色</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[22px] border border-white/65 bg-white/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
              <CalendarRange className="size-3.5" />
              From
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onFilterChange({ dateFrom: e.target.value || undefined })}
              aria-label="开始日期"
              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
            />
          </div>

          <div className="rounded-[22px] border border-white/65 bg-white/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
              <CalendarRange className="size-3.5" />
              To
            </div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onFilterChange({ dateTo: e.target.value || undefined })}
              aria-label="结束日期"
              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
              className="rounded-full border border-white/65 bg-white/76 px-4 py-2 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
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

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onFilterChange({ tags: tags.filter((t) => t !== tag) })}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-cyan-100/70 px-3 py-1.5 text-xs font-medium text-cyan-900"
                >
                  {tag}
                  <span aria-hidden="true">&times;</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { VersionDiffView } from './version-diff-view'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

interface VersionMeta {
  readonly id: string
  readonly version: number
  readonly changeSource: string
  readonly createdBy: string | null
  readonly createdAt: string
}

interface Props {
  requirementId: string
  currentVersion: number
  currentModel?: FiveLayerModel
}

const SOURCE_COLORS: Record<string, string> = {
  manual: 'bg-blue-100 text-blue-800',
  'ai-structure': 'bg-purple-100 text-purple-800',
  'ai-converse': 'bg-indigo-100 text-indigo-800',
  assumption: 'bg-amber-100 text-amber-800',
}

const SOURCE_LABELS: Record<string, string> = {
  manual: '手动',
  'ai-structure': 'AI结构化',
  'ai-converse': 'AI对话',
  assumption: '假设',
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}秒前`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`

  return new Date(dateStr).toLocaleDateString('zh-CN')
}

export function VersionHistory({ requirementId, currentVersion, currentModel }: Props) {
  const [versions, setVersions] = useState<readonly VersionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedA, setSelectedA] = useState<number | null>(null)
  const [selectedB, setSelectedB] = useState<number | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  const fetchVersions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/trpc/version.list?input=${encodeURIComponent(
        JSON.stringify({ json: { requirementId } })
      )}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`加载版本历史失败 (${res.status})`)
      const json = await res.json()
      const data: VersionMeta[] = json.result?.data?.json ?? []
      setVersions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载版本历史失败')
    } finally {
      setLoading(false)
    }
  }, [requirementId])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  function handleCompare() {
    if (selectedA !== null && selectedB !== null) {
      setShowDiff(true)
    }
  }

  function handleCloseCompare() {
    setShowDiff(false)
  }

  if (loading) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground animate-pulse">加载版本历史...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">暂无版本历史</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">版本历史</h3>
        <button
          onClick={handleCompare}
          disabled={selectedA === null || selectedB === null}
          className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          比较版本
        </button>
      </div>

      <VersionTimeline
        versions={versions}
        currentVersion={currentVersion}
        selectedA={selectedA}
        selectedB={selectedB}
        onSelectA={setSelectedA}
        onSelectB={setSelectedB}
      />

      {showDiff && selectedA !== null && selectedB !== null && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              v{Math.min(selectedA, selectedB)} → v{Math.max(selectedA, selectedB)}
            </p>
            <button
              onClick={handleCloseCompare}
              className="text-xs text-muted-foreground underline"
            >
              关闭对比
            </button>
          </div>
          <VersionDiffView
            requirementId={requirementId}
            versionA={selectedA}
            versionB={selectedB}
            currentVersion={currentVersion}
            currentModel={currentModel}
          />
        </div>
      )}
    </div>
  )
}

interface TimelineProps {
  versions: readonly VersionMeta[]
  currentVersion: number
  selectedA: number | null
  selectedB: number | null
  onSelectA: (v: number | null) => void
  onSelectB: (v: number | null) => void
}

function VersionTimeline({
  versions,
  currentVersion,
  selectedA,
  selectedB,
  onSelectA,
  onSelectB,
}: TimelineProps) {
  // Build entries: current version at top, then historical snapshots
  const entries = [
    { version: currentVersion, label: `v${currentVersion} (当前)`, source: '', time: '' },
    ...versions.map((v) => ({
      version: v.version,
      label: `v${v.version}`,
      source: v.changeSource,
      time: formatRelativeTime(v.createdAt),
    })),
  ]

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto">
      <div className="grid grid-cols-[40px_40px_1fr] gap-2 text-xs text-muted-foreground px-1 pb-1 border-b">
        <span>A</span>
        <span>B</span>
        <span>版本</span>
      </div>
      {entries.map((entry) => (
        <div
          key={entry.version}
          className="grid grid-cols-[40px_40px_1fr] gap-2 items-center text-sm px-1 py-1 rounded hover:bg-muted/50"
        >
          <input
            type="radio"
            name="versionA"
            checked={selectedA === entry.version}
            onChange={() => onSelectA(entry.version)}
            className="h-3 w-3"
          />
          <input
            type="radio"
            name="versionB"
            checked={selectedB === entry.version}
            onChange={() => onSelectB(entry.version)}
            className="h-3 w-3"
          />
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs">{entry.label}</span>
            {entry.source && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1 py-0 ${SOURCE_COLORS[entry.source] ?? ''}`}
              >
                {SOURCE_LABELS[entry.source] ?? entry.source}
              </Badge>
            )}
            {entry.time && (
              <span className="text-xs text-muted-foreground ml-auto truncate">
                {entry.time}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

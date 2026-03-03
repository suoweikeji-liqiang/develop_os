'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { computeStructuredDiff, type StructuredDiff, type LayerDiffEntry } from '@/lib/diff/structured-diff'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

interface Props {
  requirementId: string
  versionA: number
  versionB: number
}

const LAYER_TABS = [
  { key: 'goal', label: '目标' },
  { key: 'assumption', label: '假设' },
  { key: 'behavior', label: '行为' },
  { key: 'scenario', label: '场景' },
  { key: 'verifiability', label: '可验证性' },
] as const

type LayerKey = (typeof LAYER_TABS)[number]['key']

export function VersionDiffView({
  requirementId,
  versionA,
  versionB,
}: Props) {
  const [diff, setDiff] = useState<StructuredDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const older = Math.min(versionA, versionB)
  const newer = Math.max(versionA, versionB)

  const fetchAndDiff = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const input = { json: { requirementId, versionA: older, versionB: newer } }
      const url = `/api/trpc/version.getTwo?input=${encodeURIComponent(JSON.stringify(input))}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`加载版本数据失败 (${res.status})`)

      const json = await res.json()
      const data = json.result?.data?.json
      if (!data) throw new Error('版本数据格式错误')

      const olderModel = data.versionA.version === older
        ? data.versionA.model as FiveLayerModel
        : data.versionB.model as FiveLayerModel
      const newerModel = data.versionA.version === newer
        ? data.versionA.model as FiveLayerModel
        : data.versionB.model as FiveLayerModel

      const result = computeStructuredDiff(olderModel, newerModel)
      setDiff(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载版本数据失败')
    } finally {
      setLoading(false)
    }
  }, [requirementId, older, newer])

  useEffect(() => {
    fetchAndDiff()
  }, [fetchAndDiff])

  if (loading) {
    return <p className="text-sm text-muted-foreground animate-pulse p-2">加载对比数据...</p>
  }

  if (error) {
    return <p className="text-sm text-red-500 p-2">{error}</p>
  }

  if (!diff) return null

  const { summary } = diff

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
          +{summary.added}
        </Badge>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
          ~{summary.changed}
        </Badge>
        <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
          -{summary.removed}
        </Badge>
      </div>

      <Tabs defaultValue="goal">
        <TabsList>
          {LAYER_TABS.map(({ key, label }) => {
            const count = diff[key].length
            return (
              <TabsTrigger key={key} value={key} className="gap-1 text-xs">
                {label}
                {count > 0 && (
                  <span className="ml-1 text-[10px] bg-muted rounded-full px-1.5">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {LAYER_TABS.map(({ key }) => (
          <TabsContent key={key} value={key}>
            <LayerDiffList entries={diff[key as LayerKey]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
}

interface LayerDiffListProps {
  entries: readonly LayerDiffEntry[]
}

function LayerDiffList({ entries }: LayerDiffListProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground py-3 px-2">无变更</p>
  }

  return (
    <div className="space-y-2 py-2">
      {entries.map((entry, i) => (
        <DiffEntryCard key={`${entry.path.join('.')}-${i}`} entry={entry} />
      ))}
    </div>
  )
}

function DiffEntryCard({ entry }: { entry: LayerDiffEntry }) {
  const styles = {
    CREATE: {
      bg: 'bg-green-50 border-green-200',
      prefix: '+',
      prefixColor: 'text-green-600',
    },
    CHANGE: {
      bg: 'bg-amber-50 border-amber-200',
      prefix: '~',
      prefixColor: 'text-amber-600',
    },
    REMOVE: {
      bg: 'bg-red-50 border-red-200',
      prefix: '-',
      prefixColor: 'text-red-600',
    },
  }

  const style = styles[entry.type]

  return (
    <div className={`rounded border px-3 py-2 text-sm ${style.bg}`}>
      <div className="flex items-start gap-2">
        <span className={`font-mono font-bold ${style.prefixColor}`}>{style.prefix}</span>
        <span className="font-medium">{entry.label}</span>
      </div>

      {entry.type === 'CREATE' && entry.newValue !== undefined && (
        <p className="mt-1 ml-5 text-xs text-green-800 whitespace-pre-wrap">
          {formatValue(entry.newValue)}
        </p>
      )}

      {entry.type === 'CHANGE' && (
        <div className="mt-1 ml-5 space-y-1">
          {entry.oldValue !== undefined && (
            <p className="text-xs text-red-600 line-through whitespace-pre-wrap">
              {formatValue(entry.oldValue)}
            </p>
          )}
          {entry.newValue !== undefined && (
            <p className="text-xs text-green-700 whitespace-pre-wrap">
              {formatValue(entry.newValue)}
            </p>
          )}
        </div>
      )}

      {entry.type === 'REMOVE' && entry.oldValue !== undefined && (
        <p className="mt-1 ml-5 text-xs text-red-600 line-through whitespace-pre-wrap">
          {formatValue(entry.oldValue)}
        </p>
      )}
    </div>
  )
}

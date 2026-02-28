'use client'

import { useState, useEffect, useCallback } from 'react'
import { parsePartialJson } from '@/lib/parse-partial-json'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LayerEditor } from './layer-editor'
import { AssumptionCard } from './assumption-card'
import type { PendingAssumption } from './assumption-card'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import type { ConversationResponse } from '@/lib/schemas/conversation'

const LAYER_TABS = [
  { key: 'goal', label: '目标' },
  { key: 'assumption', label: '假设' },
  { key: 'behavior', label: '行为' },
  { key: 'scenario', label: '场景' },
  { key: 'verifiability', label: '可验证性' },
] as const

type LayerKey = (typeof LAYER_TABS)[number]['key']

interface Props {
  requirementId: string
  rawInput: string
  initialModel?: FiveLayerModel
  initialConfidence?: Record<string, number>
  mode: 'generate' | 'view'
  pendingPatches?: ConversationResponse['patches'] | null
  pendingAssumptions?: PendingAssumption[]
  onApplyPatch?: (layer: string, proposedData: unknown) => void
  onRejectPatch?: (layer: string) => void
  onAssumptionAction?: (id: string, action: { type: 'accept' | 'reject'; finalContent?: string; rejectReason?: string }) => void
}

function confidenceBadge(level?: string) {
  if (!level) return null
  const colors: Record<string, string> = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800',
  }
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  }
  return (
    <Badge variant="outline" className={colors[level] ?? ''}>
      {labels[level] ?? level}
    </Badge>
  )
}

function getLayerConfidence(model: Partial<FiveLayerModel> | null, layer: LayerKey): string | undefined {
  if (!model) return undefined
  if (layer === 'assumption') {
    const items = model.assumption?.items
    if (!items?.length) return undefined
    const counts = { high: 0, medium: 0, low: 0 }
    for (const item of items) {
      if (item.confidence) counts[item.confidence]++
    }
    if (counts.low > 0) return 'low'
    if (counts.medium > 0) return 'medium'
    return 'high'
  }
  return undefined
}

export function ModelTabs({ requirementId, rawInput, initialModel, initialConfidence, mode, pendingPatches, pendingAssumptions, onApplyPatch, onRejectPatch, onAssumptionAction }: Props) {
  const [model, setModel] = useState<Partial<FiveLayerModel> | null>(initialModel ?? null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(mode === 'view')
  const [confidence, setConfidence] = useState<Record<string, number>>(initialConfidence ?? {})

  const persistModel = useCallback(async (finalModel: FiveLayerModel) => {
    try {
      await fetch('/api/trpc/requirement.updateModel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { id: requirementId, model: finalModel } }),
      })
    } catch {
      // Silent — model is already displayed
    }
  }, [requirementId])

  // Stream AI generation on mount in generate mode
  useEffect(() => {
    if (mode !== 'generate' || completed) return

    let cancelled = false

    async function generate() {
      setStreaming(true)
      setError(null)

      try {
        const res = await fetch('/api/ai/structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawInput, requirementId }),
        })

        if (!res.ok) {
          throw new Error(`AI 生成失败 (${res.status})`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('无法读取响应流')

        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break

          accumulated += decoder.decode(value, { stream: true })

          const result = parsePartialJson(accumulated)
          if (result?.value && typeof result.value === 'object') {
            setModel(result.value as Partial<FiveLayerModel>)
          }
        }

        // Final parse
        if (!cancelled) {
          const finalResult = parsePartialJson(accumulated)
          if (finalResult?.value && typeof finalResult.value === 'object') {
            const finalModel = finalResult.value as FiveLayerModel
            setModel(finalModel)
            setCompleted(true)
            await persistModel(finalModel)
          } else {
            setError('AI 输出解析失败')
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'AI 生成失败')
        }
      } finally {
        if (!cancelled) setStreaming(false)
      }
    }

    generate()
    return () => { cancelled = true }
  }, [mode, completed, rawInput, requirementId, persistModel])

  function handleLayerUpdate(layer: LayerKey, data: unknown) {
    setModel((prev) => {
      if (!prev) return prev
      const updated = { ...prev, [layer]: data } as FiveLayerModel
      persistModel(updated)
      return updated
    })
  }

  function hasLayer(layer: LayerKey): boolean {
    return model?.[layer] !== undefined && model[layer] !== null
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {streaming && (
        <p className="text-sm text-muted-foreground animate-pulse">
          AI 正在生成结构化模型...
        </p>
      )}

      <Tabs defaultValue="goal">
        <TabsList>
          {LAYER_TABS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key} className="gap-2">
              {label}
              {pendingPatches?.[key as keyof typeof pendingPatches] && (
                <span className="ml-1 h-2 w-2 rounded-full bg-amber-400 inline-block" />
              )}
              {hasLayer(key) && confidenceBadge(
                confidence[key] !== undefined
                  ? (confidence[key] >= 0.8 ? 'high' : confidence[key] >= 0.5 ? 'medium' : 'low')
                  : getLayerConfidence(model, key)
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {LAYER_TABS.map(({ key, label }) => (
          <TabsContent key={key} value={key}>
            {key === 'assumption' && pendingAssumptions?.map(assumption => (
              <AssumptionCard
                key={assumption.id}
                assumption={assumption}
                onAction={(action) => onAssumptionAction?.(assumption.id, action)}
              />
            ))}
            {hasLayer(key) ? (
              <LayerEditor
                layerName={label}
                layerKey={key}
                data={model![key]!}
                requirementId={requirementId}
                readOnly={streaming || !!pendingPatches?.[key as keyof typeof pendingPatches]}
                pendingData={pendingPatches?.[key as keyof typeof pendingPatches] as Record<string, unknown> | undefined}
                onConfirmDiff={() => onApplyPatch?.(key, pendingPatches![key as keyof typeof pendingPatches])}
                onRejectDiff={() => onRejectPatch?.(key)}
                onUpdate={(data) => handleLayerUpdate(key, data)}
              />
            ) : (
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

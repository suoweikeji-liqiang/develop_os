'use client'

import { useState, useRef, useCallback } from 'react'
import { ModelTabs } from './model-tabs'
import { RoleViewTabs } from './role-view-tabs'
import { SignoffPanel } from './signoff-panel'
import { ConsensusStatus } from './consensus-status'
import { ChatPanel } from './chat-panel'
import { VersionHistory } from './version-history'
import { StatusControl } from './status-control'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import type { ConversationResponse } from '@/lib/schemas/conversation'
import type { UIMessage } from 'ai'
import type { PendingAssumption } from './assumption-card'

interface Props {
  requirementId: string
  title: string
  status: string
  version: number
  rawInput: string
  initialModel: FiveLayerModel | undefined
  initialConfidence: Record<string, number> | undefined
  initialMessages: UIMessage[]
  userRoles: string[]
}

export function RequirementDetailClient({
  requirementId,
  title,
  status,
  version,
  rawInput,
  initialModel,
  initialConfidence,
  initialMessages,
  userRoles,
}: Props) {
  const [currentStatus, setCurrentStatus] = useState(status)
  const [model, setModel] = useState<FiveLayerModel | undefined>(initialModel)
  const [pendingPatches, setPendingPatches] = useState<ConversationResponse['patches'] | null>(null)
  const [pendingAssumptions, setPendingAssumptions] = useState<PendingAssumption[]>([])
  const [showUndo, setShowUndo] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const previousModelRef = useRef<FiveLayerModel | null>(null)

  const handlePatchProposed = useCallback((response: ConversationResponse) => {
    if (response.patches) {
      setPendingPatches(response.patches)
    }
    if (response.newAssumptions?.length) {
      setPendingAssumptions(prev => [
        ...prev,
        ...response.newAssumptions!.map(a => ({
          id: crypto.randomUUID(),
          ...a,
        })),
      ])
    }
  }, [])

  const handleApplyPatch = useCallback(async (layer: string, proposedData: unknown) => {
    previousModelRef.current = model ?? null
    setShowUndo(true)
    const updatedModel = model ? { ...model, [layer]: proposedData } as FiveLayerModel : undefined
    setModel(updatedModel)
    if (updatedModel) {
      await fetch('/api/trpc/requirement.updateModel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { id: requirementId, model: updatedModel } }),
      })
    }
    setPendingPatches(prev => {
      if (!prev) return null
      const next = { ...prev }
      delete next[layer as keyof typeof next]
      return Object.keys(next).length === 0 ? null : next
    })
  }, [model, requirementId])

  const handleRejectPatch = useCallback((layer: string) => {
    setPendingPatches(prev => {
      if (!prev) return null
      const next = { ...prev }
      delete next[layer as keyof typeof next]
      return Object.keys(next).length === 0 ? null : next
    })
  }, [])

  function handleUndo() {
    if (previousModelRef.current) {
      setModel(previousModelRef.current)
      previousModelRef.current = null
      setShowUndo(false)
    }
  }

  const handleAssumptionAction = useCallback(async (
    id: string,
    action: { type: 'accept' | 'reject'; finalContent?: string; rejectReason?: string },
  ) => {
    if (action.type === 'accept') {
      const assumption = pendingAssumptions.find(a => a.id === id)
      if (assumption && model) {
        const currentItems = (model.assumption?.items as Array<{ content: string; confidence: string; rationale: string }>) ?? []
        const updatedModel = {
          ...model,
          assumption: {
            ...model.assumption,
            items: [...currentItems, {
              content: action.finalContent ?? assumption.content,
              confidence: assumption.confidence,
              rationale: assumption.rationale,
            }],
          },
        } as FiveLayerModel
        setModel(updatedModel)
        await fetch('/api/trpc/requirement.updateModel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json: { id: requirementId, model: updatedModel } }),
        })
      }
    }
    setPendingAssumptions(prev => prev.filter(a => a.id !== id))
  }, [model, pendingAssumptions, requirementId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="mt-1 flex items-center gap-3">
            <StatusControl
              requirementId={requirementId}
              currentStatus={currentStatus}
              onStatusChanged={setCurrentStatus}
            />
            <span className="text-sm text-muted-foreground">
              版本: v{version}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {model && (
            <button
              onClick={() => setShowVersionHistory(prev => !prev)}
              className={`text-sm px-3 py-1 rounded border ${
                showVersionHistory
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              版本历史
            </button>
          )}
          {showUndo && (
            <button onClick={handleUndo} className="text-sm text-muted-foreground underline">
              撤销上次变更
            </button>
          )}
        </div>
      </div>

      {showVersionHistory && model && (
        <VersionHistory
          requirementId={requirementId}
          currentVersion={version}
          currentModel={model}
        />
      )}

      <div className={model ? 'grid grid-cols-[1fr_380px] gap-6 items-start' : 'max-w-4xl'}>
        <div className="space-y-4">
          {model ? (
            <RoleViewTabs
              requirementId={requirementId}
              model={model}
              userRoles={userRoles}
              confidence={initialConfidence}
              pendingPatches={pendingPatches as Record<string, unknown> | null}
              pendingAssumptions={pendingAssumptions}
              readOnly={false}
              onApplyPatch={handleApplyPatch}
              onRejectPatch={handleRejectPatch}
              onAssumptionAction={handleAssumptionAction}
            />
          ) : (
            <ModelTabs
              requirementId={requirementId}
              rawInput={rawInput}
              initialModel={model}
              initialConfidence={initialConfidence}
              mode="generate"
              pendingPatches={pendingPatches}
              pendingAssumptions={pendingAssumptions}
              onApplyPatch={handleApplyPatch}
              onRejectPatch={handleRejectPatch}
              onAssumptionAction={handleAssumptionAction}
            />
          )}
          <ConsensusStatus requirementId={requirementId} currentStatus={currentStatus} />
          <SignoffPanel requirementId={requirementId} userRoles={userRoles} currentStatus={currentStatus} />
        </div>
        {model && (
          <ChatPanel
            requirementId={requirementId}
            currentModel={model}
            initialMessages={initialMessages}
            autoOpen={initialMessages.length > 0}
            onPatchProposed={handlePatchProposed}
            hasPendingDiff={pendingPatches !== null}
          />
        )}
      </div>
    </div>
  )
}

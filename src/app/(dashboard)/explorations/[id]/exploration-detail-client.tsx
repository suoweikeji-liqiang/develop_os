'use client'

import { useState, useRef, useCallback } from 'react'
import { ModelTabs } from './model-tabs'
import { RoleViewTabs } from './role-view-tabs'
import { SignoffPanel } from './signoff-panel'
import { ConsensusStatus } from './consensus-status'
import { ChatPanel } from './chat-panel'
import { VersionHistory } from './version-history'
import { StatusControl } from './status-control'
import { ConflictPanel } from './conflict-panel'
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
  initialCitations: unknown[] | undefined
  initialMessages: UIMessage[]
  userRoles: string[]
}

interface CitationItem {
  chunkId: string
  sourceName: string
  sourceType: 'document' | 'code' | 'history'
  excerpt: string
}

const MODELCARD_SECTIONS = [
  'Core Abstraction',
  'Variables / Relationships',
  'Visual Concept Map',
  'Assumptions',
  'Limitations / Boundary',
  'Contradictions',
  'Migration Attempts',
  'Evolution Timeline',
] as const

function getExplorationStage(status: string): 'open' | 'refining' | 'stabilized' {
  if (status === 'DONE') return 'stabilized'
  if (status === 'DRAFT') return 'open'
  return 'refining'
}

function getStageClasses(stage: 'open' | 'refining' | 'stabilized'): string {
  if (stage === 'open') return 'border-amber-300 bg-amber-50 text-amber-700'
  if (stage === 'stabilized') return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  return 'border-blue-300 bg-blue-50 text-blue-700'
}

export function ExplorationDetailClient({
  requirementId,
  title,
  status,
  version,
  rawInput,
  initialModel,
  initialConfidence,
  initialCitations,
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
  const citations = (initialCitations ?? []) as CitationItem[]
  const explorationStage = getExplorationStage(currentStatus)

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
        body: JSON.stringify({ id: requirementId, model: updatedModel }),
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
          body: JSON.stringify({ id: requirementId, model: updatedModel }),
        })
      }
    }
    setPendingAssumptions(prev => prev.filter(a => a.id !== id))
  }, [model, pendingAssumptions, requirementId])

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-slate-300 px-2 py-0.5 font-medium text-slate-600">
                Exploration
              </span>
              <span className={`rounded-full border px-2 py-0.5 font-medium ${getStageClasses(explorationStage)}`}>
                {explorationStage}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Context-driven dialogue and experimentation for this exploration.
            </p>
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
        <StatusControl
          requirementId={requirementId}
          currentStatus={currentStatus}
          onStatusChanged={setCurrentStatus}
        />
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Exploration Context</p>
          <p className="mt-1 max-h-40 overflow-auto text-sm text-slate-700 whitespace-pre-wrap">{rawInput}</p>
        </div>
      </section>

      {showVersionHistory && model && (
        <VersionHistory
          requirementId={requirementId}
          currentVersion={version}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start">
        <section className="space-y-4">
          <div className="rounded-md border p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Exploration Workspace
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use contextual dialogue to challenge assumptions and run iterative experiments.
            </p>
          </div>
          {model ? (
            <ChatPanel
              requirementId={requirementId}
              currentModel={model}
              initialMessages={initialMessages}
              autoOpen={initialMessages.length > 0}
              onPatchProposed={handlePatchProposed}
              hasPendingDiff={pendingPatches !== null}
            />
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              ModelCard is being generated. Dialogue is enabled after the first abstraction pass.
            </div>
          )}
          <ConflictPanel requirementId={requirementId} hasModel={Boolean(model)} />
          <ConsensusStatus requirementId={requirementId} currentStatus={currentStatus} />
          <SignoffPanel requirementId={requirementId} userRoles={userRoles} currentStatus={currentStatus} />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="space-y-4 rounded-md border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">ModelCard</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Structural abstraction asset with reusable, versioned knowledge.
                </p>
              </div>
              <div className="rounded-full border bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                v{version}
              </div>
            </div>
            <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              {MODELCARD_SECTIONS.map((section) => (
                <div key={section} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                  {section}
                </div>
              ))}
            </div>
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
          </section>

          {citations.length > 0 && (
            <section className="rounded-md border p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                ModelCard Sources
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Knowledge base sources that informed this structural abstraction:
              </p>
              <ul className="space-y-2">
                {citations.map((citation) => (
                  <li key={citation.chunkId} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{citation.sourceName}</span>
                      <span className="text-xs text-muted-foreground rounded-full border px-2 py-0.5 capitalize">
                        {citation.sourceType}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs line-clamp-2">{citation.excerpt}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

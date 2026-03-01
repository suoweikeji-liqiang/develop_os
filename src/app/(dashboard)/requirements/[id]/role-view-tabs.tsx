'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LayerEditor } from './layer-editor'
import { AssumptionCard } from './assumption-card'
import { ROLE_VIEWS } from '@/lib/roles/role-view-config'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import type { PendingAssumption } from './assumption-card'

const LAYER_LABELS: Record<string, string> = {
  goal: '目标',
  assumption: '假设',
  behavior: '行为',
  scenario: '场景',
  verifiability: '可验证性',
}

const DEFAULT_TAB_ORDER = ['goal', 'assumption', 'behavior', 'scenario', 'verifiability'] as const

const VALID_ROLES = ['PRODUCT', 'DEV', 'TEST', 'UI'] as const
type ValidRole = (typeof VALID_ROLES)[number]

interface Props {
  requirementId: string
  model: FiveLayerModel | undefined
  userRoles: string[]
  confidence?: Record<string, number>
  pendingPatches?: Record<string, unknown> | null
  pendingAssumptions?: PendingAssumption[]
  readOnly?: boolean
  onApplyPatch?: (layer: string, proposedData: unknown) => void
  onRejectPatch?: (layer: string) => void
  onAssumptionAction?: (id: string, action: { type: 'accept' | 'reject'; finalContent?: string; rejectReason?: string }) => void
}

function getApplicableRoles(userRoles: string[]): ValidRole[] {
  return userRoles.filter((r): r is ValidRole => VALID_ROLES.includes(r as ValidRole))
}

function confidenceLabel(score?: number): string | null {
  if (score === undefined) return null
  if (score >= 0.8) return '高'
  if (score >= 0.5) return '中'
  return '低'
}

function confidenceColor(score?: number): string {
  if (score === undefined) return ''
  if (score >= 0.8) return 'bg-green-100 text-green-800'
  if (score >= 0.5) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

export function RoleViewTabs({
  requirementId,
  model,
  userRoles,
  confidence,
  pendingPatches,
  pendingAssumptions,
  readOnly,
  onApplyPatch,
  onRejectPatch,
  onAssumptionAction,
}: Props) {
  const applicableRoles = getApplicableRoles(userRoles)
  const [activeRole, setActiveRole] = useState<ValidRole | null>(
    applicableRoles.length > 0 ? applicableRoles[0] : null
  )

  const roleConfig = activeRole ? ROLE_VIEWS[activeRole] : null
  const tabOrder: readonly string[] = roleConfig
    ? [...roleConfig.primaryTabs, ...roleConfig.secondaryTabs]
    : DEFAULT_TAB_ORDER

  const [activeTab, setActiveTab] = useState<string>(tabOrder[0])

  function hasLayer(key: string): boolean {
    if (!model) return false
    return model[key as keyof FiveLayerModel] !== undefined && model[key as keyof FiveLayerModel] !== null
  }

  return (
    <div className="space-y-3">
      {/* Role selector / badge */}
      <div className="flex items-center gap-2">
        {applicableRoles.length > 1 ? (
          <select
            value={activeRole ?? ''}
            onChange={(e) => {
              const role = e.target.value as ValidRole
              setActiveRole(role)
              const cfg = ROLE_VIEWS[role]
              const newOrder = [...cfg.primaryTabs, ...cfg.secondaryTabs]
              setActiveTab(newOrder[0])
            }}
            className="text-xs rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 cursor-pointer"
          >
            {applicableRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_VIEWS[role].label}
              </option>
            ))}
          </select>
        ) : roleConfig ? (
          <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium">
            {roleConfig.label}
          </span>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabOrder.map((key) => {
            const label = LAYER_LABELS[key] ?? key
            const confScore = confidence?.[key]
            const confText = confidenceLabel(confScore)
            const hasPending = pendingPatches && key in pendingPatches && pendingPatches[key] !== undefined

            return (
              <TabsTrigger key={key} value={key} className="gap-2">
                {label}
                {hasPending && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-amber-400 inline-block" />
                )}
                {hasLayer(key) && confText && (
                  <Badge variant="outline" className={confidenceColor(confScore)}>
                    {confText}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {tabOrder.map((key) => {
          const label = LAYER_LABELS[key] ?? key
          const data = model?.[key as keyof FiveLayerModel]
          const pendingData = pendingPatches?.[key] as Record<string, unknown> | undefined

          return (
            <TabsContent key={key} value={key}>
              {key === 'assumption' && pendingAssumptions?.map((assumption) => (
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
                  data={data!}
                  requirementId={requirementId}
                  readOnly={readOnly || !!pendingData}
                  pendingData={pendingData}
                  onConfirmDiff={() => onApplyPatch?.(key, pendingData)}
                  onRejectDiff={() => onRejectPatch?.(key)}
                  onUpdate={() => {}}
                />
              ) : (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

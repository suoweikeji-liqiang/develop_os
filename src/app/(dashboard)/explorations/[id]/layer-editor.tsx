'use client'

import { useEffect, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  layerName: string
  layerKey: string
  data: Record<string, unknown>
  requirementId: string
  readOnly?: boolean
  pendingData?: Record<string, unknown>
  onConfirmDiff?: () => void
  onRejectDiff?: () => void
  onUpdate: (data: Record<string, unknown>) => void
}

export function LayerEditor({ layerName, layerKey, data, readOnly, pendingData, onConfirmDiff, onRejectDiff, onUpdate }: Props) {
  const [local, setLocal] = useState(data)

  useEffect(() => {
    setLocal(data)
  }, [data])

  function update(patch: Record<string, unknown>) {
    const next = { ...local, ...patch }
    setLocal(next)
    onUpdate(next)
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <h3 className="text-lg font-semibold">{layerName}</h3>
      {pendingData && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-sm font-medium text-amber-800">AI 建议变更此层</p>
          <DiffSummary current={data as Record<string, unknown>} proposed={pendingData} />
          <div className="flex gap-2">
            <button
              onClick={onConfirmDiff}
              className="text-sm px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
            >
              接受变更
            </button>
            <button
              onClick={onRejectDiff}
              className="text-sm px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
            >
              拒绝变更
            </button>
          </div>
        </div>
      )}
      {layerKey === 'goal' && <GoalEditor data={local} readOnly={readOnly} onChange={update} />}
      {layerKey === 'assumption' && <AssumptionEditor data={local} readOnly={readOnly} onChange={update} />}
      {layerKey === 'behavior' && <BehaviorEditor data={local} readOnly={readOnly} onChange={update} />}
      {layerKey === 'scenario' && <ScenarioEditor data={local} readOnly={readOnly} onChange={update} />}
      {layerKey === 'verifiability' && <VerifiabilityEditor data={local} readOnly={readOnly} onChange={update} />}
    </div>
  )
}

interface SubEditorProps {
  data: Record<string, unknown>
  readOnly?: boolean
  onChange: (patch: Record<string, unknown>) => void
}

// --- Goal Layer ---

function GoalEditor({ data, readOnly, onChange }: SubEditorProps) {
  const summary = (data.summary as string) ?? ''
  const before = (data.before as string) ?? ''
  const after = (data.after as string) ?? ''
  const metrics = (data.metrics as string[]) ?? []

  return (
    <div className="space-y-3">
      <Field label="目标概述">
        <Textarea value={summary} readOnly={readOnly}
          onChange={(e) => onChange({ summary: e.target.value })} rows={2} />
      </Field>
      <Field label="当前状态 (Before)">
        <Textarea value={before} readOnly={readOnly}
          onChange={(e) => onChange({ before: e.target.value })} rows={2} />
      </Field>
      <Field label="期望状态 (After)">
        <Textarea value={after} readOnly={readOnly}
          onChange={(e) => onChange({ after: e.target.value })} rows={2} />
      </Field>
      <Field label="成功指标">
        {metrics.map((m, i) => (
          <Input key={i} value={m} readOnly={readOnly}
            onChange={(e) => {
              const next = [...metrics]; next[i] = e.target.value
              onChange({ metrics: next })
            }} />
        ))}
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// --- Assumption Layer ---

interface AssumptionItem {
  content: string
  confidence: string
  rationale: string
}

function AssumptionEditor({ data, readOnly, onChange }: SubEditorProps) {
  const items = (data.items as AssumptionItem[]) ?? []

  function updateItem(idx: number, patch: Partial<AssumptionItem>) {
    const next = items.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    onChange({ items: next })
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded border p-3">
          <Field label={`假设 ${i + 1}`}>
            <Textarea value={item.content} readOnly={readOnly}
              onChange={(e) => updateItem(i, { content: e.target.value })} rows={2} />
          </Field>
          <Field label="置信度">
            <select className="w-full rounded border px-3 py-2 text-sm"
              value={item.confidence} disabled={readOnly}
              onChange={(e) => updateItem(i, { confidence: e.target.value })}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </Field>
          <Field label="依据">
            <Textarea value={item.rationale} readOnly={readOnly}
              onChange={(e) => updateItem(i, { rationale: e.target.value })} rows={2} />
          </Field>
        </div>
      ))}
    </div>
  )
}

// --- Behavior Layer ---

interface ActionItem {
  actor: string
  action: string
  precondition?: string
  postcondition?: string
}

function BehaviorEditor({ data, readOnly, onChange }: SubEditorProps) {
  const actors = (data.actors as string[]) ?? []
  const actions = (data.actions as ActionItem[]) ?? []

  function updateAction(idx: number, patch: Partial<ActionItem>) {
    const next = actions.map((a, i) => (i === idx ? { ...a, ...patch } : a))
    onChange({ actions: next })
  }

  return (
    <div className="space-y-4">
      <Field label="参与者">
        {actors.map((actor, i) => (
          <Input key={i} value={actor} readOnly={readOnly}
            onChange={(e) => {
              const next = [...actors]; next[i] = e.target.value
              onChange({ actors: next })
            }} />
        ))}
      </Field>
      <div className="space-y-3">
        <Label>行为序列</Label>
        {actions.map((act, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded border p-3">
            <Field label="参与者">
              <Input value={act.actor} readOnly={readOnly}
                onChange={(e) => updateAction(i, { actor: e.target.value })} />
            </Field>
            <Field label="动作">
              <Input value={act.action} readOnly={readOnly}
                onChange={(e) => updateAction(i, { action: e.target.value })} />
            </Field>
            <Field label="前置条件">
              <Input value={act.precondition ?? ''} readOnly={readOnly}
                onChange={(e) => updateAction(i, { precondition: e.target.value })} />
            </Field>
            <Field label="后置条件">
              <Input value={act.postcondition ?? ''} readOnly={readOnly}
                onChange={(e) => updateAction(i, { postcondition: e.target.value })} />
            </Field>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Scenario Layer ---

interface NormalScenario { name: string; steps: string[] }
interface EdgeScenario { name: string; steps: string[]; trigger: string }
interface ErrorScenario { name: string; steps: string[]; recovery: string }

function ScenarioEditor({ data, readOnly, onChange }: SubEditorProps) {
  const normal = (data.normal as NormalScenario[]) ?? []
  const edge = (data.edge as EdgeScenario[]) ?? []
  const error = (data.error as ErrorScenario[]) ?? []

  return (
    <div className="space-y-6">
      <ScenarioGroup title="正常场景" scenarios={normal as unknown as Record<string, unknown>[]} readOnly={readOnly}
        extraField={null}
        onUpdate={(next) => onChange({ normal: next })} />
      <ScenarioGroup title="边界场景" scenarios={edge as unknown as Record<string, unknown>[]} readOnly={readOnly}
        extraField="trigger" extraLabel="触发条件"
        onUpdate={(next) => onChange({ edge: next })} />
      <ScenarioGroup title="异常场景" scenarios={error as unknown as Record<string, unknown>[]} readOnly={readOnly}
        extraField="recovery" extraLabel="恢复方式"
        onUpdate={(next) => onChange({ error: next })} />
    </div>
  )
}

interface ScenarioGroupProps {
  title: string
  scenarios: Array<Record<string, unknown>>
  readOnly?: boolean
  extraField: string | null
  extraLabel?: string
  onUpdate: (next: Array<Record<string, unknown>>) => void
}

function ScenarioGroup({ title, scenarios, readOnly, extraField, extraLabel, onUpdate }: ScenarioGroupProps) {
  function updateScenario(idx: number, patch: Record<string, unknown>) {
    const next = scenarios.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    onUpdate(next)
  }

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{title}</Label>
      {scenarios.map((sc, i) => (
        <div key={i} className="space-y-2 rounded border p-3">
          <Field label="场景名称">
            <Input value={(sc.name as string) ?? ''} readOnly={readOnly}
              onChange={(e) => updateScenario(i, { name: e.target.value })} />
          </Field>
          <Field label="步骤">
            {((sc.steps as string[]) ?? []).map((step, si) => (
              <Input key={si} value={step} readOnly={readOnly}
                onChange={(e) => {
                  const steps = [...((sc.steps as string[]) ?? [])]
                  steps[si] = e.target.value
                  updateScenario(i, { steps })
                }} />
            ))}
          </Field>
          {extraField && extraLabel && (
            <Field label={extraLabel}>
              <Input value={(sc[extraField] as string) ?? ''} readOnly={readOnly}
                onChange={(e) => updateScenario(i, { [extraField]: e.target.value })} />
            </Field>
          )}
        </div>
      ))}
    </div>
  )
}

// --- Verifiability Layer ---

interface AutoCriterion { criterion: string; method: string }
interface ManualCriterion { criterion: string; reason: string }

function VerifiabilityEditor({ data, readOnly, onChange }: SubEditorProps) {
  const automated = (data.automated as AutoCriterion[]) ?? []
  const manual = (data.manual as ManualCriterion[]) ?? []

  function updateAuto(idx: number, patch: Partial<AutoCriterion>) {
    const next = automated.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    onChange({ automated: next })
  }

  function updateManual(idx: number, patch: Partial<ManualCriterion>) {
    const next = manual.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    onChange({ manual: next })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-medium">自动化验证</Label>
        {automated.map((c, i) => (
          <div key={i} className="space-y-2 rounded border p-3">
            <Field label="验证标准">
              <Input value={c.criterion} readOnly={readOnly}
                onChange={(e) => updateAuto(i, { criterion: e.target.value })} />
            </Field>
            <Field label="验证方法">
              <Input value={c.method} readOnly={readOnly}
                onChange={(e) => updateAuto(i, { method: e.target.value })} />
            </Field>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Label className="text-base font-medium">人工验证</Label>
        {manual.map((c, i) => (
          <div key={i} className="space-y-2 rounded border p-3">
            <Field label="验证标准">
              <Input value={c.criterion} readOnly={readOnly}
                onChange={(e) => updateManual(i, { criterion: e.target.value })} />
            </Field>
            <Field label="原因">
              <Input value={c.reason} readOnly={readOnly}
                onChange={(e) => updateManual(i, { reason: e.target.value })} />
            </Field>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Diff Helpers ---

function DiffSummary({ current, proposed }: { current: Record<string, unknown>; proposed: Record<string, unknown> }) {
  const allKeys = new Set([...Object.keys(current), ...Object.keys(proposed)])
  const changedKeys = [...allKeys].filter(k => JSON.stringify(current[k]) !== JSON.stringify(proposed[k]))

  if (changedKeys.length === 0) return <p className="text-sm text-muted-foreground">无变更</p>

  return (
    <div className="space-y-1">
      {changedKeys.map(key => (
        <DiffField key={key} fieldName={key} current={current[key]} proposed={proposed[key]} />
      ))}
    </div>
  )
}

function DiffField({ fieldName, current, proposed }: { fieldName: string; current: unknown; proposed: unknown }) {
  const currentStr = typeof current === 'string' ? current : JSON.stringify(current)
  const proposedStr = typeof proposed === 'string' ? proposed : JSON.stringify(proposed)

  return (
    <div className="text-xs space-y-0.5">
      <span className="font-medium text-muted-foreground">{fieldName}: </span>
      {current !== undefined && (
        <span className="bg-red-100 line-through text-red-700 px-1 rounded">{currentStr}</span>
      )}
      {' \u2192 '}
      {proposed !== undefined && (
        <span className="bg-green-100 text-green-700 px-1 rounded">{proposedStr}</span>
      )}
    </div>
  )
}

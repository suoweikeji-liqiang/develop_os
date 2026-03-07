'use client'

// Primary location: Requirement verification assets now live under `requirements/[id]`.

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TestCaseSuite } from '@/lib/schemas/test-case'
import { buildTestCaseCsv, buildTestCaseMarkdown } from '@/lib/test-cases/export'

interface StoredSuite {
  id: string
  sourceRequirementVersion: number
  suite: TestCaseSuite
  generatedBy: string
  createdAt: string
}

interface ListResult {
  currentRequirementVersion: number
  items: StoredSuite[]
}

interface Props {
  requirementId: string
  requirementTitle: string
  hasModel: boolean
}

const TYPE_LABELS: Record<string, string> = {
  functional: '主流程',
  edge: '边界',
  error: '异常',
  permission: '权限',
  integration: '集成',
  manual: '人工',
}

const PRIORITY_CLASSES: Record<string, string> = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-amber-100 text-amber-800',
  P2: 'bg-slate-100 text-slate-700',
}

function formatCreatedAt(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function slugifyTitle(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'requirement'
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function TestCasePanel({ requirementId, requirementTitle, hasModel }: Props) {
  const [currentRequirementVersion, setCurrentRequirementVersion] = useState<number | null>(null)
  const [suites, setSuites] = useState<StoredSuite[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(hasModel)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSuites = useCallback(async () => {
    if (!hasModel) {
      setSuites([])
      setCurrentRequirementVersion(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const res = await fetch(`/api/trpc/testCase.list?input=${input}`)
      const data = await res.json()
      const payload = (data?.result?.data?.json ?? data?.result?.data ?? null) as ListResult | null

      if (!payload) {
        setSuites([])
        setCurrentRequirementVersion(null)
        return
      }

      setCurrentRequirementVersion(payload.currentRequirementVersion)
      setSuites(payload.items ?? [])
      setSelectedId((prev) => {
        if (prev && payload.items.some((item) => item.id === prev)) return prev
        return payload.items[0]?.id ?? null
      })
    } catch {
      setError('加载测试用例资产失败')
    } finally {
      setLoading(false)
    }
  }, [hasModel, requirementId])

  useEffect(() => {
    void loadSuites()
  }, [loadSuites])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/trpc/testCase.generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error?.message ?? '生成测试用例失败')
      }

      await loadSuites()
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成测试用例失败')
    } finally {
      setGenerating(false)
    }
  }

  const activeSuite = useMemo(() => {
    if (selectedId) {
      return suites.find((item) => item.id === selectedId) ?? suites[0] ?? null
    }

    return suites[0] ?? null
  }, [selectedId, suites])

  const stats = useMemo(() => {
    const cases = activeSuite?.suite.cases ?? []
    return {
      total: cases.length,
      automated: cases.filter((item) => item.automationCandidate).length,
      manual: cases.filter((item) => !item.automationCandidate).length,
    }
  }, [activeSuite])

  const isStale = Boolean(
    activeSuite
    && currentRequirementVersion !== null
    && activeSuite.sourceRequirementVersion < currentRequirementVersion,
  )

  function handleExportMarkdown() {
    if (!activeSuite) return

    const content = buildTestCaseMarkdown({
      requirementTitle,
      sourceRequirementVersion: activeSuite.sourceRequirementVersion,
      currentRequirementVersion,
      createdAt: activeSuite.createdAt,
      suite: activeSuite.suite,
    })

    triggerDownload(
      `${slugifyTitle(requirementTitle)}-test-cases-v${activeSuite.sourceRequirementVersion}.md`,
      content,
      'text/markdown;charset=utf-8',
    )
  }

  function handleExportCsv() {
    if (!activeSuite) return

    const content = buildTestCaseCsv({
      requirementTitle,
      sourceRequirementVersion: activeSuite.sourceRequirementVersion,
      currentRequirementVersion,
      createdAt: activeSuite.createdAt,
      suite: activeSuite.suite,
    })

    triggerDownload(
      `${slugifyTitle(requirementTitle)}-test-cases-v${activeSuite.sourceRequirementVersion}.csv`,
      content,
      'text/csv;charset=utf-8',
    )
  }

  return (
    <section className="app-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">AI Test Cases</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            从当前 ModelCard 自动生成可执行的测试用例资产，覆盖主流程、边界、异常与人工验收点。
          </p>
        </div>
        <button
          onClick={() => void handleGenerate()}
          disabled={!hasModel || generating}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? '生成中...' : suites.length > 0 ? '重新生成' : '生成测试用例'}
        </button>
      </div>

      {!hasModel && (
        <p className="mt-4 text-sm text-slate-500">
          先生成并完善 ModelCard，再生成测试用例资产。
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">加载测试用例资产...</p>
      ) : null}

      {!loading && hasModel && suites.length === 0 && !error && (
        <div className="mt-4 rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
          当前还没有生成过测试用例。建议在需求进入评审前先生成一版，作为测试和开发的共同基线。
        </div>
      )}

      {!loading && activeSuite && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportMarkdown}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              导出 Markdown
            </button>
            <button
              onClick={handleExportCsv}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              导出 CSV
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="app-chip">当前需求版本 v{currentRequirementVersion ?? activeSuite.sourceRequirementVersion}</span>
            <span className="app-chip">用例基于 v{activeSuite.sourceRequirementVersion}</span>
            <span className={`rounded-full px-3 py-1 font-medium ${isStale ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
              {isStale ? '需要刷新' : '已对齐'}
            </span>
            <span className="app-chip">{formatCreatedAt(activeSuite.createdAt)}</span>
          </div>

          {suites.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {suites.map((suite) => (
                <button
                  key={suite.id}
                  onClick={() => setSelectedId(suite.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    suite.id === activeSuite.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  v{suite.sourceRequirementVersion} · {formatCreatedAt(suite.createdAt)}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Cases</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.total}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Automation</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.automated}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Manual</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.manual}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-sm font-medium text-slate-900">{activeSuite.suite.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeSuite.suite.coverageFocus.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                  {item}
                </span>
              ))}
            </div>
            {activeSuite.suite.risks.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Risks</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {activeSuite.suite.risks.map((item) => (
                    <li key={item} className="rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {activeSuite.suite.cases.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_CLASSES[item.priority] ?? PRIORITY_CLASSES.P2}`}>
                    {item.priority}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    {TYPE_LABELS[item.type] ?? item.type}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${item.automationCandidate ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {item.automationCandidate ? '可自动化' : '人工判断'}
                  </span>
                  <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
                    {item.id}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-base font-semibold text-slate-950">{item.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.objective}</p>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Preconditions</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {item.preconditions.map((precondition) => (
                        <li key={precondition} className="rounded-[16px] bg-slate-50 px-3 py-2">
                          {precondition}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Steps</p>
                    <ol className="mt-2 space-y-2 text-sm text-slate-600">
                      {item.steps.map((step, index) => (
                        <li key={`${item.id}-step-${index}`} className="rounded-[16px] bg-slate-50 px-3 py-2">
                          {index + 1}. {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Expected</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {item.expectedResults.map((result, index) => (
                        <li key={`${item.id}-result-${index}`} className="rounded-[16px] bg-slate-50 px-3 py-2">
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.relatedLayers.map((layer) => (
                    <span key={`${item.id}-${layer}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">
                      {layer}
                    </span>
                  ))}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Traceability</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.sourceSignals.map((signal) => (
                      <span key={`${item.id}-${signal}`} className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800">
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

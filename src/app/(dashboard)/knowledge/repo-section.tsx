'use client'

import { useCallback, useEffect, useState } from 'react'
import { Github, RefreshCcw, Shield, Trash2, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type RepositoryItem = {
  id: string
  owner: string
  repo: string
  lastSyncedAt: string | null
  createdAt: string
}

function parseTrpcJson<T>(payload: unknown): T {
  if (Array.isArray(payload)) {
    const first = payload[0] as { result?: { data?: { json?: T } } } | undefined
    return first?.result?.data?.json as T
  }

  const result = payload as { result?: { data?: { json?: T } } }
  return result.result?.data?.json as T
}

function parseTrpcError(payload: unknown, fallback: string): string {
  const result = payload as { error?: { message?: string; json?: { message?: string } } }
  return result.error?.message ?? result.error?.json?.message ?? fallback
}

export function RepoSection() {
  const [repositories, setRepositories] = useState<RepositoryItem[]>([])
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadRepositories = useCallback(async () => {
    const response = await fetch('/api/trpc/codeRepository.list')
    if (!response.ok) {
      throw new Error('Failed to load repositories')
    }
    const json = await response.json()
    setRepositories(parseTrpcJson<RepositoryItem[]>(json) ?? [])
  }, [])

  useEffect(() => {
    void loadRepositories().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    })
  }, [loadRepositories])

  async function handleConnect() {
    if (!owner.trim() || !repo.trim() || !githubToken.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/trpc/codeRepository.add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: owner.trim(),
          repo: repo.trim(),
          githubToken: githubToken.trim(),
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(parseTrpcError(body, 'Failed to connect repository'))
      }

      setOwner('')
      setRepo('')
      setGithubToken('')
      await loadRepositories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect repository')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSync(id: string) {
    setError(null)
    setSyncingId(id)
    try {
      const response = await fetch('/api/trpc/codeRepository.sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(parseTrpcError(body, 'Sync failed'))
      }
      await loadRepositories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncingId(null)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    const response = await fetch('/api/trpc/codeRepository.delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(parseTrpcError(body, 'Delete failed'))
      return
    }

    await loadRepositories()
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="app-panel space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <p className="app-kicker">Repository sync</p>
          <h2 className="text-2xl font-semibold text-slate-950">连接代码仓库</h2>
          <p className="text-sm leading-6 text-slate-500">
            将仓库内容接入上下文层，帮助 AI 理解已有代码结构、边界和命名约定。
          </p>
        </div>

        <div className="grid gap-3">
          <Input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Owner"
          />
          <Input
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            placeholder="Repository"
          />
          <Input
            value={githubToken}
            onChange={(event) => setGithubToken(event.target.value)}
            placeholder="GitHub Token"
            type="password"
          />
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
            <Shield className="size-4 text-primary" />
            Security note
          </div>
          <p className="text-sm leading-6 text-slate-500">
            Token 会在入库前加密，私有仓需要 `repo` 权限，公共仓使用 `public_repo` 即可。
          </p>
        </div>

        {error && (
          <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => void handleConnect()}
            disabled={submitting || !owner.trim() || !repo.trim() || !githubToken.trim()}
          >
            <Github className="size-4" />
            {submitting ? 'Connecting...' : 'Connect Repository'}
          </Button>
        </div>
      </div>

      <div className="app-panel p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="app-kicker">Code memory</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Repositories</h2>
          </div>
          <span className="app-chip">{repositories.length} repos</span>
        </div>

        {repositories.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-950/5 text-slate-500">
              <Workflow className="size-6" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">尚未接入仓库</p>
            <p className="mt-2 text-sm text-slate-500">
              连接第一个代码仓后，系统会把可解析文件纳入知识检索链。
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {repositories.map((repository) => (
              <li
                key={repository.id}
                className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-slate-950">
                      {repository.owner}/{repository.repo}
                    </p>
                    <p className="text-sm text-slate-500">
                      Last synced: {repository.lastSyncedAt ? new Date(repository.lastSyncedAt).toLocaleString() : 'Never'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSync(repository.id)}
                      disabled={syncingId === repository.id}
                    >
                      <RefreshCcw className="size-3.5" />
                      {syncingId === repository.id ? 'Syncing...' : 'Sync'}
                    </Button>
                    <button
                      onClick={() => void handleDelete(repository.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

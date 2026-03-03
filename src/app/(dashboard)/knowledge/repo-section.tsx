'use client'

import { useCallback, useEffect, useState } from 'react'

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
    <section className="rounded-lg border p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold">Repositories</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Connect a GitHub repository to give AI code context.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
          placeholder="Owner"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          value={repo}
          onChange={(event) => setRepo(event.target.value)}
          placeholder="Repository"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          value={githubToken}
          onChange={(event) => setGithubToken(event.target.value)}
          placeholder="GitHub Token"
          type="password"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Your token is encrypted before storage. Required scope: repo (private) or public_repo (public).
        </p>
        <button
          onClick={() => void handleConnect()}
          disabled={submitting || !owner.trim() || !repo.trim() || !githubToken.trim()}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? 'Connecting...' : 'Connect Repository'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {repositories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No repositories connected. Connect a GitHub repository to give AI code context.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {repositories.map((repository) => (
            <li key={repository.id} className="flex items-center justify-between gap-4 p-3">
              <div>
                <p className="text-sm font-medium">{repository.owner}/{repository.repo}</p>
                <p className="text-xs text-muted-foreground">
                  Last synced: {repository.lastSyncedAt ? new Date(repository.lastSyncedAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleSync(repository.id)}
                  disabled={syncingId === repository.id}
                  className="rounded border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
                >
                  {syncingId === repository.id ? 'Syncing...' : 'Sync'}
                </button>
                <button
                  onClick={() => void handleDelete(repository.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

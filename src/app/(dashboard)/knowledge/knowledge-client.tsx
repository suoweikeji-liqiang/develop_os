'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type KnowledgeDocumentItem = {
  id: string
  name: string
  status: 'PROCESSING' | 'READY' | 'ERROR' | string
  chunkCount: number | null
  createdAt: string
}

const statusStyles: Record<string, string> = {
  PROCESSING: 'bg-amber-100 text-amber-800',
  READY: 'bg-emerald-100 text-emerald-800',
  ERROR: 'bg-rose-100 text-rose-800',
}

function parseTrpcJson<T>(payload: unknown): T {
  const result = payload as { result?: { data?: { json?: T } } }
  return result.result?.data?.json as T
}

export function KnowledgeClient() {
  const [documents, setDocuments] = useState<KnowledgeDocumentItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasProcessing = useMemo(
    () => documents.some((doc) => doc.status === 'PROCESSING'),
    [documents],
  )

  const loadDocuments = useCallback(async () => {
    const response = await fetch('/api/trpc/knowledgeDocument.list')
    if (!response.ok) {
      throw new Error('Failed to load documents')
    }

    const json = await response.json()
    setDocuments(parseTrpcJson<KnowledgeDocumentItem[]>(json) ?? [])
  }, [])

  useEffect(() => {
    void loadDocuments().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    })
  }, [loadDocuments])

  useEffect(() => {
    if (!hasProcessing) return

    const timer = setInterval(() => {
      void loadDocuments().catch(() => {})
    }, 3000)

    return () => clearInterval(timer)
  }, [hasProcessing, loadDocuments])

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(typeof body.error === 'string' ? body.error : 'Upload failed')
      }

      setSelectedFile(null)
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    const response = await fetch('/api/trpc/knowledgeDocument.delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { id } }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(typeof body.error === 'string' ? body.error : 'Delete failed')
      return
    }

    await loadDocuments()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".pdf,.txt,.md"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            className="block w-full max-w-sm text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm"
          />
          <button
            onClick={() => void handleUpload()}
            disabled={!selectedFile || uploading}
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Supported formats: .pdf .txt .md (max 10MB)</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Documents</h2>
        </div>
        {documents.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No documents uploaded yet. Upload a PDF or text file to give AI background context.
          </p>
        ) : (
          <ul className="divide-y">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{document.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(document.createdAt).toLocaleString()} {document.chunkCount ? `· ${document.chunkCount} chunks` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[document.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {document.status}
                  </span>
                  <button
                    onClick={() => void handleDelete(document.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

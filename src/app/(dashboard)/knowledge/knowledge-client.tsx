'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock3, FileText, Sparkles, Trash2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type KnowledgeDocumentItem = {
  id: string
  name: string
  status: 'PROCESSING' | 'READY' | 'ERROR' | string
  chunkCount: number | null
  createdAt: string
}

const statusStyles: Record<string, string> = {
  PROCESSING: 'border-amber-200/80 bg-amber-100/80 text-amber-900',
  READY: 'border-emerald-200/80 bg-emerald-100/80 text-emerald-900',
  ERROR: 'border-rose-200/80 bg-rose-100/80 text-rose-900',
}

function parseTrpcJson<T>(payload: unknown): T {
  if (Array.isArray(payload)) {
    const first = payload[0] as { result?: { data?: { json?: T } } } | undefined
    return first?.result?.data?.json as T
  }

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
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(typeof body.error === 'string' ? body.error : 'Delete failed')
      return
    }

    await loadDocuments()
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="app-panel space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <p className="app-kicker">Document ingest</p>
          <h2 className="text-2xl font-semibold text-slate-950">上传上下文文档</h2>
          <p className="text-sm leading-6 text-slate-500">
            文档会被切分、嵌入并进入知识检索链路，供结构化建模与后续修正参考。
          </p>
        </div>

        <div className="rounded-[24px] border border-white/65 bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
          <Input
            type="file"
            accept=".pdf,.txt,.md"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-sm text-slate-500">
              <p>支持 `.pdf` / `.txt` / `.md`，单文件最大 10MB。</p>
              {selectedFile && (
                <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-cyan-100/70 px-3 py-1 text-xs font-medium text-cyan-950">
                  <FileText className="size-3.5" />
                  {selectedFile.name}
                </p>
              )}
            </div>
            <Button
              onClick={() => void handleUpload()}
              disabled={!selectedFile || uploading}
            >
              <UploadCloud className="size-4" />
              {uploading ? 'Uploading...' : 'Upload context'}
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        )}
      </div>

      <div className="app-panel p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="app-kicker">Stored corpus</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Documents</h2>
          </div>
          <span className="app-chip">{documents.length} files</span>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-950/5 text-slate-500">
              <Sparkles className="size-6" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">还没有知识文档</p>
            <p className="mt-2 text-sm text-slate-500">
              上传第一份文档，开始为 AI 建立长期上下文记忆。
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {documents.map((document) => (
              <li
                key={document.id}
                className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <p className="truncate text-base font-semibold text-slate-950">{document.name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        {new Date(document.createdAt).toLocaleString()}
                      </span>
                      {document.chunkCount ? <span>{document.chunkCount} chunks</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[document.status] ?? 'border-slate-200 bg-white text-slate-700'}`}>
                      {document.status}
                    </span>
                    <button
                      onClick={() => void handleDelete(document.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
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

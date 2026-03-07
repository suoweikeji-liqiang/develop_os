'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileUp, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDraftAutosave, clearDraft } from '@/lib/hooks/use-draft-autosave'

// Primary location: this form now owns the Requirement intake flow.
// Legacy exploration entry points forward here.
export function RequirementForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [rawInput, setRawInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Generate stable draft ID per browser session
  const [draftId] = useState(() => {
    if (typeof window !== 'undefined') {
      const existing = sessionStorage.getItem('devos-current-draft-id')
      if (existing) return existing
      const id = crypto.randomUUID?.() ?? String(Date.now())
      sessionStorage.setItem('devos-current-draft-id', id)
      return id
    }
    return String(Date.now())
  })

  const { savedValue, lastSaved } = useDraftAutosave(draftId, rawInput)

  // Restore saved draft on mount
  useEffect(() => {
    if (savedValue && !rawInput) {
      setRawInput(savedValue)
    }
  }, [savedValue]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setRawInput(text)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !rawInput.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/trpc/requirement.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), rawInput: rawInput.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error?.message ?? '创建失败')
      }

      const data = await res.json()
      const requirementId = data.result?.data?.json?.id ?? data.result?.data?.id

      if (!requirementId) throw new Error('未获取到需求 ID')

      clearDraft(draftId)
      sessionStorage.removeItem('devos-current-draft-id')
      router.push(`/requirements/${requirementId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
      setSubmitting(false)
    }
  }

  return (
    <div className="app-panel p-5 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="rounded-[1.1rem] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Requirement 标题</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：高并发下的用户注册与登录路径"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rawInput">情境描述</Label>
              <Textarea
                id="rawInput"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={"请输入本次需求的上下文、限制和目标...\n\n例如：在移动端网络抖动下，用户通过手机号注册账号，注册后自动登录，首次登录需要完善个人信息。"}
                rows={14}
                className="resize-y"
                required
              />
              {lastSaved && (
                <p className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Save className="size-3.5" />
                  草稿已自动保存 ({new Date(lastSaved).toLocaleTimeString()})
                </p>
              )}
            </div>
          </div>

          <aside className="rounded-[24px] border border-slate-200/80 bg-slate-950 px-4 py-5 text-white">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/45">Requirement hints</p>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-white/68">
              <li>说明业务目标、触发场景和约束条件。</li>
              <li>如果有边界条件、风险点，尽量在原始上下文里一次讲清楚。</li>
              <li>复杂场景可以先从文档导入，再逐步补充人工说明。</li>
            </ul>
          </aside>
        </div>

        <div className="rounded-[24px] border border-white/65 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-800">
            <FileUp className="size-4" />
            导入草稿文件
          </div>
          <Input
            id="file"
            ref={fileRef}
            type="file"
            accept=".txt,.md"
            onChange={handleFileUpload}
          />
          <p className="mt-3 text-xs text-slate-500">
            支持 `.txt` 和 `.md`。上传后内容会直接填入情境描述。
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            提交后会创建 Requirement，并进入统一的需求推进工作面。
          </p>
          <Button type="submit" disabled={submitting || !title.trim() || !rawInput.trim()}>
            {submitting ? '提交中...' : '创建 Requirement'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDraftAutosave, clearDraft } from '@/lib/hooks/use-draft-autosave'

export function ExplorationForm() {
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
        body: JSON.stringify({ json: { title: title.trim(), rawInput: rawInput.trim() } }),
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
      router.push(`/explorations/${requirementId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Exploration 标题</Label>
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
          placeholder={"请输入本次探索的上下文、限制和目标...\n\n例如：在移动端网络抖动下，用户通过手机号注册账号，注册后自动登录，首次登录需要完善个人信息。"}
          rows={12}
          className="resize-y"
          required
        />
        {lastSaved && (
          <p className="text-xs text-muted-foreground">
            草稿已自动保存 ({new Date(lastSaved).toLocaleTimeString()})
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">上传文件 (.txt / .md)</Label>
        <Input
          id="file"
          ref={fileRef}
          type="file"
          accept=".txt,.md"
          onChange={handleFileUpload}
        />
      </div>

      <Button type="submit" disabled={submitting || !title.trim() || !rawInput.trim()}>
        {submitting ? '提交中...' : '生成 ModelCard'}
      </Button>
    </form>
  )
}

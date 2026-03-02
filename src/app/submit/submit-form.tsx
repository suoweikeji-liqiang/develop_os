'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Copy, ExternalLink } from 'lucide-react'

type FormState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'success'; token: string; statusUrl: string }
  | { phase: 'error'; message: string }

export function SubmitForm() {
  const [state, setState] = useState<FormState>({ phase: 'idle' })
  const [copied, setCopied] = useState(false)

  // Field state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitterName, setSubmitterName] = useState('')
  const [submitterContact, setSubmitterContact] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState({ phase: 'submitting' })

    try {
      const res = await fetch('/api/trpc/external.submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: {
            title: title.trim(),
            description: description.trim(),
            submitterName: submitterName.trim(),
            submitterContact: submitterContact.trim() || undefined,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        const message = data?.error?.message ?? data?.error?.json?.message ?? '提交失败，请稍后重试'
        setState({ phase: 'error', message })
        return
      }

      const token: string = data?.result?.data?.json?.token
      if (!token) {
        setState({ phase: 'error', message: '提交失败：未获取到跟踪码' })
        return
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      setState({ phase: 'success', token, statusUrl: `${origin}/submit/status/${token}` })
    } catch {
      setState({ phase: 'error', message: '网络错误，请稍后重试' })
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state.phase === 'success') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-semibold">需求已提交成功</span>
        </div>

        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">
            请保存以下跟踪链接，关闭页面后将无法找回。
          </p>

          <div className="space-y-2">
            <p className="text-xs text-gray-500">您的跟踪链接：</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white border px-3 py-2 text-sm break-all">
                {state.statusUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(state.statusUrl)}
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
          </div>

          <a
            href={state.statusUrl}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            查看处理进度
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {state.phase === 'error' && (
        <p className="text-sm text-red-500">{state.message}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="submitterName">您的姓名 *</Label>
        <Input
          id="submitterName"
          value={submitterName}
          onChange={(e) => setSubmitterName(e.target.value)}
          placeholder="请输入姓名或部门名称"
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="submitterContact">联系方式（可选）</Label>
        <Input
          id="submitterContact"
          value={submitterContact}
          onChange={(e) => setSubmitterContact(e.target.value)}
          placeholder="邮箱地址，用于接收确认邮件"
          type="email"
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">需求标题 *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：采购审批流程优化"
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">需求描述 *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="请描述您的需求，包括背景、期望效果、以及任何约束条件..."
          rows={8}
          className="resize-y"
          required
          minLength={10}
          maxLength={5000}
        />
        <p className="text-xs text-gray-400">{description.length}/5000</p>
      </div>

      <Button
        type="submit"
        disabled={state.phase === 'submitting' || !title.trim() || !description.trim() || !submitterName.trim()}
        className="w-full"
      >
        {state.phase === 'submitting' ? '提交中...' : '提交需求'}
      </Button>
    </form>
  )
}

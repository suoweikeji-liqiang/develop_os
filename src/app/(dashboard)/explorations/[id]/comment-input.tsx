'use client'

import { MentionsInput, Mention } from 'react-mentions'
import { useState } from 'react'
import { MessageSquarePlus, SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  requirementId: string
  onSubmitted: () => void
}

function inputStyles(disabled: boolean) {
  return {
    control: {
      minHeight: 140,
      fontSize: 14,
      borderRadius: 22,
      border: '1px solid rgba(203, 213, 225, 0.8)',
      background: 'rgba(255,255,255,0.78)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
      backdropFilter: 'blur(10px)',
      opacity: disabled ? 0.7 : 1,
    },
    highlighter: {
      minHeight: 140,
      padding: '16px 18px',
      borderRadius: 22,
    },
    input: {
      minHeight: 140,
      padding: '16px 18px',
      outline: 'none',
      color: '#0f172a',
    },
    suggestions: {
      list: {
        backgroundColor: 'rgba(255,255,255,0.96)',
        border: '1px solid rgba(203, 213, 225, 0.8)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
      },
      item: {
        padding: '10px 14px',
        fontSize: 13,
        color: '#334155',
      },
    },
  }
}

export function CommentInput({ requirementId, onSubmitted }: Props) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function fetchUsers(query: string, callback: (data: { id: string; display: string }[]) => void) {
    if (!query) {
      callback([])
      return
    }
    const res = await fetch(
      `/api/trpc/user.search?input=${encodeURIComponent(JSON.stringify({ query }))}`,
    )
    const data = await res.json()
    const users: { id: string; name: string }[] = data.result?.data?.json ?? []
    callback(users.map((user) => ({ id: user.id, display: user.name })))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/trpc/comment.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId, content: value.trim() }),
      })
      setValue('')
      onSubmitted()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquarePlus className="size-4 text-primary" />
            记录新的观察
          </div>
          <p className="text-xs text-slate-500">支持 `@` 提及协作成员，保留关键实验结论与判断。</p>
        </div>
        <Button
          type="submit"
          disabled={!value.trim() || submitting}
          size="sm"
        >
          <SendHorizontal className="size-4" />
          {submitting ? '提交中...' : '提交评论'}
        </Button>
      </div>

      <MentionsInput
        value={value}
        onChange={(_event, nextValue) => setValue(nextValue)}
        placeholder="添加评论、风险提示或实验观察... 使用 @ 提及成员"
        style={inputStyles(submitting)}
        disabled={submitting}
      >
        <Mention
          trigger="@"
          markup="@[__display__](__id__)"
          data={fetchUsers}
          displayTransform={(_id: string, display: string) => `@${display}`}
          style={{
            backgroundColor: 'rgba(56, 189, 248, 0.18)',
            color: '#0f172a',
            borderRadius: 8,
            padding: '0 2px',
          }}
        />
      </MentionsInput>
    </form>
  )
}

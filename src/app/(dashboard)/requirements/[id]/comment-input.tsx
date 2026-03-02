'use client'
import { MentionsInput, Mention } from 'react-mentions'
import { useState } from 'react'

interface Props {
  requirementId: string
  onSubmitted: () => void
}

export function CommentInput({ requirementId, onSubmitted }: Props) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function fetchUsers(query: string, callback: (data: { id: string; display: string }[]) => void) {
    if (!query) return
    const res = await fetch(
      `/api/trpc/user.search?input=${encodeURIComponent(JSON.stringify({ json: { query } }))}`
    )
    const data = await res.json()
    const users: { id: string; name: string }[] = data.result?.data?.json ?? []
    callback(users.map((u) => ({ id: u.id, display: u.name })))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/trpc/comment.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { requirementId, content: value.trim() } }),
      })
      setValue('')
      onSubmitted()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <MentionsInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="添加评论... 使用 @ 提及成员"
        className="border rounded p-2 text-sm min-h-[72px] resize-y"
        disabled={submitting}
      >
        <Mention trigger="@" data={fetchUsers} displayTransform={(_id: string, display: string) => `@${display}`} />
      </MentionsInput>
      <button
        type="submit"
        disabled={!value.trim() || submitting}
        className="self-end text-sm bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        {submitting ? '提交中...' : '提交评论'}
      </button>
    </form>
  )
}

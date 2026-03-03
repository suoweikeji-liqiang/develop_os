'use client'
import { useState, useEffect, useCallback } from 'react'
import { CommentInput } from './comment-input'

interface Comment {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string }
}

interface Props {
  requirementId: string
  currentUserId: string
  isAdmin: boolean
}

function renderCommentText(content: string): string {
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

export function CommentsPanel({ requirementId, currentUserId, isAdmin }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  const loadComments = useCallback(async () => {
    const res = await fetch(
      `/api/trpc/comment.list?input=${encodeURIComponent(JSON.stringify({ requirementId }))}`
    )
    const data = await res.json()
    const raw: Comment[] = data.result?.data?.json ?? []
    setComments(raw.map((c) => ({ ...c, createdAt: String(c.createdAt) })))
    setLoading(false)
  }, [requirementId])

  useEffect(() => {
    let cancelled = false

    async function loadInitialComments() {
      const res = await fetch(
        `/api/trpc/comment.list?input=${encodeURIComponent(JSON.stringify({ requirementId }))}`
      )
      const data = await res.json()
      const raw: Comment[] = data.result?.data?.json ?? []
      if (cancelled) return
      setComments(raw.map((c) => ({ ...c, createdAt: String(c.createdAt) })))
      setLoading(false)
    }

    void loadInitialComments()

    return () => {
      cancelled = true
    }
  }, [requirementId])

  async function handleDelete(commentId: string) {
    await fetch('/api/trpc/comment.delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    })
    await loadComments()
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-sm">实验记录 ({comments.length})</h3>
      {loading ? (
        <p className="text-sm text-gray-500">加载中...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400">暂无实验记录，添加第一条观察结论</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="border rounded p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{comment.author.name}</span>
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <span>{formatRelativeTime(comment.createdAt)}</span>
                  {(comment.author.id === currentUserId || isAdmin) && (
                    <button
                      onClick={() => void handleDelete(comment.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{renderCommentText(comment.content)}</p>
            </li>
          ))}
        </ul>
      )}
      <CommentInput requirementId={requirementId} onSubmitted={loadComments} />
    </div>
  )
}

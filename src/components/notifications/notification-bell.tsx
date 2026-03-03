'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNotificationStream } from '@/lib/hooks/use-notification-stream'

interface Notification {
  id: string
  type: 'MENTION' | 'STATUS_CHANGE' | 'COMMENT'
  read: boolean
  createdAt: string
  requirement?: { id: string; title: string } | null
  comment?: { id: string; content: string } | null
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

function notificationLabel(n: Notification): string {
  const title = n.requirement?.title ?? '某需求'
  if (n.type === 'MENTION') return `有人在 "${title}" 中提到了你`
  if (n.type === 'STATUS_CHANGE') return `需求 "${title}" 状态已变更`
  return `需求 "${title}" 有新评论`
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadCount = useCallback(async () => {
    const res = await fetch(
      `/api/trpc/notification.unreadCount?input=${encodeURIComponent(JSON.stringify({}))}`
    )
    const data = await res.json()
    setUnreadCount(data.result?.data?.json ?? 0)
  }, [])

  const loadNotifications = useCallback(async () => {
    const res = await fetch(
      `/api/trpc/notification.list?input=${encodeURIComponent(JSON.stringify({ limit: 20 }))}`
    )
    const data = await res.json()
    const raw: Notification[] = data.result?.data?.json ?? []
    setNotifications(raw.map((n) => ({ ...n, createdAt: String(n.createdAt) })))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadInitialCount() {
      const res = await fetch(
        `/api/trpc/notification.unreadCount?input=${encodeURIComponent(JSON.stringify({}))}`
      )
      const data = await res.json()
      if (!cancelled) {
        setUnreadCount(data.result?.data?.json ?? 0)
      }
    }

    void loadInitialCount()

    return () => {
      cancelled = true
    }
  }, [])

  useNotificationStream(useCallback(() => { void loadCount() }, [loadCount]))

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleOpen() {
    setOpen((prev) => !prev)
    await loadNotifications()
  }

  async function handleMarkAllRead() {
    await fetch('/api/trpc/notification.markAllRead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function handleMarkRead(notificationId: string) {
    await fetch('/api/trpc/notification.markRead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    })
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => void handleOpen()}
        className="relative p-2 rounded hover:bg-gray-100"
        aria-label="通知"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-semibold">通知</span>
            {unreadCount > 0 && (
              <button
                onClick={() => void handleMarkAllRead()}
                className="text-xs text-blue-600 hover:underline"
              >
                全部标为已读
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <li className="px-3 py-4 text-sm text-gray-400 text-center">暂无通知</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-3 py-2 text-sm flex items-start gap-2 ${n.read ? 'bg-white' : 'bg-blue-50'}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`truncate ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {notificationLabel(n)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => void handleMarkRead(n.id)}
                      className="text-xs text-blue-500 shrink-0 mt-0.5"
                    >
                      标已读
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

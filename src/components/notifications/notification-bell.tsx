'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNotificationStream } from '@/lib/hooks/use-notification-stream'
import { Bell, CheckCheck } from 'lucide-react'

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
        className="relative inline-flex size-11 items-center justify-center rounded-full border border-white/65 bg-white/72 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] hover:-translate-y-0.5 hover:bg-white/90"
        aria-label="通知"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(32,99,246,0.98),rgba(15,195,255,0.92))] px-1 text-[10px] font-semibold text-white shadow-[0_12px_26px_rgba(31,109,255,0.26)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="app-panel absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/60 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">通知中心</span>
            {unreadCount > 0 && (
              <button
                onClick={() => void handleMarkAllRead()}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
              >
                <CheckCheck className="size-3.5" />
                全部标为已读
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y divide-white/50">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-400">暂无通知</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 text-sm ${n.read ? 'bg-transparent' : 'bg-cyan-100/45'}`}
                >
                  <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-slate-300' : 'bg-cyan-500 shadow-[0_0_18px_rgba(15,195,255,0.8)]'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${n.read ? 'text-slate-600' : 'font-medium text-slate-950'}`}>
                      {notificationLabel(n)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => void handleMarkRead(n.id)}
                      className="mt-0.5 shrink-0 text-xs font-medium text-primary"
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

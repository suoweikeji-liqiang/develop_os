'use client'

import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  UserPlus2,
  Users2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const ROLES = ['PRODUCT', 'DEV', 'TEST', 'UI', 'EXTERNAL'] as const

type UserWithRoles = {
  id: string
  email: string
  name: string
  isAdmin: boolean
  roles: { id: string; role: string }[]
}

const ROLE_STYLES: Record<string, string> = {
  PRODUCT: 'border-cyan-200/80 bg-cyan-100/80 text-cyan-950',
  DEV: 'border-blue-200/80 bg-blue-100/80 text-blue-950',
  TEST: 'border-amber-200/80 bg-amber-100/80 text-amber-950',
  UI: 'border-fuchsia-200/80 bg-fuchsia-100/80 text-fuchsia-950',
  EXTERNAL: 'border-emerald-200/80 bg-emerald-100/80 text-emerald-950',
}

function parseTrpcError(payload: unknown, fallback: string): string {
  const result = payload as { error?: { message?: string; json?: { message?: string } } }
  return result.error?.message ?? result.error?.json?.message ?? fallback
}

export function AdminUsersClient({ users: initialUsers }: { users: UserWithRoles[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoles, setInviteRoles] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { adminCount, assignedRoleCount } = useMemo(() => ({
    adminCount: users.filter((user) => user.isAdmin).length,
    assignedRoleCount: users.reduce((count, user) => count + user.roles.length, 0),
  }), [users])

  async function handleAssignRole(userId: string, role: string) {
    setError('')
    const res = await fetch('/api/trpc/user.assignRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(parseTrpcError(data, '分配角色失败'))
      return
    }

    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, roles: [...user.roles, { id: crypto.randomUUID(), role }] }
        : user,
    ))
  }

  async function handleRemoveRole(userId: string, role: string) {
    setError('')
    const res = await fetch('/api/trpc/user.removeRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(parseTrpcError(data, '移除角色失败'))
      return
    }

    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, roles: user.roles.filter(existing => existing.role !== role) }
        : user,
    ))
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    const res = await fetch('/api/trpc/user.sendInvite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, roles: inviteRoles }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(parseTrpcError(data, '发送邀请失败'))
      return
    }

    setMessage(`邀请已发送至 ${inviteEmail}`)
    setInviteEmail('')
    setInviteRoles([])
  }

  return (
    <div className="space-y-8">
      <section className="app-panel-dark surface-grid relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
        <div className="absolute right-[-5rem] top-[-4rem] h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <p className="app-kicker text-cyan-200/90">Access routing</p>
            <h1 className="app-display text-4xl font-semibold leading-none text-white sm:text-5xl">
              管理协作成员与角色视图
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/70">
              为不同成员分配角色、发送邀请，并保持探索流、签字链与评审权限在同一套控制台里可追踪。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="app-metric">
              <Users2 className="size-5 text-cyan-200" />
              <p className="mt-3 text-3xl font-semibold text-white">{users.length}</p>
              <p className="mt-2 text-sm text-white/58">当前系统成员</p>
            </div>
            <div className="app-metric">
              <ShieldCheck className="size-5 text-cyan-200" />
              <p className="mt-3 text-3xl font-semibold text-white">{adminCount}</p>
              <p className="mt-2 text-sm text-white/58">管理员数量</p>
            </div>
            <div className="app-metric">
              <BadgeCheck className="size-5 text-cyan-200" />
              <p className="mt-3 text-3xl font-semibold text-white">{assignedRoleCount}</p>
              <p className="mt-2 text-sm text-white/58">已分配角色总数</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <form onSubmit={handleSendInvite} className="app-panel space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="app-kicker">Invite operator</p>
            <h2 className="text-2xl font-semibold text-slate-950">发送邀请</h2>
            <p className="text-sm leading-6 text-slate-500">
              通过角色预设把新成员接入正确的视图与协作环节。
            </p>
          </div>

          <Input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="name@company.com"
            required
          />

          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((role) => (
              <label
                key={role}
                className={cn(
                  'flex items-center justify-between rounded-[18px] border px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
                  inviteRoles.includes(role)
                    ? 'border-cyan-300/80 bg-cyan-100/70 text-cyan-950'
                    : 'border-white/65 bg-white/76 text-slate-700',
                )}
              >
                <span className="font-medium">{role}</span>
                <input
                  type="checkbox"
                  checked={inviteRoles.includes(role)}
                  onChange={(event) => setInviteRoles(prev =>
                    event.target.checked ? [...prev, role] : prev.filter(item => item !== role),
                  )}
                  className="size-4 rounded border-slate-300 accent-cyan-600"
                />
              </label>
            ))}
          </div>

          {error && (
            <p className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              建议至少指定一个角色，确保成员进入系统后有明确视图。
            </p>
            <Button type="submit" disabled={!inviteEmail || inviteRoles.length === 0}>
              <UserPlus2 className="size-4" />
              发送邀请
            </Button>
          </div>
        </form>

        <section className="app-panel p-5 sm:p-6">
          <div className="mb-5 space-y-2">
            <p className="app-kicker">Roster</p>
            <h2 className="text-2xl font-semibold text-slate-950">成员列表</h2>
          </div>

          <div className="space-y-4">
            {users.map((user) => {
              const userRoles = user.roles.map(role => role.role)
              const availableRoles = ROLES.filter(role => !userRoles.includes(role))

              return (
                <article
                  key={user.id}
                  className="rounded-[24px] border border-slate-200/80 bg-slate-50/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">{user.name}</h3>
                        {user.isAdmin && <span className="app-chip">ADMIN</span>}
                      </div>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <span
                            key={role.id}
                            className={cn(
                              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
                              ROLE_STYLES[role.role] ?? 'border-slate-200 bg-white text-slate-700',
                            )}
                          >
                            {role.role}
                            <button
                              type="button"
                              onClick={() => void handleRemoveRole(user.id, role.role)}
                              className="text-current/70 hover:text-current"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="app-chip">暂无角色</span>
                      )}
                    </div>
                  </div>

                  {availableRoles.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <div className="min-w-[180px] rounded-full border border-white/65 bg-white/78 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                        <select
                          onChange={(event) => {
                            if (event.target.value) {
                              void handleAssignRole(user.id, event.target.value)
                            }
                            event.target.value = ''
                          }}
                          defaultValue=""
                          className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                        >
                          <option value="" disabled>添加角色</option>
                          {availableRoles.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          {users.length === 0 && (
            <div className="mt-4 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">
              还没有成员记录。
            </div>
          )}
        </section>
      </div>

      <section className="app-panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="size-5 text-primary" />
          <p className="text-sm leading-6 text-slate-500">
            管理员可以把成员按职责接入产品、开发、测试、UI 或外部协作视图，后续每个角色会看到不同的关注重点。
          </p>
        </div>
      </section>
    </div>
  )
}

'use client'

import { useState } from 'react'

const ROLES = ['PRODUCT', 'DEV', 'TEST', 'UI', 'EXTERNAL'] as const

type UserWithRoles = {
  id: string
  email: string
  name: string
  isAdmin: boolean
  roles: { id: string; role: string }[]
}

export function AdminUsersClient({ users: initialUsers }: { users: UserWithRoles[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoles, setInviteRoles] = useState<string[]>([])
  const [message, setMessage] = useState('')

  async function handleAssignRole(userId: string, role: string) {
    const res = await fetch('/api/trpc/user.assignRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, roles: [...u.roles, { id: crypto.randomUUID(), role }] } : u
      ))
    }
  }

  async function handleRemoveRole(userId: string, role: string) {
    const res = await fetch('/api/trpc/user.removeRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, roles: u.roles.filter(r => r.role !== role) } : u
      ))
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/trpc/user.sendInvite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, roles: inviteRoles }),
    })
    if (res.ok) {
      setMessage(`邀请已发送至 ${inviteEmail}`)
      setInviteEmail('')
      setInviteRoles([])
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">用户管理</h1>

      <form onSubmit={handleSendInvite} className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">发送邀请</h2>
        <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
          placeholder="邮箱" required className="block w-full rounded border px-3 py-2" />
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(role => (
            <label key={role} className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={inviteRoles.includes(role)}
                onChange={e => setInviteRoles(prev =>
                  e.target.checked ? [...prev, role] : prev.filter(r => r !== role)
                )} />
              {role}
            </label>
          ))}
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">发送邀请</button>
        {message && <p className="text-sm text-green-600">{message}</p>}
      </form>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">姓名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => {
            const userRoles = user.roles.map(r => r.role)
            const availableRoles = ROLES.filter(r => !userRoles.includes(r))
            return (
              <tr key={user.id} className="border-b">
                <td className="py-2">{user.name} {user.isAdmin && '(管理员)'}</td>
                <td>{user.email}</td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map(r => (
                      <span key={r.id} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs">
                        {r.role}
                        <button onClick={() => handleRemoveRole(user.id, r.role)}
                          className="text-red-500 hover:text-red-700">x</button>
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  {availableRoles.length > 0 && (
                    <select onChange={e => { if (e.target.value) handleAssignRole(user.id, e.target.value); e.target.value = '' }}
                      defaultValue="" className="rounded border px-2 py-1 text-xs">
                      <option value="" disabled>添加角色</option>
                      {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

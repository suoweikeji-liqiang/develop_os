'use client'

import { useActionState } from 'react'
import { registerWithInvite } from '@/app/actions/auth'

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(registerWithInvite, null)

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form action={action} className="w-full max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-bold text-center">受邀注册</h1>
        {state?.error && (
          <p className="text-sm text-red-500 text-center">{state.error}</p>
        )}
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="name" className="block text-sm font-medium">姓名</label>
          <input id="name" name="name" type="text" required
            className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">邮箱</label>
          <input id="email" name="email" type="email" required defaultValue={email}
            className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">密码</label>
          <input id="password" name="password" type="password" required minLength={8}
            className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
        <button type="submit" disabled={pending}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50">
          {pending ? '注册中...' : '注册'}
        </button>
      </form>
    </div>
  )
}

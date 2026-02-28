'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import Link from 'next/link'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form action={action} className="w-full max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-bold text-center">登录</h1>
        {state?.error && (
          <p className="text-sm text-red-500 text-center">{state.error}</p>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium">邮箱</label>
          <input id="email" name="email" type="email" required
            className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">密码</label>
          <input id="password" name="password" type="password" required
            className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
        <button type="submit" disabled={pending}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50">
          {pending ? '登录中...' : '登录'}
        </button>
        <p className="text-center text-sm">
          <Link href="/register" className="underline">注册</Link>
        </p>
      </form>
    </div>
  )
}

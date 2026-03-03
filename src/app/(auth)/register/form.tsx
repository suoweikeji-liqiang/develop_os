'use client'

import { useActionState } from 'react'
import { registerFirstUser } from '@/app/actions/auth'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AuthShell } from '@/components/layout/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerFirstUser, null)

  return (
    <AuthShell
      eyebrow="Bootstrap"
      title="启动第一位系统管理员"
      description="初始化 DevOS 的操作面板、角色体系和邀请能力。完成后，其余成员通过邀请链接加入。"
      supportLink={(
        <span>
          已经有管理员账户？
          {' '}
          <Link href="/login" className="font-medium text-cyan-200 underline-offset-4 hover:underline">
            返回登录
          </Link>
        </span>
      )}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="app-kicker">Initialize Admin</p>
          <h2 className="app-display text-3xl font-semibold text-slate-950">
            创建初始账户
          </h2>
          <p className="text-sm leading-6 text-slate-500">
            这一步会启用第一个管理员身份，后续成员统一通过邀请加入系统。
          </p>
        </div>

        <form action={action} className="space-y-4">
          {state?.error && (
            <p className="rounded-[1.1rem] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input id="name" name="name" type="text" placeholder="例如：黎强" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" name="email" type="email" placeholder="name@company.com" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              placeholder="至少 8 位"
              required
            />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? '初始化中...' : '创建管理员'}
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}

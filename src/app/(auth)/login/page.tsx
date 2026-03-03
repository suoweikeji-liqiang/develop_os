'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AuthShell } from '@/components/layout/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)

  return (
    <AuthShell
      eyebrow="Operator Access"
      title="进入未来研发控制台"
      description="连接 AI 结构化、冲突检测与知识回路，在一个界面里完成需求的探索、建模与收敛。"
      supportLink={(
        <span>
          首次部署还没有用户？
          {' '}
          <Link href="/register" className="font-medium text-cyan-200 underline-offset-4 hover:underline">
            初始化系统账户
          </Link>
        </span>
      )}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="app-kicker">Sign in</p>
          <h2 className="app-display text-3xl font-semibold text-slate-950">
            登录 DevOS
          </h2>
          <p className="text-sm leading-6 text-slate-500">
            使用你的工作账户进入需求操作台，继续推进探索、评审和共识签字。
          </p>
        </div>

        <form action={action} className="space-y-4">
          {state?.error && (
            <p className="rounded-[1.1rem] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="输入你的访问口令"
              required
            />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? '登录中...' : '进入控制台'}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="app-divider" />

        <p className="text-sm text-slate-500">
          还没有账户？
          {' '}
          <Link href="/register" className="font-medium text-slate-900 underline-offset-4 hover:underline">
            创建初始管理员
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

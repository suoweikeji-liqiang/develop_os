'use client'

import { useActionState } from 'react'
import { registerWithInvite } from '@/app/actions/auth'
import { ArrowRight } from 'lucide-react'
import { AuthShell } from '@/components/layout/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(registerWithInvite, null)

  return (
    <AuthShell
      eyebrow="Invite Access"
      title="加入 DevOS 协作空间"
      description="接受邀请后，你可以参与需求探索、评论流、签字确认和冲突处理。"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="app-kicker">Accept Invite</p>
          <h2 className="app-display text-3xl font-semibold text-slate-950">
            受邀注册
          </h2>
          <p className="text-sm leading-6 text-slate-500">
            完成账户创建后，系统会把你接入对应的角色视图与协作链路。
          </p>
        </div>

        <form action={action} className="space-y-4">
          {state?.error && (
            <p className="rounded-[1.1rem] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-600">
              {state.error}
            </p>
          )}
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input id="name" name="name" type="text" placeholder="填写你的姓名" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" name="email" type="email" required defaultValue={email} />
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
            {pending ? '注册中...' : '确认加入'}
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}

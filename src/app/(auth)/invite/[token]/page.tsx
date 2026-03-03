import { validateInvite } from '@/server/auth/invite'
import Link from 'next/link'
import { InviteForm } from './form'
import { AuthShell } from '@/components/layout/auth-shell'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await validateInvite(token)

  if (!invite) {
    return (
      <AuthShell
        eyebrow="Invite Error"
        title="邀请链路失效"
        description="这个注册链接已经过期、失效或被使用过。请联系管理员重新生成一条新的邀请链接。"
        supportLink={(
          <span>
            返回控制台入口：
            {' '}
            <Link href="/login" className="font-medium text-cyan-200 underline-offset-4 hover:underline">
              登录页
            </Link>
          </span>
        )}
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="app-kicker">Expired Link</p>
            <h2 className="app-display text-3xl font-semibold text-slate-950">
              邀请链接无效
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              请求管理员重新发送邀请，或者确认你使用的是最新链接。
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 px-5 py-3 text-sm font-medium text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] hover:-translate-y-0.5 hover:bg-white"
          >
            返回登录
          </Link>
        </div>
      </AuthShell>
    )
  }

  return <InviteForm token={token} email={invite.email} />
}

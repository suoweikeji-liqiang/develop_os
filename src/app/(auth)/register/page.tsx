import { prisma } from '@/server/db/client'
import Link from 'next/link'
import { RegisterForm } from './form'
import { AuthShell } from '@/components/layout/auth-shell'

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const userCount = await prisma.user.count()

  if (userCount > 0) {
    return (
      <AuthShell
        eyebrow="Invite Only"
        title="系统已切换到邀请制"
        description="初始管理员已存在。为了保持权限链清晰，新成员只能通过邀请链接注册。"
        supportLink={(
          <span>
            已有账户？
            {' '}
            <Link href="/login" className="font-medium text-cyan-200 underline-offset-4 hover:underline">
              返回登录
            </Link>
          </span>
        )}
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="app-kicker">Invite Gate</p>
            <h2 className="app-display text-3xl font-semibold text-slate-950">
              仅限邀请注册
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              让管理员通过用户管理页发送邀请链接，再使用该链接完成账户创建。
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

  return <RegisterForm />
}

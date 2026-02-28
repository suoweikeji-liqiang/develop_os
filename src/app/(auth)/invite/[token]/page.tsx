import { validateInvite } from '@/server/auth/invite'
import Link from 'next/link'
import { InviteForm } from './form'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await validateInvite(token)

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <h1 className="text-2xl font-bold">邀请链接无效</h1>
          <p className="text-sm text-gray-500">该链接已过期或已被使用。</p>
          <Link href="/login" className="underline text-sm">返回登录</Link>
        </div>
      </div>
    )
  }

  return <InviteForm token={token} email={invite.email} />
}

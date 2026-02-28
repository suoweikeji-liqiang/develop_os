import { prisma } from '@/server/db/client'
import Link from 'next/link'
import { RegisterForm } from './form'

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const userCount = await prisma.user.count()

  if (userCount > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <h1 className="text-2xl font-bold">仅限邀请注册</h1>
          <p className="text-sm text-gray-500">系统已有用户，请通过邀请链接注册。</p>
          <Link href="/login" className="underline text-sm">返回登录</Link>
        </div>
      </div>
    )
  }

  return <RegisterForm />
}

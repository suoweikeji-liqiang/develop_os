import Link from 'next/link'
import { verifySession } from '@/lib/dal'

export default async function DashboardPage() {
  const session = await verifySession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">欢迎使用 DevOS</h1>
        <p className="text-gray-600 mt-1">
          角色: {session.roles.length > 0 ? session.roles.join(', ') : '无'}
          {session.isAdmin && ' (管理员)'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/requirements/new"
          className="block rounded-lg border p-5 hover:border-black transition-colors"
        >
          <h2 className="font-semibold">新建需求</h2>
          <p className="text-sm text-gray-600 mt-1">
            输入需求描述，AI 自动生成五层结构化模型
          </p>
        </Link>

        <Link
          href="/requirements"
          className="block rounded-lg border p-5 hover:border-black transition-colors"
        >
          <h2 className="font-semibold">需求列表</h2>
          <p className="text-sm text-gray-600 mt-1">
            查看和管理所有已创建的需求
          </p>
        </Link>

        {session.isAdmin && (
          <Link
            href="/admin/users"
            className="block rounded-lg border p-5 hover:border-black transition-colors"
          >
            <h2 className="font-semibold">用户管理</h2>
            <p className="text-sm text-gray-600 mt-1">
              管理用户账号、角色和邀请
            </p>
          </Link>
        )}
      </div>
    </div>
  )
}

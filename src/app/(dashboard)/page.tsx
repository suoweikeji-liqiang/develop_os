import { verifySession } from '@/lib/dal'

export default async function DashboardPage() {
  const session = await verifySession()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">欢迎使用 DevOS</h1>
      <p className="text-gray-600">
        角色: {session.roles.length > 0 ? session.roles.join(', ') : '无'}
        {session.isAdmin && ' (管理员)'}
      </p>
    </div>
  )
}

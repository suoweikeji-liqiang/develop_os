import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/server/db/client'

export default async function RequirementsPage() {
  await verifySession()

  const requirements = await prisma.requirement.findMany({
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">需求列表</h1>
        <Link
          href="/requirements/new"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:opacity-80"
        >
          新建需求
        </Link>
      </div>

      {requirements.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-gray-500">暂无需求</p>
          <Link href="/requirements/new" className="mt-2 inline-block text-sm underline">
            创建第一个需求
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {requirements.map((req) => (
            <Link
              key={req.id}
              href={`/requirements/${req.id}`}
              className="block rounded-lg border p-4 hover:border-black transition-colors"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{req.title}</h2>
                <span className="text-xs text-gray-400">
                  {req.updatedAt.toLocaleDateString('zh-CN')}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {req.rawInput}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

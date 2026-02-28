import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { logout } from '@/app/actions/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-bold">DevOS</span>
          <nav className="flex items-center gap-4">
            <Link href="/requirements/new" className="text-sm hover:underline">
              需求
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.userId}</span>
          <form action={logout}>
            <button type="submit" className="text-sm underline">退出</button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}

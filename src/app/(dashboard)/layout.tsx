import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { logout } from '@/app/actions/auth'
import { NotificationBell } from '@/components/notifications/notification-bell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold hover:opacity-80">DevOS</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/explorations" className="hover:underline">
              Explorations
            </Link>
            <Link href="/models" className="hover:underline">
              Models
            </Link>
            <Link href="/evolution" className="hover:underline">
              Evolution
            </Link>
            <Link href="/explorations/new" className="rounded border px-2 py-1 hover:bg-muted">
              New Exploration
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.userId}</span>
          <NotificationBell />
          <form action={logout}>
            <button type="submit" className="text-sm underline">退出</button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}

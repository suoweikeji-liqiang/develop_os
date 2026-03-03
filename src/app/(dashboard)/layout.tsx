import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { logout } from '@/app/actions/auth'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { DashboardNav } from '@/components/layout/dashboard-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  const roleLabel = session.roles.length > 0 ? session.roles.join(' / ') : 'Observer'

  return (
    <div className="relative min-h-screen pb-10">
      <div className="app-container pt-4 sm:pt-6">
        <header className="app-panel z-40 px-4 py-4 sm:px-5 md:sticky md:top-4 lg:px-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/" className="group inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
                  <span className="flex size-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(32,99,246,0.98),rgba(15,195,255,0.92))] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(31,109,255,0.24)]">
                    D
                  </span>
                  <span>
                    <span className="block app-display text-base font-semibold text-slate-950">DevOS</span>
                    <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">
                      Research Operating Layer
                    </span>
                  </span>
                </Link>

                <div className="hidden xl:flex items-center gap-2 app-chip">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.8)]" />
                  Syncing AI workspace
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="hidden min-w-[220px] rounded-[22px] border border-white/70 bg-white/72 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] md:block">
                  <p className="text-[0.68rem] uppercase tracking-[0.26em] text-slate-500">Operator</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {session.userId}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {roleLabel}{session.isAdmin ? ' • Admin root' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <NotificationBell />

                <form action={logout}>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full border border-white/65 bg-white/72 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] hover:-translate-y-0.5 hover:bg-white/90"
                  >
                    退出
                  </button>
                </form>
              </div>
            </div>

            <DashboardNav isAdmin={session.isAdmin} />
          </div>
        </header>
      </div>

      <main className="app-container pt-6 sm:pt-8">
        {children}
      </main>
    </div>
  )
}

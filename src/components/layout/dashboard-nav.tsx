'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Atom, BookMarked, Compass, Plus, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/explorations', label: 'Explorations', detail: 'Signal flows', icon: Compass },
  { href: '/models', label: 'Models', detail: 'Structured assets', icon: Atom },
  { href: '/evolution', label: 'Evolution', detail: 'Version drift', icon: Activity },
  { href: '/knowledge', label: 'Knowledge', detail: 'Context memory', icon: BookMarked },
] as const

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/explorations') {
    return pathname === '/' || pathname.startsWith('/explorations')
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = isAdmin
    ? [...NAV_ITEMS, { href: '/admin/users', label: 'Admin', detail: 'Control plane', icon: ShieldCheck }]
    : NAV_ITEMS

  return (
    <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <nav className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2 px-1">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group inline-flex shrink-0 items-center gap-3 rounded-full border px-4 py-2.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
                  active
                    ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]'
                    : 'border-white/65 bg-white/58 text-slate-700 hover:-translate-y-0.5 hover:border-white hover:bg-white/82',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full',
                    active ? 'bg-white/10 text-cyan-200' : 'bg-slate-950/6 text-slate-600',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="hidden min-[1180px]:block">
                  <span className="block text-left font-medium">{item.label}</span>
                  <span className={cn('block text-xs', active ? 'text-white/60' : 'text-slate-500')}>
                    {item.detail}
                  </span>
                </span>
                <span className="min-[1180px]:hidden">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <Link
        href="/explorations/new"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-300/50 bg-[linear-gradient(135deg,rgba(32,99,246,0.98),rgba(15,195,255,0.92))] px-4 py-3 text-sm font-medium text-white shadow-[0_18px_48px_rgba(31,109,255,0.28)] hover:-translate-y-0.5 sm:w-auto sm:min-w-[220px]"
      >
        <Plus className="size-4" />
        Start Exploration
      </Link>
    </div>
  )
}

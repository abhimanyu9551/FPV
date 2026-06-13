'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard',     label: 'Overview',       icon: '⬡' },
  { href: '/income',        label: 'Income',          icon: '↑' },
  { href: '/allocation',    label: 'Allocation',      icon: '◑' },
  { href: '/debts',         label: 'Debts',           icon: '⊖' },
  { href: '/credit-cards',  label: 'Credit Cards',    icon: '▭' },
  { href: '/remittances',   label: 'India Transfers', icon: '⇌' },
  { href: '/savings',       label: 'Savings',         icon: '◎' },
  { href: '/investments',   label: 'Investments',     icon: '▲' },
  { href: '/reports',       label: 'Reports',         icon: '≡' },
  { href: '/settings',      label: 'Settings',        icon: '⚙' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-gray-800">
        <span className="text-xl font-bold text-white tracking-tight">FPV</span>
        <p className="text-xs text-gray-500 mt-0.5">Family Finance</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
        >
          <span className="text-base w-5 text-center">→</span>
          Sign out
        </button>
      </div>
    </aside>
  )
}

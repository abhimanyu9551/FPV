'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import {
  LayoutDashboard,
  TrendingUp,
  PieChart,
  CreditCard,
  Wallet,
  ArrowRightLeft,
  Target,
  BarChart3,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',     label: 'Overview',        icon: LayoutDashboard },
  { href: '/income',        label: 'Income',           icon: TrendingUp },
  { href: '/allocation',    label: 'Allocation',       icon: PieChart },
  { href: '/debts',         label: 'Debts',            icon: Wallet },
  { href: '/credit-cards',  label: 'Credit Cards',     icon: CreditCard },
  { href: '/remittances',   label: 'India Transfers',  icon: ArrowRightLeft },
  { href: '/savings',       label: 'Savings',          icon: Target },
  { href: '/investments',   label: 'Investments',      icon: BarChart3 },
  { href: '/reports',       label: 'Reports',          icon: FileText },
  { href: '/settings',      label: 'Settings',         icon: Settings },
]

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <span className="text-xl font-bold font-heading text-foreground tracking-tight">FPV</span>
        <p className="text-xs text-muted-foreground mt-0.5">Family Finance</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-sidebar-active text-sidebar-active-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border space-y-2">
        <ThemeToggle className="w-full justify-center" />
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-56 bg-sidebar-background border-r border-sidebar-border flex-col shrink-0">
      <SidebarNav />
    </aside>
  )
}

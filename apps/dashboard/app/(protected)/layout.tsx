import { requireAuth } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <MobileSidebar />
          <span className="text-lg font-bold font-heading text-foreground tracking-tight">FPV</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

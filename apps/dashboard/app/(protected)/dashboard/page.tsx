import { getCurrentUserProfile } from '@/lib/auth'
import { debtService } from '@/lib/services/debt.service'
import { incomeService } from '@/lib/services/income.service'
import { reportsDAL } from '@/lib/dal/reports.dal'
import { CurrencyService } from '@/lib/services/currency.service'

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile()
  const [entries, debts, snapshots] = await Promise.all([
    incomeService.listEntries(profile.id, 3),
    debtService.listActive(),
    reportsDAL.listSnapshots(),
  ])

  const totalDebt = debts.reduce((s, d) => s + Number(d.outstandingBalance), 0)
  const latestSnap = snapshots[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {getGreeting()}, {profile.fullName.split(' ')[0]}
        </h1>
        <p className="text-gray-400 text-sm mt-1">Here&apos;s your financial overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Net Worth"
          value={latestSnap?.netWorth ? CurrencyService.format(Number(latestSnap.netWorth.netWorthGbp), 'GBP') : '—'}
          sub={latestSnap?.netWorth?.deltaGbp ? `${Number(latestSnap.netWorth.deltaGbp) >= 0 ? '+' : ''}${CurrencyService.format(Number(latestSnap.netWorth.deltaGbp), 'GBP')} MoM` : 'No snapshot yet'}
          color="indigo"
        />
        <KpiCard
          label="Total Debt"
          value={CurrencyService.format(totalDebt, 'GBP')}
          sub={`${debts.length} active debt${debts.length !== 1 ? 's' : ''}`}
          color="red"
        />
        <KpiCard
          label="Active Debts"
          value={String(debts.length)}
          sub="Credit cards + loans"
          color="amber"
        />
        <KpiCard
          label="Monthly Snapshots"
          value={String(snapshots.length)}
          sub="Reports generated"
          color="emerald"
        />
      </div>

      {/* Recent Income Entries */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Recent Income</h2>
        {entries.length === 0 ? (
          <EmptyState
            title="No income entries yet"
            description="Add your first salary entry to start allocating."
            href="/income"
            cta="Add Income"
          />
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium text-sm">{e.incomeSource.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{new Date(e.receivedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-semibold">{CurrencyService.format(Number(e.baseAmountGbp), 'GBP')}</p>
                  <p className={`text-xs mt-0.5 ${e.isProcessed ? 'text-indigo-400' : 'text-amber-400'}`}>
                    {e.isProcessed ? 'Allocated' : 'Pending allocation'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top Debts */}
      {debts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Active Debts</h2>
          <div className="space-y-2">
            {debts.slice(0, 5).map((d) => {
              const pct = d.outstandingBalance && d.originalAmount
                ? (Number(d.outstandingBalance) / Number(d.originalAmount)) * 100
                : 0
              return (
                <div key={d.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">{d.name}</p>
                      <p className="text-gray-500 text-xs">{d.debtType.replace(/_/g, ' ')} {d.interestRate ? `• ${Number(d.interestRate)}% APR` : ''}</p>
                    </div>
                    <p className="text-red-400 font-semibold text-sm">{CurrencyService.format(Number(d.outstandingBalance), 'GBP')}</p>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-red-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'border-indigo-800 bg-indigo-950/40',
    red: 'border-red-900 bg-red-950/30',
    amber: 'border-amber-900 bg-amber-950/30',
    emerald: 'border-emerald-900 bg-emerald-950/30',
  }
  return (
    <div className={`border rounded-xl px-5 py-4 ${colors[color] ?? colors.indigo}`}>
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-white text-2xl font-bold mt-1">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{sub}</p>
    </div>
  )
}

function EmptyState({ title, description, href, cta }: { title: string; description: string; href: string; cta: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-10 text-center">
      <p className="text-white font-medium">{title}</p>
      <p className="text-gray-500 text-sm mt-1">{description}</p>
      <a href={href} className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition">
        {cta}
      </a>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

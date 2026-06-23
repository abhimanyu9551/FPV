import { getCurrentUserProfile } from '@/lib/auth'
import { debtService } from '@/lib/services/debt.service'
import { incomeService } from '@/lib/services/income.service'
import { reportsDAL } from '@/lib/dal/reports.dal'
import { CurrencyService } from '@/lib/services/currency.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Wallet, CreditCard, FileText } from 'lucide-react'

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
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Good {getGreeting()}, {profile.fullName.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Here&apos;s your financial overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Net Worth"
          value={latestSnap?.netWorth ? CurrencyService.format(Number(latestSnap.netWorth.netWorthGbp), 'GBP') : '—'}
          sub={latestSnap?.netWorth?.deltaGbp ? `${Number(latestSnap.netWorth.deltaGbp) >= 0 ? '+' : ''}${CurrencyService.format(Number(latestSnap.netWorth.deltaGbp), 'GBP')} MoM` : 'No snapshot yet'}
          icon={TrendingUp}
          variant="primary"
        />
        <KpiCard
          label="Total Debt"
          value={CurrencyService.format(totalDebt, 'GBP')}
          sub={`${debts.length} active debt${debts.length !== 1 ? 's' : ''}`}
          icon={Wallet}
          variant="destructive"
        />
        <KpiCard
          label="Active Debts"
          value={String(debts.length)}
          sub="Credit cards + loans"
          icon={CreditCard}
          variant="warning"
        />
        <KpiCard
          label="Monthly Snapshots"
          value={String(snapshots.length)}
          sub="Reports generated"
          icon={FileText}
          variant="success"
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Income</h2>
        {entries.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No income entries yet"
            description="Add your first salary entry to start allocating."
            href="/income"
            cta="Add Income"
          />
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <Card key={e.id} className="flex-row items-center justify-between gap-0 px-5 py-4">
                <div>
                  <p className="text-foreground font-medium text-sm">{e.incomeSource.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {new Date(e.receivedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-success font-semibold tabular-nums">
                    {CurrencyService.format(Number(e.baseAmountGbp), 'GBP')}
                  </p>
                  <Badge variant={e.isProcessed ? 'default' : 'secondary'} className="text-xs mt-0.5">
                    {e.isProcessed ? 'Allocated' : 'Pending'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {debts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Active Debts</h2>
          <div className="space-y-2">
            {debts.slice(0, 5).map((d) => {
              const pct = d.outstandingBalance && d.originalAmount
                ? (Number(d.outstandingBalance) / Number(d.originalAmount)) * 100
                : 0
              return (
                <Card key={d.id} className="gap-2 px-5 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-foreground font-medium text-sm">{d.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {d.debtType.replace(/_/g, ' ')} {d.interestRate ? `· ${Number(d.interestRate)}% APR` : ''}
                      </p>
                    </div>
                    <p className="text-destructive font-semibold text-sm tabular-nums">
                      {CurrencyService.format(Number(d.outstandingBalance), 'GBP')}
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-destructive h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

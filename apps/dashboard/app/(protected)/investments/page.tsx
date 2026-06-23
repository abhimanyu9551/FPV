import { getCurrentUserProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { CurrencyService } from '@/lib/services/currency.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Briefcase } from 'lucide-react'

export default async function InvestmentsPage() {
  await getCurrentUserProfile()

  const investments = await db.investment.findMany({
    include: { transactions: { orderBy: { transactionDate: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'asc' },
  })

  const totalValue = investments.reduce((s, inv) => s + Number(inv.currentValue ?? inv.totalInvested ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Investments" description="Track stocks, funds, chit funds, and FDs">
        <button
          disabled
          className="px-4 py-2 bg-muted text-muted-foreground text-sm font-medium rounded-lg cursor-not-allowed"
          title="Coming soon"
        >
          + Add Investment
        </button>
      </PageHeader>

      {investments.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Investment tracking coming soon"
          description="Track your UK stocks, ISA, chit funds, Indian FDs, and mutual funds all in one place."
        >
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {['UK Stocks', 'S&S ISA', 'Chit Fund', 'Indian FD', 'Mutual Funds', 'Crypto'].map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </EmptyState>
      ) : (
        <>
          <KpiCard
            label="Total Portfolio Value"
            value={CurrencyService.format(totalValue, 'GBP')}
            icon={Briefcase}
            variant="primary"
          />

          <div className="space-y-3">
            {investments.map((inv) => {
              const value = Number(inv.currentValue ?? inv.totalInvested ?? 0)
              const cost = Number(inv.totalInvested ?? 0)
              const gain = value - cost
              const gainPct = cost > 0 ? (gain / cost) * 100 : 0

              return (
                <Card key={inv.id} className="flex-row items-start justify-between gap-0 px-5 py-4">
                  <div>
                    <p className="text-foreground font-semibold">{inv.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {inv.investmentType.replace(/_/g, ' ')} · {inv.currencyCode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground font-bold tabular-nums">{CurrencyService.format(value, 'GBP')}</p>
                    <p className={`text-xs tabular-nums ${gain >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {gain >= 0 ? '+' : ''}{CurrencyService.format(gain, 'GBP')} ({gainPct.toFixed(1)}%)
                    </p>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

import { getCurrentUserProfile } from '@/lib/auth'
import { remittancesDAL } from '@/lib/dal/remittances.dal'
import { CurrencyService } from '@/lib/services/currency.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'

export default async function RemittancesPage() {
  await getCurrentUserProfile()
  const [categories, remittances] = await Promise.all([
    remittancesDAL.listCategories(),
    remittancesDAL.listRemittances(24),
  ])

  const totalGbp = remittances
    .filter((r) => r.status === 'COMPLETED')
    .reduce((s, r) => s + Number(r.baseAmountGbp), 0)

  return (
    <div className="space-y-6">
      <PageHeader title="India Transfers" description="GBP → INR remittances">
        <Button asChild>
          <Link href="/remittances/new">+ New Transfer</Link>
        </Button>
      </PageHeader>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="items-center gap-1 px-4 py-3 text-center">
              <p className="text-foreground text-sm font-medium">{cat.name}</p>
              {cat.monthlyBudget && (
                <p className="text-primary text-xs">{CurrencyService.format(Number(cat.monthlyBudget), 'GBP')}</p>
              )}
              <p className="text-muted-foreground/60 text-xs">Priority {cat.priority}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-foreground">Transfer History</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            Total completed: {CurrencyService.format(totalGbp, 'GBP')}
          </span>
        </div>
        {remittances.length === 0 ? (
          <EmptyState
            icon={ArrowRightLeft}
            title="No remittances yet"
            description="Record your first India transfer."
            href="/remittances/new"
            cta="New Transfer"
          />
        ) : (
          <div className="space-y-2">
            {remittances.map((r) => (
              <Card key={r.id} className="flex-row items-center justify-between gap-0 px-5 py-4">
                <div>
                  <p className="text-foreground text-sm font-medium">{r.category.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(r.remittanceDate).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    {r.exchangeRate && ` · Rate: ${Number(r.exchangeRate.rate).toFixed(2)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-foreground font-medium text-sm tabular-nums">
                    {CurrencyService.format(Number(r.baseAmountGbp), 'GBP')}
                  </p>
                  {r.convertedAmount && (
                    <p className="text-muted-foreground text-xs tabular-nums">
                      ₹{Number(r.convertedAmount).toLocaleString('en-IN')}
                    </p>
                  )}
                  <Badge
                    variant={r.status === 'COMPLETED' ? 'default' : 'secondary'}
                    className={
                      r.status === 'COMPLETED' ? 'bg-success/10 text-success border-0' :
                      r.status === 'FAILED' ? 'bg-destructive/10 text-destructive border-0' :
                      'bg-warning/10 text-warning border-0'
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

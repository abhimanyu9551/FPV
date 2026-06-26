import { getCurrentUserProfile } from '@/lib/auth'
import { debtService } from '@/lib/services/debt.service'
import { CurrencyService } from '@/lib/services/currency.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CreditCard, Hash, Banknote, AlertCircle, Pencil } from 'lucide-react'
import Link from 'next/link'

export default async function CreditCardsPage() {
  await getCurrentUserProfile()
  const allDebts = await debtService.listActive()
  const cards = allDebts.filter((d) => d.debtType === 'CREDIT_CARD')

  return (
    <div className="space-y-6">
      <PageHeader title="Credit Cards" description="Track balances and utilization">
        <Button asChild>
          <Link href="/debts/new">+ Add Card</Link>
        </Button>
      </PageHeader>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No credit cards tracked yet"
          description='Add a debt with type "Credit Card" to start tracking it here.'
          href="/debts/new"
          cta="Add Credit Card"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Total Cards"
              value={String(cards.length)}
              icon={Hash}
              variant="primary"
            />
            <KpiCard
              label="Total Balance"
              value={CurrencyService.format(
                cards.reduce((s, c) => s + Number(c.outstandingBalance), 0),
                'GBP'
              )}
              icon={Banknote}
              variant="destructive"
            />
            <KpiCard
              label="Monthly Minimums"
              value={CurrencyService.format(
                cards.reduce((s, c) => s + (c.minimumPayment ? Number(c.minimumPayment) : 0), 0),
                'GBP'
              )}
              icon={AlertCircle}
              variant="warning"
            />
          </div>

          <div className="space-y-3">
            {cards.map((card) => {
              const balance = Number(card.outstandingBalance)
              const limit = card.creditCard?.creditLimit
                ? Number(card.creditCard.creditLimit)
                : Number(card.originalAmount)
              const utilPct = limit > 0 ? Math.min((balance / limit) * 100, 100) : 0

              return (
                <Card key={card.id} className="gap-3 px-5 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-foreground font-semibold">{card.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {card.creditorName || 'Credit Card'}
                        {card.interestRate ? ` · ${Number(card.interestRate)}% APR` : ''}
                        {card.minimumPayment ? ` · Min. ${CurrencyService.format(Number(card.minimumPayment), 'GBP')}/mo` : ''}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="text-destructive font-bold tabular-nums">{CurrencyService.format(balance, 'GBP')}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">of {CurrencyService.format(limit, 'GBP')} limit</p>
                    </div>
                    <Link
                      href={`/debts/${card.id}/edit`}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition mt-0.5"
                    >
                      <Pencil size={14} />
                    </Link>
                  </div>
                  </div>

                  <Progress value={utilPct} className="h-2" />
                  <div className="flex justify-between">
                    <p className="text-muted-foreground/60 text-xs">Utilization</p>
                    <p className={`text-xs font-medium ${
                      utilPct > 80 ? 'text-destructive' : utilPct > 50 ? 'text-warning' : 'text-success'
                    }`}>
                      {utilPct.toFixed(1)}%
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

import { getCurrentUserProfile } from '@/lib/auth'
import { debtService } from '@/lib/services/debt.service'
import { CurrencyService } from '@/lib/services/currency.service'
import Link from 'next/link'

export default async function CreditCardsPage() {
  await getCurrentUserProfile()
  const allDebts = await debtService.listActive()
  const cards = allDebts.filter((d) => d.debtType === 'CREDIT_CARD')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Credit Cards</h1>
          <p className="text-gray-400 text-sm mt-1">Track balances and utilization</p>
        </div>
        <Link
          href="/debts/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
        >
          + Add Card
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-12 text-center">
          <p className="text-white font-medium">No credit cards tracked yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Add a debt with type "Credit Card" to start tracking it here.
          </p>
          <Link
            href="/debts/new"
            className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
          >
            Add Credit Card
          </Link>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Total Cards</p>
              <p className="text-white text-2xl font-bold mt-1">{cards.length}</p>
            </div>
            <div className="bg-red-950/30 border border-red-900 rounded-xl px-5 py-4">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Total Balance</p>
              <p className="text-white text-2xl font-bold mt-1">
                {CurrencyService.format(
                  cards.reduce((s, c) => s + Number(c.outstandingBalance), 0),
                  'GBP'
                )}
              </p>
            </div>
            <div className="bg-amber-950/30 border border-amber-900 rounded-xl px-5 py-4">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Monthly Minimums</p>
              <p className="text-white text-2xl font-bold mt-1">
                {CurrencyService.format(
                  cards.reduce((s, c) => s + (c.minimumPayment ? Number(c.minimumPayment) : 0), 0),
                  'GBP'
                )}
              </p>
            </div>
          </div>

          {/* Card list */}
          <div className="space-y-3">
            {cards.map((card) => {
              const balance = Number(card.outstandingBalance)
              const limit = card.creditCard?.creditLimit
                ? Number(card.creditCard.creditLimit)
                : Number(card.originalAmount)
              const utilPct = limit > 0 ? Math.min((balance / limit) * 100, 100) : 0
              const utilColor = utilPct > 80 ? 'bg-red-500' : utilPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'

              return (
                <div key={card.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-semibold">{card.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {card.creditorName || 'Credit Card'}
                        {card.interestRate ? ` · ${Number(card.interestRate)}% APR` : ''}
                        {card.minimumPayment ? ` · Min. ${CurrencyService.format(Number(card.minimumPayment), 'GBP')}/mo` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-bold">{CurrencyService.format(balance, 'GBP')}</p>
                      <p className="text-gray-500 text-xs">of {CurrencyService.format(limit, 'GBP')} limit</p>
                    </div>
                  </div>

                  {/* Utilization bar */}
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`${utilColor} h-2 rounded-full transition-all`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-gray-600 text-xs">Utilization</p>
                    <p className={`text-xs font-medium ${utilPct > 80 ? 'text-red-400' : utilPct > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {utilPct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

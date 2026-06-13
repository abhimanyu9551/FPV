import { getCurrentUserProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { CurrencyService } from '@/lib/services/currency.service'

export default async function InvestmentsPage() {
  await getCurrentUserProfile()

  const investments = await db.investment.findMany({
    include: { transactions: { orderBy: { transactionDate: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'asc' },
  })

  const totalValue = investments.reduce((s, inv) => s + Number(inv.currentValue ?? inv.totalInvested ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Investments</h1>
          <p className="text-gray-400 text-sm mt-1">Track stocks, funds, chit funds, and FDs</p>
        </div>
        <button
          disabled
          className="px-4 py-2 bg-gray-800 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed"
          title="Coming soon"
        >
          + Add Investment
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-16 text-center">
          <div className="text-4xl mb-4">▲</div>
          <p className="text-white font-medium">Investment tracking coming soon</p>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            Track your UK stocks, ISA, chit funds, Indian FDs, and mutual funds all in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {['UK Stocks', 'S&S ISA', 'Chit Fund', 'Indian FD', 'Mutual Funds', 'Crypto'].map((t) => (
              <span key={t} className="px-3 py-1.5 bg-gray-800 text-gray-400 text-xs rounded-full border border-gray-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-indigo-950/40 border border-indigo-800 rounded-xl px-5 py-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Total Portfolio Value</p>
            <p className="text-white text-3xl font-bold mt-1">{CurrencyService.format(totalValue, 'GBP')}</p>
          </div>
          <div className="space-y-3">
            {investments.map((inv) => {
              const value = Number(inv.currentValue ?? inv.totalInvested ?? 0)
              const cost = Number(inv.totalInvested ?? 0)
              const gain = value - cost
              const gainPct = cost > 0 ? (gain / cost) * 100 : 0

              return (
                <div key={inv.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-semibold">{inv.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {inv.investmentType.replace(/_/g, ' ')} · {inv.currencyCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{CurrencyService.format(value, 'GBP')}</p>
                      <p className={`text-xs ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {gain >= 0 ? '+' : ''}{CurrencyService.format(gain, 'GBP')} ({gainPct.toFixed(1)}%)
                      </p>
                    </div>
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

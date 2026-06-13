import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserProfile } from '@/lib/auth'
import { reportsDAL } from '@/lib/dal/reports.dal'
import { CurrencyService } from '@/lib/services/currency.service'

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ month: string }>
}) {
  await getCurrentUserProfile()
  const { month } = await params

  // Validate YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) notFound()

  const snapshotDate = new Date(`${month}-01T00:00:00.000Z`)
  const snapshot = await reportsDAL.findSnapshot(snapshotDate)
  if (!snapshot) notFound()

  const monthLabel = new Date(snapshot.snapshotMonth).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const netWorth = snapshot.netWorth
  const income = snapshot.incomeData
  const debts = snapshot.debtData ?? []

  const delta = netWorth?.deltaGbp ? Number(netWorth.deltaGbp) : null
  const deltaPos = delta !== null && delta >= 0

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-gray-500 hover:text-white transition text-sm">
          ← Reports
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm">{monthLabel}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{monthLabel}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {snapshot.isLocked ? '🔒 Locked snapshot' : '📝 Draft snapshot'}
          </p>
        </div>
        {delta !== null && (
          <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${deltaPos ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
            {deltaPos ? '+' : ''}{CurrencyService.format(delta, 'GBP')} MoM
          </div>
        )}
      </div>

      {/* Net Worth */}
      {netWorth && (
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Net Worth</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Assets</p>
              <p className="text-emerald-400 font-bold text-lg mt-1">
                {CurrencyService.format(Number(netWorth.totalAssetsGbp), 'GBP')}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Liabilities</p>
              <p className="text-red-400 font-bold text-lg mt-1">
                {CurrencyService.format(Number(netWorth.totalLiabilitiesGbp), 'GBP')}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Net Worth</p>
              <p className={`font-bold text-lg mt-1 ${Number(netWorth.netWorthGbp) >= 0 ? 'text-white' : 'text-red-400'}`}>
                {CurrencyService.format(Number(netWorth.netWorthGbp), 'GBP')}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Income */}
      {income && (
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-semibold">Income Summary</h2>
          <div className="space-y-2">
            {[
              { label: 'Total income', value: Number(income.totalGbp) },
              { label: 'Salary', value: Number(income.salaryGbp) },
              { label: 'Remittances sent', value: Number(income.remittancesGbp), negative: true },
              { label: 'Remaining cash', value: Number(income.remainingCashGbp), highlight: true },
            ].map(({ label, value, negative, highlight }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className={`text-sm font-medium ${highlight ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-white'}`}>
                  {negative && value > 0 ? '-' : ''}{CurrencyService.format(value, 'GBP')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Debts at snapshot time */}
      {debts.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-semibold">Debt Snapshot</h2>
          <div className="space-y-2">
            {debts.map((d) => (
              <div key={d.id} className="flex justify-between items-center">
                <div>
                  <p className="text-white text-sm">{d.debtName}</p>
                  <p className="text-gray-600 text-xs">{d.debtType.replace(/_/g, ' ')}</p>
                </div>
                <p className="text-red-400 text-sm font-medium">
                  {CurrencyService.format(Number(d.outstandingBalance), 'GBP')}
                </p>
              </div>
            ))}
            <div className="border-t border-gray-800 pt-2 flex justify-between">
              <span className="text-gray-400 text-sm font-medium">Total debt</span>
              <span className="text-red-400 font-bold">
                {CurrencyService.format(
                  debts.reduce((s, d) => s + Number(d.outstandingBalance), 0),
                  'GBP'
                )}
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

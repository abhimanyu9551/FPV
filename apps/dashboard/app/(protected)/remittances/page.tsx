import { getCurrentUserProfile } from '@/lib/auth'
import { remittancesDAL } from '@/lib/dal/remittances.dal'
import { CurrencyService } from '@/lib/services/currency.service'

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">India Transfers</h1>
          <p className="text-gray-400 text-sm mt-1">GBP → INR remittances</p>
        </div>
        <a href="/remittances/new" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition">
          + New Transfer
        </a>
      </div>

      {/* Categories */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
              <p className="text-white text-sm font-medium">{cat.name}</p>
              {cat.monthlyBudget && (
                <p className="text-indigo-400 text-xs mt-1">{CurrencyService.format(Number(cat.monthlyBudget), 'GBP')}</p>
              )}
              <p className="text-gray-600 text-xs mt-0.5">Priority {cat.priority}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Transfer History */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-white">Transfer History</h2>
          <span className="text-sm text-gray-400">Total completed: {CurrencyService.format(totalGbp, 'GBP')}</span>
        </div>
        {remittances.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-10 text-center">
            <p className="text-gray-400">No remittances yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {remittances.map((r) => (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex justify-between items-center">
                <div>
                  <p className="text-white text-sm font-medium">{r.category.name}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(r.remittanceDate).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    {r.exchangeRate && ` · Rate: ${Number(r.exchangeRate.rate).toFixed(2)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium text-sm">{CurrencyService.format(Number(r.baseAmountGbp), 'GBP')}</p>
                  {r.convertedAmount && (
                    <p className="text-gray-400 text-xs">₹{Number(r.convertedAmount).toLocaleString('en-IN')}</p>
                  )}
                  <span className={`text-xs ${r.status === 'COMPLETED' ? 'text-emerald-400' : r.status === 'FAILED' ? 'text-red-400' : 'text-amber-400'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

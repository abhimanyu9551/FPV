import { getCurrentUserProfile } from '@/lib/auth'
import { incomeService } from '@/lib/services/income.service'
import { CurrencyService } from '@/lib/services/currency.service'

export default async function IncomePage() {
  const profile = await getCurrentUserProfile()
  const [sources, entries] = await Promise.all([
    incomeService.listSources(profile.id),
    incomeService.listEntries(profile.id, 24),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Income</h1>
          <p className="text-gray-400 text-sm mt-1">Manage salary entries and allocation</p>
        </div>
        <a
          href="/income/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
        >
          + Add Income
        </a>
      </div>

      {/* Income Sources */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Income Sources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sources.map((source) => (
            <div key={source.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
              <p className="text-white font-medium">{source.name}</p>
              <p className="text-gray-500 text-xs mt-1">
                {source.sourceType} · {source.frequency} · {source.currencyCode}
              </p>
              {source.expectedAmount && (
                <p className="text-indigo-400 text-sm mt-2 font-medium">
                  ~{CurrencyService.format(Number(source.expectedAmount), source.currencyCode)}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Income History */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Income History</h2>
        {entries.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-10 text-center">
            <p className="text-gray-400">No income entries yet. Add your first salary entry.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex justify-between items-center">
                <div>
                  <p className="text-white text-sm font-medium">{entry.incomeSource.name}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(entry.receivedDate).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-semibold">{CurrencyService.format(Number(entry.baseAmountGbp), 'GBP')}</p>
                  {entry.originalCurrency !== 'GBP' && (
                    <p className="text-gray-500 text-xs">{entry.originalCurrency} {Number(entry.originalAmount).toLocaleString()}</p>
                  )}
                  <span className={`text-xs ${entry.isProcessed ? 'text-indigo-400' : 'text-amber-400'}`}>
                    {entry.isProcessed ? '✓ Allocated' : '⏳ Pending'}
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

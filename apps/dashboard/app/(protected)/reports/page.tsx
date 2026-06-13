import { getCurrentUserProfile } from '@/lib/auth'
import { reportsDAL } from '@/lib/dal/reports.dal'
import { CurrencyService } from '@/lib/services/currency.service'

export default async function ReportsPage() {
  await getCurrentUserProfile()
  const snapshots = await reportsDAL.listSnapshots()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monthly Reports</h1>
          <p className="text-gray-400 text-sm mt-1">Immutable financial snapshots</p>
        </div>
        <a
          href="/reports/generate"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
        >
          Generate Snapshot
        </a>
      </div>

      {snapshots.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-12 text-center">
          <p className="text-white font-medium">No snapshots yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Generate your first monthly snapshot to start tracking net worth over time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((snap, i) => {
            const prev = snapshots[i + 1]
            const delta = snap.netWorth?.deltaGbp ? Number(snap.netWorth.deltaGbp) : null
            return (
              <a
                key={snap.id}
                href={`/reports/${new Date(snap.snapshotMonth).toISOString().slice(0, 7)}`}
                className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">
                      {new Date(snap.snapshotMonth).toLocaleDateString('en-GB', {
                        month: 'long', year: 'numeric',
                      })}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {snap.isLocked ? '🔒 Locked' : '📝 Draft'} · {snap.verificationStatus}
                    </p>
                  </div>
                  <div className="text-right">
                    {snap.netWorth && (
                      <>
                        <p className="text-white font-semibold">
                          {CurrencyService.format(Number(snap.netWorth.netWorthGbp), 'GBP')}
                        </p>
                        {delta !== null && (
                          <p className={`text-xs ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {delta >= 0 ? '+' : ''}{CurrencyService.format(delta, 'GBP')} MoM
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

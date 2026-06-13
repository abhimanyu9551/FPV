import { getCurrentUserProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { CurrencyService } from '@/lib/services/currency.service'
import Link from 'next/link'

export default async function SavingsPage() {
  await getCurrentUserProfile()

  const goals = await db.savingsGoal.findMany({
    include: { contributions: { orderBy: { contributionDate: 'desc' } } },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Savings Goals</h1>
          <p className="text-gray-400 text-sm mt-1">Track progress toward your financial targets</p>
        </div>
        <button
          disabled
          className="px-4 py-2 bg-gray-800 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed"
          title="Coming soon"
        >
          + Add Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-16 text-center">
          <div className="text-4xl mb-4">◎</div>
          <p className="text-white font-medium">Savings goals coming soon</p>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            You&apos;ll be able to set targets for emergency fund, house deposit, India investments, and more.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {['Emergency Fund', 'House Deposit', 'India Investment', 'Holiday Fund'].map((g) => (
              <span key={g} className="px-3 py-1.5 bg-gray-800 text-gray-400 text-xs rounded-full border border-gray-700">
                {g}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const saved = goal.contributions.reduce((s, c) => s + Number(c.amount), 0)
            const target = Number(goal.targetAmount)
            const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0

            return (
              <div key={goal.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white font-semibold">{goal.name}</p>
                    {goal.targetDate && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        Target: {new Date(goal.targetDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold">{CurrencyService.format(saved, 'GBP')}</p>
                    <p className="text-gray-500 text-xs">of {CurrencyService.format(target, 'GBP')}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-right text-xs text-emerald-400 mt-1">{pct.toFixed(1)}%</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

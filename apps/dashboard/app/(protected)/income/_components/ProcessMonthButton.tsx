'use client'

import { useState } from 'react'

interface AllocationItem {
  label: string
  category: string
  totalAllocated: number
  percentOfCombined: number
  sourceBreakdown: { sourceName: string; amount: number }[]
}

interface ProcessResult {
  period: { year: number; month: number }
  entries: { sourceName: string; amount: number }[]
  pendingSources: { name: string; salaryDay: number | null; expectedAmount: number | null }[]
  allocation: {
    combinedIncome: number
    totalAllocated: number
    totalSavings: number
    hasWarnings: boolean
    warnings: { message: string }[]
    items: AllocationItem[]
  } | null
}

const CATEGORY_ICONS: Record<string, string> = {
  CREDIT_CARD_PAYMENT: '💳',
  EMI: '🏦',
  RENT: '🏠',
  GROCERIES: '🛒',
  LEISURE: '🎭',
  INVESTMENT: '📈',
  SAVINGS: '💰',
  GENERAL_EXPENSE: '📋',
  OTHER: '•',
}

function fmtGbp(n: number) {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProcessMonthButton({ year, month }: { year: number; month: number }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState('')

  async function handleProcess() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/v1/salary/process-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to process')
        return
      }
      setResult(await res.json())
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      <button
        onClick={handleProcess}
        disabled={loading}
        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition"
      >
        {loading ? 'Calculating…' : 'Process This Month'}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="space-y-4">
          {result.pendingSources.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-800 rounded-xl px-4 py-3">
              <p className="text-amber-300 text-sm font-medium mb-1">Salary not yet received:</p>
              {result.pendingSources.map((s) => (
                <p key={s.name} className="text-amber-400 text-xs">
                  {s.name}{s.salaryDay ? ` — expected on ${s.salaryDay}th` : ''}
                  {s.expectedAmount ? ` (~£${s.expectedAmount.toLocaleString()})` : ''}
                </p>
              ))}
            </div>
          )}

          {result.entries.length > 0 && (
            <div className="space-y-1">
              <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Income received</p>
              {result.entries.map((e, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-300">{e.sourceName}</span>
                  <span className="text-emerald-400 font-medium">{fmtGbp(e.amount)}</span>
                </div>
              ))}
              {result.allocation && (
                <div className="flex justify-between text-sm border-t border-gray-700 pt-1 mt-1">
                  <span className="text-white font-semibold">Combined</span>
                  <span className="text-white font-bold">{fmtGbp(result.allocation.combinedIncome)}</span>
                </div>
              )}
            </div>
          )}

          {result.allocation && (
            <>
              {result.allocation.hasWarnings && (
                <div className="bg-red-950/30 border border-red-800 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-red-300 text-xs font-medium">Shortfall warnings:</p>
                  {result.allocation.warnings.map((w, i) => (
                    <p key={i} className="text-red-400 text-xs">{w.message}</p>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Allocation Breakdown</p>
                {result.allocation.items.map((item) => (
                  <div key={item.ruleId} className="bg-gray-800/60 rounded-xl px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_ICONS[item.category] ?? '•'}</span>
                        <span className="text-white text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="text-white font-semibold">{fmtGbp(item.totalAllocated)}</span>
                    </div>
                    {item.sourceBreakdown.length > 1 && (
                      <div className="flex gap-3 pl-6">
                        {item.sourceBreakdown.map((sb) => (
                          <span key={sb.sourceName} className="text-gray-500 text-xs">
                            {sb.sourceName}: {fmtGbp(sb.amount)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-gray-600 text-xs pl-6">
                      {item.percentOfCombined.toFixed(1)}% of combined income
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl px-5 py-4 flex justify-between items-center">
                <div>
                  <p className="text-emerald-300 text-sm font-semibold">Monthly Savings</p>
                  <p className="text-gray-500 text-xs">After all allocations</p>
                </div>
                <p className="text-emerald-400 text-2xl font-bold">{fmtGbp(result.allocation.totalSavings)}</p>
              </div>
            </>
          )}

          {result.entries.length === 0 && (
            <p className="text-gray-500 text-sm">No income entries found for this month. Add salary entries first.</p>
          )}
        </div>
      )}
    </div>
  )
}

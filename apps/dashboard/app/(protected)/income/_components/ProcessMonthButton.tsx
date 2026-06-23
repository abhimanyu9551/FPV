'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  CreditCard, Landmark, Home, ShoppingCart, Theater, TrendingUp, PiggyBank, ClipboardList, Circle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface AllocationItem {
  ruleId?: string
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

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  CREDIT_CARD_PAYMENT: CreditCard,
  EMI: Landmark,
  RENT: Home,
  GROCERIES: ShoppingCart,
  LEISURE: Theater,
  INVESTMENT: TrendingUp,
  SAVINGS: PiggyBank,
  GENERAL_EXPENSE: ClipboardList,
  OTHER: Circle,
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
      <Button onClick={handleProcess} disabled={loading} variant="default" className="bg-success text-success-foreground hover:bg-success/90">
        {loading ? 'Calculating…' : 'Process This Month'}
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {result && (
        <div className="space-y-4">
          {result.pendingSources.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
              <p className="text-warning text-sm font-medium mb-1">Salary not yet received:</p>
              {result.pendingSources.map((s) => (
                <p key={s.name} className="text-warning/80 text-xs">
                  {s.name}{s.salaryDay ? ` — expected on ${s.salaryDay}th` : ''}
                  {s.expectedAmount ? ` (~£${s.expectedAmount.toLocaleString()})` : ''}
                </p>
              ))}
            </div>
          )}

          {result.entries.length > 0 && (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Income received</p>
              {result.entries.map((e, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{e.sourceName}</span>
                  <span className="text-success font-medium tabular-nums">{fmtGbp(e.amount)}</span>
                </div>
              ))}
              {result.allocation && (
                <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                  <span className="text-foreground font-semibold">Combined</span>
                  <span className="text-foreground font-bold tabular-nums">{fmtGbp(result.allocation.combinedIncome)}</span>
                </div>
              )}
            </div>
          )}

          {result.allocation && (
            <>
              {result.allocation.hasWarnings && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-destructive text-xs font-medium">Shortfall warnings:</p>
                  {result.allocation.warnings.map((w, i) => (
                    <p key={i} className="text-destructive/80 text-xs">{w.message}</p>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Allocation Breakdown</p>
                {result.allocation.items.map((item, idx) => {
                  const Icon = CATEGORY_ICONS[item.category] ?? Circle
                  return (
                    <div key={item.ruleId ?? idx} className="bg-muted rounded-xl px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground text-sm font-medium">{item.label}</span>
                        </div>
                        <span className="text-foreground font-semibold tabular-nums">{fmtGbp(item.totalAllocated)}</span>
                      </div>
                      {item.sourceBreakdown.length > 1 && (
                        <div className="flex gap-3 pl-6">
                          {item.sourceBreakdown.map((sb) => (
                            <span key={sb.sourceName} className="text-muted-foreground text-xs tabular-nums">
                              {sb.sourceName}: {fmtGbp(sb.amount)}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-muted-foreground/60 text-xs pl-6">
                        {item.percentOfCombined.toFixed(1)}% of combined income
                      </div>
                    </div>
                  )
                })}
              </div>

              <Card className="bg-success/10 border-success/30 flex-row items-center justify-between px-5 py-4">
                <div>
                  <p className="text-success text-sm font-semibold">Monthly Savings</p>
                  <p className="text-muted-foreground text-xs">After all allocations</p>
                </div>
                <p className="text-success text-2xl font-bold tabular-nums">{fmtGbp(result.allocation.totalSavings)}</p>
              </Card>
            </>
          )}

          {result.entries.length === 0 && (
            <p className="text-muted-foreground text-sm">No income entries found for this month. Add salary entries first.</p>
          )}
        </div>
      )}
    </div>
  )
}

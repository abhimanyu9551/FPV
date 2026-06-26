'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  CreditCard, Landmark, Home, ShoppingCart, Theater, TrendingUp, PiggyBank,
  ClipboardList, Circle, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Loader2, AlertTriangle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

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
  entries: { id: string; sourceName: string; amount: number; isProcessed: boolean }[]
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

interface CcOverride {
  ruleId: string
  label: string
  configuredAmount: number
  payFull: boolean
  fullAmount: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

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
  return `£${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function monthName(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString('en-GB', { month: 'long' })
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ProcessMonthButton({ year, month }: { year: number; month: number }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'cc' | 'breakdown'>('cc')
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState('')
  const [ccOverrides, setCcOverrides] = useState<CcOverride[]>([])

  async function handleOpen() {
    setLoading(true)
    setError('')
    setResult(null)
    setStep('cc')

    try {
      const res = await fetch('/api/v1/salary/process-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to load data')
        setOpen(true)
        return
      }

      setResult(data)

      const ccItems = (data.allocation?.items ?? []).filter(
        (i: AllocationItem) => i.category === 'CREDIT_CARD_PAYMENT'
      )
      const overrides: CcOverride[] = ccItems.map((item: AllocationItem) => ({
        ruleId: item.ruleId ?? item.label,
        label: item.label,
        configuredAmount: item.totalAllocated,
        payFull: false,
        fullAmount: '',
      }))
      setCcOverrides(overrides)

      // Skip CC step when there are no CC rules or no income
      setStep(overrides.length > 0 && data.entries.length > 0 ? 'cc' : 'breakdown')
      setOpen(true)
    } catch {
      setError('Network error — please try again')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  function updateOverride(ruleId: string, patch: Partial<CcOverride>) {
    setCcOverrides((prev) => prev.map((cc) => (cc.ruleId === ruleId ? { ...cc, ...patch } : cc)))
  }

  function getBreakdown() {
    if (!result?.allocation) return null

    const { combinedIncome, items } = result.allocation

    const ccTotal = ccOverrides.reduce((sum, cc) => {
      const amount = cc.payFull ? parseFloat(cc.fullAmount) || cc.configuredAmount : cc.configuredAmount
      return sum + amount
    }, 0)

    // Items that are not CC and not savings/investment/remaining — these are EMIs and fixed expenses
    const emiItems = items.filter(
      (i) =>
        i.category !== 'CREDIT_CARD_PAYMENT' &&
        i.category !== 'SAVINGS' &&
        i.category !== 'INVESTMENT' &&
        i.category !== 'REMAINING'
    )

    // Cumulative sufficiency: check each EMI against the running balance
    let runningBalance = combinedIncome - ccTotal
    const emiWithStatus = emiItems.map((item) => {
      const sufficient = runningBalance >= item.totalAllocated
      runningBalance -= item.totalAllocated
      return { ...item, sufficient }
    })

    const emiTotal = emiItems.reduce((s, i) => s + i.totalAllocated, 0)
    const remaining = combinedIncome - ccTotal - emiTotal

    return { combinedIncome, ccTotal, emiWithStatus, emiTotal, remaining }
  }

  const breakdown = step === 'breakdown' ? getBreakdown() : null

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={loading}
        className="bg-success text-success-foreground hover:bg-success/90"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading…
          </>
        ) : (
          'Process This Month'
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Process {monthName(month)} {year}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">
                {error}
              </div>
            )}

            {result && (
              <>
                {/* Pending sources warning */}
                {result.pendingSources.length > 0 && (
                  <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
                    <p className="text-warning text-xs font-semibold mb-1">Salary not yet received:</p>
                    {result.pendingSources.map((s) => (
                      <p key={s.name} className="text-warning/80 text-xs">
                        {s.name}
                        {s.salaryDay ? ` — expected on ${s.salaryDay}th` : ''}
                        {s.expectedAmount ? ` (~${fmtGbp(s.expectedAmount)})` : ''}
                      </p>
                    ))}
                  </div>
                )}

                {/* Income summary */}
                {result.entries.length > 0 ? (
                  <div className="bg-muted/50 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Income received
                    </p>
                    {result.entries.map((e, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{e.sourceName}</span>
                        <span className="font-medium tabular-nums text-success">{fmtGbp(e.amount)}</span>
                      </div>
                    ))}
                    {result.allocation && (
                      <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                        <span className="font-semibold text-foreground">Combined</span>
                        <span className="font-bold tabular-nums text-foreground">
                          {fmtGbp(result.allocation.combinedIncome)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    No income entries found for this month. Add salary entries first.
                  </p>
                )}

                {result.allocation && result.entries.length > 0 && (
                  <>
                    {/* ── Step 1: Credit Card Question ── */}
                    {step === 'cc' && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                            <CreditCard className="h-4 w-4 text-orange-500" />
                            Credit Card Payments
                          </h3>
                          <div className="space-y-4">
                            {ccOverrides.map((cc) => (
                              <div
                                key={cc.ruleId}
                                className="border border-border rounded-xl p-4 space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-foreground">
                                    {cc.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    Rule: {fmtGbp(cc.configuredAmount)}
                                  </span>
                                </div>

                                <p className="text-xs text-muted-foreground font-medium">
                                  Are you paying the full outstanding balance this month?
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => updateOverride(cc.ruleId, { payFull: false })}
                                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                      !cc.payFull
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted border-border text-muted-foreground hover:bg-accent'
                                    }`}
                                  >
                                    No — {fmtGbp(cc.configuredAmount)}
                                  </button>
                                  <button
                                    onClick={() => updateOverride(cc.ruleId, { payFull: true })}
                                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                      cc.payFull
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted border-border text-muted-foreground hover:bg-accent'
                                    }`}
                                  >
                                    Yes — Full balance
                                  </button>
                                </div>

                                {cc.payFull && (
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">
                                      Outstanding balance amount (£)
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="Enter full outstanding balance"
                                      value={cc.fullAmount}
                                      onChange={(e) =>
                                        updateOverride(cc.ruleId, { fullAmount: e.target.value })
                                      }
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button onClick={() => setStep('breakdown')} className="w-full">
                          Continue
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}

                    {/* ── Step 2: Breakdown ── */}
                    {step === 'breakdown' && breakdown && (
                      <div className="space-y-4">
                        {/* CC summary */}
                        {ccOverrides.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-semibold text-foreground">
                                Credit Cards
                              </span>
                              <span className="ml-auto text-sm font-bold tabular-nums text-destructive">
                                −{fmtGbp(breakdown.ccTotal)}
                              </span>
                            </div>
                            {ccOverrides.map((cc) => {
                              const paid = cc.payFull
                                ? parseFloat(cc.fullAmount) || cc.configuredAmount
                                : cc.configuredAmount
                              return (
                                <div
                                  key={cc.ruleId}
                                  className="flex justify-between text-xs pl-6 text-muted-foreground"
                                >
                                  <span>
                                    {cc.label}
                                    {cc.payFull ? ' (full balance)' : ''}
                                  </span>
                                  <span className="tabular-nums">{fmtGbp(paid)}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* EMI / fixed expenses */}
                        {breakdown.emiWithStatus.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Landmark className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-semibold text-foreground">
                                EMIs &amp; Fixed Expenses
                              </span>
                              <span className="ml-auto text-sm font-bold tabular-nums text-foreground">
                                −{fmtGbp(breakdown.emiTotal)}
                              </span>
                            </div>
                            {breakdown.emiWithStatus.map((item, i) => {
                              const Icon = CATEGORY_ICONS[item.category] ?? Circle
                              return (
                                <div
                                  key={item.ruleId ?? i}
                                  className="flex items-center justify-between pl-6"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {item.sufficient ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                    )}
                                    <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="text-xs text-foreground truncate">
                                      {item.label}
                                    </span>
                                    {!item.sufficient && (
                                      <span className="text-xs text-destructive font-medium shrink-0">
                                        Insufficient
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs tabular-nums text-muted-foreground shrink-0 ml-2">
                                    {fmtGbp(item.totalAllocated)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Savings / shortfall */}
                        <div
                          className={`rounded-xl px-4 py-4 flex items-center justify-between ${
                            breakdown.remaining >= 0
                              ? 'bg-success/10 border border-success/30'
                              : 'bg-destructive/10 border border-destructive/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {breakdown.remaining >= 0 ? (
                              <PiggyBank className="h-5 w-5 text-success" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                            )}
                            <div>
                              <p
                                className={`text-sm font-semibold ${
                                  breakdown.remaining >= 0 ? 'text-success' : 'text-destructive'
                                }`}
                              >
                                {breakdown.remaining >= 0 ? 'Remaining → Savings' : 'Shortfall'}
                              </p>
                              <p className="text-xs text-muted-foreground">After all allocations</p>
                            </div>
                          </div>
                          <p
                            className={`text-2xl font-bold tabular-nums ${
                              breakdown.remaining >= 0 ? 'text-success' : 'text-destructive'
                            }`}
                          >
                            {breakdown.remaining < 0 ? '−' : ''}
                            {fmtGbp(breakdown.remaining)}
                          </p>
                        </div>

                        {/* Engine warnings */}
                        {result.allocation.hasWarnings && (
                          <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 space-y-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                              <p className="text-xs font-medium text-warning">Warnings</p>
                            </div>
                            {result.allocation.warnings.map((w, i) => (
                              <p key={i} className="text-xs text-warning/80 pl-5">
                                {w.message}
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          {ccOverrides.length > 0 && (
                            <Button
                              variant="outline"
                              onClick={() => setStep('cc')}
                              className="gap-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Back
                            </Button>
                          )}
                          <Button
                            onClick={() => setOpen(false)}
                            className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

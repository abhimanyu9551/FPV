import { getCurrentUserProfile } from '@/lib/auth'
import { debtService } from '@/lib/services/debt.service'
import { debtsDAL } from '@/lib/dal/debts.dal'
import DebtsPageClient from './_components/DebtsPageClient'

export interface DebtSummary {
  id: string
  name: string
  debtType: string
  creditorName: string | null
  currencyCode: string
  outstandingBalance: number
  originalAmount: number
  interestRate: number | null
  minimumPayment: number | null
  payoffProgress: number
  monthsToPayoff: number
  estimatedPayoffDate: string
  priorityOrder: number
}

export interface CurrencyGroup {
  currency: string
  symbol: string
  totalOutstanding: number
  totalOriginal: number
  monthlyMinimums: number
  debtCount: number
  debts: DebtSummary[]
}

export interface MonthlyPaymentTotal {
  month: string
  monthKey: string
  gbp: number
  inr: number
  total: number
}

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  await getCurrentUserProfile()
  const sp = await searchParams

  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setMonth(fromDate.getMonth() - 6)
  const from = sp.from ? new Date(sp.from) : fromDate
  const to = sp.to ? new Date(sp.to) : toDate

  const [debts, plan, payments] = await Promise.all([
    debtsDAL.listActive(),
    debtService.buildPlan(),
    debtsDAL.listPaymentsInRange(from, to),
  ])

  const planMap = new Map(plan.debts.map((p) => [p.debtId, p]))

  const debtSummaries: DebtSummary[] = debts.map((d) => {
    const planItem = planMap.get(d.id)
    const outstanding = Number(d.outstandingBalance)
    const original = Number(d.originalAmount)
    const progress = original > 0 ? Math.max(0, Math.min(100, Math.round((1 - outstanding / original) * 100))) : 0
    return {
      id: d.id,
      name: d.name,
      debtType: d.debtType as string,
      creditorName: d.creditorName,
      currencyCode: d.currencyCode,
      outstandingBalance: outstanding,
      originalAmount: original,
      interestRate: d.interestRate ? Number(d.interestRate) : null,
      minimumPayment: d.minimumPayment ? Number(d.minimumPayment) : null,
      payoffProgress: progress,
      monthsToPayoff: planItem?.monthsToPayoff ?? 0,
      estimatedPayoffDate: planItem?.estimatedPayoffDate ?? '—',
      priorityOrder: planItem?.priorityOrder ?? 0,
    }
  })

  const byCurrency = new Map<string, DebtSummary[]>()
  for (const d of debtSummaries) {
    if (!byCurrency.has(d.currencyCode)) byCurrency.set(d.currencyCode, [])
    byCurrency.get(d.currencyCode)!.push(d)
  }

  const makeGroup = (currency: string): CurrencyGroup => {
    const list = byCurrency.get(currency) ?? []
    return {
      currency,
      symbol: currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : currency,
      totalOutstanding: list.reduce((s, d) => s + d.outstandingBalance, 0),
      totalOriginal: list.reduce((s, d) => s + d.originalAmount, 0),
      monthlyMinimums: list.reduce((s, d) => s + (d.minimumPayment ?? 0), 0),
      debtCount: list.length,
      debts: list,
    }
  }

  const allCurrencies = [...byCurrency.keys()]
  const gbpGroup = byCurrency.has('GBP') ? makeGroup('GBP') : null
  const inrGroup = byCurrency.has('INR') ? makeGroup('INR') : null
  const otherGroups = allCurrencies.filter((c) => c !== 'GBP' && c !== 'INR').map(makeGroup)

  // Group payments by month
  const monthMap = new Map<string, MonthlyPaymentTotal>()
  for (const p of payments) {
    const d = new Date(p.paymentDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    if (!monthMap.has(key)) monthMap.set(key, { month: label, monthKey: key, gbp: 0, inr: 0, total: 0 })
    const entry = monthMap.get(key)!
    const amount = Number(p.totalPayment)
    if (p.debt.currencyCode === 'GBP') entry.gbp += amount
    else if (p.debt.currencyCode === 'INR') entry.inr += amount
    entry.total += amount
  }
  const paymentHistory = [...monthMap.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey))

  return (
    <DebtsPageClient
      gbpGroup={gbpGroup}
      inrGroup={inrGroup}
      otherGroups={otherGroups}
      planSummary={{
        debtFreeDate: plan.debtFreeDate,
        totalMonths: plan.totalMonthsToDebtFree,
        totalInterestGbp: plan.totalInterestCost.toNumber(),
        totalMinimumGbp: plan.totalMinimumPayments.toNumber(),
      }}
      paymentHistory={paymentHistory}
      dateRange={{
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      }}
    />
  )
}

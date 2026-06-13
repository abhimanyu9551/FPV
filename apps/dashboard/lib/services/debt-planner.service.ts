import Decimal from 'decimal.js'
import { CurrencyService } from './currency.service'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface DebtInput {
  id: string
  name: string
  debtType: string
  outstandingBalance: Decimal
  interestRate: Decimal | null // APR %
  minimumPayment: Decimal | null
  repaymentStrategy: 'SNOWBALL' | 'AVALANCHE' | 'CUSTOM'
  priority: number
}

export interface DebtPlanItem {
  debtId: string
  debtName: string
  debtType: string
  currentBalance: Decimal
  interestRate: Decimal | null
  minimumPayment: Decimal
  priorityOrder: number
  monthsToPayoff: number
  totalInterestCost: Decimal
  estimatedPayoffDate: string // YYYY-MM
}

export interface DebtPlan {
  strategy: 'SNOWBALL' | 'AVALANCHE' | 'CUSTOM'
  debts: DebtPlanItem[]
  totalMonthsToDebtFree: number
  debtFreeDate: string // YYYY-MM
  totalInterestCost: Decimal
  interestSavedVsMinimumOnly: Decimal
  totalMinimumPayments: Decimal
}

// ─────────────────────────────────────────────────────────────
// Debt Planner Service
// ─────────────────────────────────────────────────────────────

export class DebtPlannerService {
  /**
   * Generate a full debt repayment plan.
   *
   * Snowball:  Pay minimums on all, focus extra on smallest balance first.
   * Avalanche: Pay minimums on all, focus extra on highest interest first.
   * Custom:    User-defined priority order (priority field ASC).
   *
   * For the purpose of this plan, we use minimumPayment only (conservative).
   * The dashboard will suggest extra payments from remainingCash.
   */
  buildPlan(debts: DebtInput[], strategy?: 'SNOWBALL' | 'AVALANCHE' | 'CUSTOM'): DebtPlan {
    if (debts.length === 0) {
      return this.emptyPlan(strategy ?? 'AVALANCHE')
    }

    const resolvedStrategy = strategy ?? debts[0].repaymentStrategy

    const sorted = this.sortByStrategy(debts, resolvedStrategy)

    const planItems: DebtPlanItem[] = sorted.map((debt, idx) => {
      const minPayment = debt.minimumPayment ?? new Decimal(50) // Default £50 if not set
      const { months, totalInterest } = this.calcPayoff(
        debt.outstandingBalance,
        debt.interestRate,
        minPayment
      )
      const payoffDate = this.addMonths(new Date(), months)

      return {
        debtId: debt.id,
        debtName: debt.name,
        debtType: debt.debtType,
        currentBalance: CurrencyService.round(debt.outstandingBalance),
        interestRate: debt.interestRate,
        minimumPayment: CurrencyService.round(minPayment),
        priorityOrder: idx + 1,
        monthsToPayoff: months,
        totalInterestCost: CurrencyService.round(totalInterest),
        estimatedPayoffDate: payoffDate,
      }
    })

    const totalMonths = Math.max(...planItems.map((d) => d.monthsToPayoff), 0)
    const totalInterest = planItems.reduce(
      (sum, d) => sum.plus(d.totalInterestCost),
      new Decimal(0)
    )
    const totalMinimums = planItems.reduce(
      (sum, d) => sum.plus(d.minimumPayment),
      new Decimal(0)
    )

    // Interest if only minimums were paid forever (no extra principal) — rough comparison
    const minimumOnlyInterest = planItems.reduce((sum, d) => {
      const { totalInterest: minOnlyInterest } = this.calcPayoff(
        d.currentBalance,
        d.interestRate,
        d.minimumPayment
      )
      return sum.plus(minOnlyInterest)
    }, new Decimal(0))

    return {
      strategy: resolvedStrategy,
      debts: planItems,
      totalMonthsToDebtFree: totalMonths,
      debtFreeDate: this.addMonths(new Date(), totalMonths),
      totalInterestCost: CurrencyService.round(totalInterest),
      interestSavedVsMinimumOnly: CurrencyService.round(minimumOnlyInterest.minus(totalInterest).clampedTo(0, Infinity)),
      totalMinimumPayments: CurrencyService.round(totalMinimums),
    }
  }

  /**
   * Calculate months to payoff and total interest for one debt.
   * Uses the standard amortization formula.
   * If interestRate is null/0, it's an interest-free loan.
   */
  calcPayoff(
    balance: Decimal,
    annualRatePct: Decimal | null,
    monthlyPayment: Decimal
  ): { months: number; totalInterest: Decimal } {
    if (balance.lessThanOrEqualTo(0)) return { months: 0, totalInterest: new Decimal(0) }

    const monthlyRate = annualRatePct
      ? new Decimal(annualRatePct).div(100).div(12)
      : new Decimal(0)

    if (monthlyRate.isZero()) {
      // Interest-free
      const months = Math.ceil(balance.div(monthlyPayment).toNumber())
      return { months, totalInterest: new Decimal(0) }
    }

    // Standard amortization: n = -ln(1 - (r*P)/M) / ln(1+r)
    const r = monthlyRate.toNumber()
    const P = balance.toNumber()
    const M = monthlyPayment.toNumber()

    if (M <= P * r) {
      // Payment doesn't cover interest — debt grows forever
      return { months: 999, totalInterest: new Decimal(999999) }
    }

    const months = Math.ceil(-Math.log(1 - (r * P) / M) / Math.log(1 + r))
    const totalPaid = months * M
    const totalInterest = Math.max(0, totalPaid - P)

    return {
      months,
      totalInterest: new Decimal(totalInterest).toDecimalPlaces(2),
    }
  }

  /**
   * Suggest extra payment allocation using the focus debt (position 1 in plan).
   * Given an extra_cash amount, recommends how much to apply to which debt.
   */
  suggestExtraPayment(plan: DebtPlan, extraCashGbp: Decimal): { debtId: string; extraAmount: Decimal } | null {
    if (plan.debts.length === 0 || extraCashGbp.lessThanOrEqualTo(0)) return null
    const focusDebt = plan.debts[0] // Already sorted by strategy
    return { debtId: focusDebt.debtId, extraAmount: extraCashGbp }
  }

  private sortByStrategy(debts: DebtInput[], strategy: 'SNOWBALL' | 'AVALANCHE' | 'CUSTOM'): DebtInput[] {
    switch (strategy) {
      case 'SNOWBALL':
        return [...debts].sort((a, b) =>
          a.outstandingBalance.comparedTo(b.outstandingBalance)
        )
      case 'AVALANCHE':
        return [...debts].sort((a, b) => {
          const rateA = a.interestRate ?? new Decimal(0)
          const rateB = b.interestRate ?? new Decimal(0)
          return rateB.comparedTo(rateA) // Descending — highest rate first
        })
      case 'CUSTOM':
        return [...debts].sort((a, b) => a.priority - b.priority)
    }
  }

  private addMonths(date: Date, months: number): string {
    const d = new Date(date)
    d.setMonth(d.getMonth() + months)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  private emptyPlan(strategy: 'SNOWBALL' | 'AVALANCHE' | 'CUSTOM'): DebtPlan {
    return {
      strategy,
      debts: [],
      totalMonthsToDebtFree: 0,
      debtFreeDate: this.addMonths(new Date(), 0),
      totalInterestCost: new Decimal(0),
      interestSavedVsMinimumOnly: new Decimal(0),
      totalMinimumPayments: new Decimal(0),
    }
  }
}

export const debtPlannerService = new DebtPlannerService()

import Decimal from 'decimal.js'
import { CurrencyService, manualRateProvider } from './currency.service'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface AllocationRuleInput {
  id: string
  allocationOrder: number
  label: string
  targetType: string
  targetId: string | null
  allocationType: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING'
  allocationValue: Decimal | null
  allocationPercent: Decimal | null
  minAmount: Decimal | null
  maxAmount: Decimal | null
  isEnabled: boolean
}

export interface AllocationItem {
  ruleId: string
  label: string
  targetType: string
  targetId: string | null
  allocatedAmount: Decimal // GBP
  percentage: Decimal      // % of total income
}

export interface AllocationWarning {
  ruleId: string
  label: string
  requested: Decimal
  allocated: Decimal
  message: string
}

export interface AllocationResult {
  incomeAmountGbp: Decimal
  totalAllocated: Decimal
  remainingCash: Decimal
  items: AllocationItem[]
  warnings: AllocationWarning[]
  hasWarnings: boolean
}

// ─────────────────────────────────────────────────────────────
// Allocation Engine
// ─────────────────────────────────────────────────────────────

export class AllocationEngine {
  /**
   * Run the priority allocation algorithm on a salary amount.
   *
   * Rules are processed in ascending allocationOrder.
   * Types:
   *   FIXED_AMOUNT  — allocate exactly allocationValue (or what remains, whichever is less)
   *   PERCENTAGE    — allocate allocationPercent % of the original income
   *   REMAINING     — allocate all remaining cash (only one REMAINING rule should exist)
   *
   * Any rule that cannot be fully funded generates a warning.
   * The function never throws for under-funding — it soft-warns.
   */
  run(
    incomeAmountGbp: number | Decimal,
    rules: AllocationRuleInput[]
  ): AllocationResult {
    const income = CurrencyService.round(incomeAmountGbp)
    let remaining = income
    const items: AllocationItem[] = []
    const warnings: AllocationWarning[] = []

    const enabledRules = rules
      .filter((r) => r.isEnabled)
      .sort((a, b) => a.allocationOrder - b.allocationOrder)

    for (const rule of enabledRules) {
      let requested: Decimal

      switch (rule.allocationType) {
        case 'FIXED_AMOUNT': {
          requested = CurrencyService.round(rule.allocationValue ?? 0)
          break
        }
        case 'PERCENTAGE': {
          const pct = rule.allocationPercent ?? new Decimal(0)
          requested = CurrencyService.round(income.mul(pct).div(100))
          break
        }
        case 'REMAINING': {
          requested = remaining.greaterThan(0) ? remaining : new Decimal(0)
          break
        }
        default:
          continue
      }

      // Enforce min/max bounds
      if (rule.minAmount && requested.lessThan(rule.minAmount)) {
        requested = CurrencyService.round(rule.minAmount)
      }
      if (rule.maxAmount && requested.greaterThan(rule.maxAmount)) {
        requested = CurrencyService.round(rule.maxAmount)
      }

      // Clamp to remaining — we never allocate more than we have
      const allocated = Decimal.min(requested, remaining.greaterThan(0) ? remaining : new Decimal(0))

      remaining = CurrencyService.round(remaining.minus(allocated))

      items.push({
        ruleId: rule.id,
        label: rule.label,
        targetType: rule.targetType,
        targetId: rule.targetId,
        allocatedAmount: allocated,
        percentage: income.greaterThan(0)
          ? CurrencyService.round(allocated.div(income).mul(100))
          : new Decimal(0),
      })

      if (allocated.lessThan(requested)) {
        warnings.push({
          ruleId: rule.id,
          label: rule.label,
          requested,
          allocated,
          message: `Insufficient funds: needed £${requested.toFixed(2)}, allocated £${allocated.toFixed(2)}`,
        })
      }
    }

    const totalAllocated = items.reduce(
      (sum, item) => sum.plus(item.allocatedAmount),
      new Decimal(0)
    )

    return {
      incomeAmountGbp: income,
      totalAllocated: CurrencyService.round(totalAllocated),
      remainingCash: CurrencyService.round(remaining),
      items,
      warnings,
      hasWarnings: warnings.length > 0,
    }
  }

  /**
   * Preview allocation without persisting — returns same result but caller
   * must not save. Used by /api/v1/salary/preview.
   */
  preview(incomeAmountGbp: number | Decimal, rules: AllocationRuleInput[]): AllocationResult {
    return this.run(incomeAmountGbp, rules)
  }

  /**
   * Validate a set of rules before saving.
   * Returns any structural errors (e.g., multiple REMAINING rules, % > 100).
   */
  validate(rules: AllocationRuleInput[]): string[] {
    const errors: string[] = []
    const enabledRules = rules.filter((r) => r.isEnabled)

    const remainingCount = enabledRules.filter((r) => r.allocationType === 'REMAINING').length
    if (remainingCount > 1) {
      errors.push('Only one REMAINING rule is allowed. Others become dead rules.')
    }

    const totalPct = enabledRules
      .filter((r) => r.allocationType === 'PERCENTAGE')
      .reduce((sum, r) => sum.plus(r.allocationPercent ?? 0), new Decimal(0))

    if (totalPct.greaterThan(100)) {
      errors.push(`Total percentage allocations (${totalPct.toFixed(2)}%) exceed 100%.`)
    }

    const duplicateOrders = enabledRules
      .map((r) => r.allocationOrder)
      .filter((order, i, arr) => arr.indexOf(order) !== i)
    if (duplicateOrders.length > 0) {
      errors.push(`Duplicate allocation orders: ${[...new Set(duplicateOrders)].join(', ')}`)
    }

    return errors
  }
}

export const allocationEngine = new AllocationEngine()

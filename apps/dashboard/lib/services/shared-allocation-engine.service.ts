import Decimal from 'decimal.js'
import { CurrencyService } from './currency.service'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SourceInput {
  id: string
  name: string
  availableGbp: Decimal
}

export interface SharedRuleSplitInput {
  incomeSourceId: string
  contributionPercent: Decimal // 0-100: % of rule total from this source
}

export interface SharedRuleInput {
  id: string
  allocationOrder: number
  label: string
  category: string
  allocationType: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING'
  allocationValue: Decimal | null   // For FIXED_AMOUNT
  allocationPercent: Decimal | null // For PERCENTAGE of combined income
  isEnabled: boolean
  splits: SharedRuleSplitInput[]
}

export interface SharedAllocationItem {
  ruleId: string
  label: string
  category: string
  totalAllocated: Decimal       // GBP total across all sources
  bySource: Record<string, Decimal> // sourceId → amount allocated
  percentOfCombined: Decimal
}

export interface SharedAllocationWarning {
  ruleId: string
  label: string
  sourceId: string
  sourceName: string
  requested: Decimal
  allocated: Decimal
  message: string
}

export interface SharedAllocationResult {
  combinedIncome: Decimal
  items: SharedAllocationItem[]
  sourceRemaining: Record<string, Decimal>  // sourceId → remaining GBP
  totalAllocated: Decimal
  totalSavings: Decimal  // sum of all sourceRemaining
  warnings: SharedAllocationWarning[]
  hasWarnings: boolean
}

// ─────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────

export class SharedAllocationEngine {
  /**
   * Run allocation across multiple income sources using shared rules.
   *
   * For each rule:
   *   1. Compute rule's total GBP (fixed / % of combined / remaining combined)
   *   2. Split across sources by contributionPercent
   *   3. Deduct from each source; shortfalls soft-warn
   *
   * Rules with no splits deduct from the source with the largest remaining balance.
   */
  run(sources: SourceInput[], rules: SharedRuleInput[]): SharedAllocationResult {
    const combinedIncome = sources.reduce(
      (sum, s) => sum.plus(s.availableGbp),
      new Decimal(0)
    )

    // Mutable remaining per source
    const remaining: Record<string, Decimal> = {}
    for (const s of sources) remaining[s.id] = CurrencyService.round(s.availableGbp)

    const sourceMap = new Map(sources.map((s) => [s.id, s]))
    const items: SharedAllocationItem[] = []
    const warnings: SharedAllocationWarning[] = []

    const enabledRules = rules
      .filter((r) => r.isEnabled)
      .sort((a, b) => a.allocationOrder - b.allocationOrder)

    for (const rule of enabledRules) {
      const combinedRemaining = Object.values(remaining).reduce(
        (s, v) => s.plus(v),
        new Decimal(0)
      )

      // Compute this rule's total target
      let ruleTotal: Decimal
      switch (rule.allocationType) {
        case 'FIXED_AMOUNT':
          ruleTotal = CurrencyService.round(rule.allocationValue ?? 0)
          break
        case 'PERCENTAGE':
          ruleTotal = CurrencyService.round(
            combinedIncome.mul(rule.allocationPercent ?? 0).div(100)
          )
          break
        case 'REMAINING':
          ruleTotal = combinedRemaining.greaterThan(0) ? combinedRemaining : new Decimal(0)
          break
        default:
          continue
      }

      const bySource: Record<string, Decimal> = {}

      if (rule.splits.length === 0) {
        // No splits: deduct from largest remaining source
        const richestId = Object.entries(remaining).sort((a, b) =>
          b[1].minus(a[1]).toNumber()
        )[0]?.[0]

        if (richestId) {
          const allocated = Decimal.min(
            ruleTotal,
            remaining[richestId].greaterThan(0) ? remaining[richestId] : new Decimal(0)
          )
          bySource[richestId] = allocated
          remaining[richestId] = CurrencyService.round(remaining[richestId].minus(allocated))

          if (allocated.lessThan(ruleTotal)) {
            const src = sourceMap.get(richestId)!
            warnings.push({
              ruleId: rule.id,
              label: rule.label,
              sourceId: richestId,
              sourceName: src.name,
              requested: ruleTotal,
              allocated,
              message: `${rule.label}: needed £${ruleTotal.toFixed(2)}, allocated £${allocated.toFixed(2)} from ${src.name}`,
            })
          }
        }
      } else {
        // Deduct per split
        for (const split of rule.splits) {
          const sourceId = split.incomeSourceId
          if (!(sourceId in remaining)) continue

          const contribution = CurrencyService.round(
            ruleTotal.mul(split.contributionPercent).div(100)
          )
          const avail = remaining[sourceId].greaterThan(0) ? remaining[sourceId] : new Decimal(0)
          const allocated = Decimal.min(contribution, avail)

          bySource[sourceId] = allocated
          remaining[sourceId] = CurrencyService.round(remaining[sourceId].minus(allocated))

          if (allocated.lessThan(contribution)) {
            const src = sourceMap.get(sourceId)
            warnings.push({
              ruleId: rule.id,
              label: rule.label,
              sourceId,
              sourceName: src?.name ?? sourceId,
              requested: contribution,
              allocated,
              message: `${rule.label}: needed £${contribution.toFixed(2)} from ${src?.name ?? sourceId}, allocated £${allocated.toFixed(2)}`,
            })
          }
        }
      }

      const totalForRule = Object.values(bySource).reduce(
        (s, v) => s.plus(v),
        new Decimal(0)
      )

      items.push({
        ruleId: rule.id,
        label: rule.label,
        category: rule.category,
        totalAllocated: totalForRule,
        bySource,
        percentOfCombined: combinedIncome.greaterThan(0)
          ? CurrencyService.round(totalForRule.div(combinedIncome).mul(100))
          : new Decimal(0),
      })
    }

    const totalAllocated = items.reduce(
      (s, item) => s.plus(item.totalAllocated),
      new Decimal(0)
    )

    const totalSavings = Object.values(remaining).reduce(
      (s, v) => s.plus(v),
      new Decimal(0)
    )

    return {
      combinedIncome: CurrencyService.round(combinedIncome),
      items,
      sourceRemaining: remaining,
      totalAllocated: CurrencyService.round(totalAllocated),
      totalSavings: CurrencyService.round(totalSavings),
      warnings,
      hasWarnings: warnings.length > 0,
    }
  }

  preview(sources: SourceInput[], rules: SharedRuleInput[]): SharedAllocationResult {
    return this.run(sources, rules)
  }
}

export const sharedAllocationEngine = new SharedAllocationEngine()

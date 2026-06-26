import Decimal from 'decimal.js'
import { CurrencyService } from './currency.service'
import { conditionEvaluator, type ConditionContext } from './condition-evaluator.service'
import type {
  FinancialRule,
  FinancialRuleSplit,
  FinancialRuleCondition,
  AllocationType,
  AllocationTarget,
} from '@prisma/client'

// ─────────────────────────────────────────────────────────────
// Input / output types
// ─────────────────────────────────────────────────────────────

export interface RuleEngineSource {
  id: string
  name: string
  userId: string
  availableGbp: Decimal
}

export interface RuleWithRelations extends FinancialRule {
  splits: FinancialRuleSplit[]
  conditions: FinancialRuleCondition[]
}

export interface RuleExecutionItem {
  financialRuleId: string
  label: string
  category: string
  targetType: string
  targetId: string | null
  totalAllocated: Decimal
  bySource: Record<string, Decimal>  // sourceId → amount
  percentOfCombined: Decimal
  wasConditionSkipped: boolean
}

export interface RuleEngineWarning {
  financialRuleId: string
  label: string
  sourceId: string
  requested: Decimal
  allocated: Decimal
  message: string
}

export interface RuleEngineResult {
  combinedIncome: Decimal
  items: RuleExecutionItem[]
  sourceRemaining: Record<string, Decimal>
  totalAllocated: Decimal
  totalRemaining: Decimal
  warnings: RuleEngineWarning[]
  hasWarnings: boolean
}

// ─────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────

export class RuleEngine {
  run(
    sources: RuleEngineSource[],
    rules: RuleWithRelations[],
    conditionCtx: ConditionContext,
    today: Date = new Date(),
  ): RuleEngineResult {
    const combinedIncome = sources.reduce(
      (s, src) => s.plus(src.availableGbp),
      new Decimal(0),
    )

    const remaining: Record<string, Decimal> = {}
    for (const src of sources) remaining[src.id] = CurrencyService.round(src.availableGbp)

    const sourceMap = new Map(sources.map((s) => [s.id, s]))

    const activeRules = rules
      .filter((r) => {
        if (!r.isActive) return false
        if (r.startDate && today < new Date(r.startDate)) return false
        if (r.endDate && today > new Date(r.endDate)) return false
        return true
      })
      .sort((a, b) => a.priority - b.priority)

    const items: RuleExecutionItem[] = []
    const warnings: RuleEngineWarning[] = []

    for (const rule of activeRules) {
      // Skip rules tied to a specific income source if none of our sources match
      if (rule.incomeSourceId) {
        const matchingSources = sources.filter((s) => s.id === rule.incomeSourceId)
        if (matchingSources.length === 0) continue
      }

      // Evaluate conditions
      if (rule.conditions.length > 0) {
        const pass = conditionEvaluator.evaluate(rule.conditions, conditionCtx)
        if (!pass) {
          items.push(skippedItem(rule))
          continue
        }
      }

      const combinedRemaining = Object.values(remaining).reduce(
        (s, v) => s.plus(v),
        new Decimal(0),
      )

      // Compute rule total
      let ruleTotal: Decimal
      switch (rule.allocationType as AllocationType) {
        case 'FIXED_AMOUNT':
          ruleTotal = CurrencyService.round(rule.allocationValue ?? 0)
          break
        case 'PERCENTAGE':
          ruleTotal = CurrencyService.round(
            combinedIncome.mul(rule.allocationPercent ?? 0).div(100),
          )
          break
        case 'REMAINING':
          ruleTotal = combinedRemaining.greaterThan(0) ? combinedRemaining : new Decimal(0)
          break
        default:
          continue
      }

      // Apply min/max bounds
      if (rule.minAmount && ruleTotal.lessThan(new Decimal(rule.minAmount.toString()))) {
        ruleTotal = CurrencyService.round(rule.minAmount)
      }
      if (rule.maxAmount && ruleTotal.greaterThan(new Decimal(rule.maxAmount.toString()))) {
        ruleTotal = CurrencyService.round(rule.maxAmount)
      }

      const bySource = rule.paymentResponsibility === 'SHARED' && rule.splits.length > 0
        ? deductSplitByPerson(rule, ruleTotal, remaining, sourceMap, warnings)
        : deductFromSources(rule, ruleTotal, remaining, sourceMap, sources, warnings)

      const totalForRule = Object.values(bySource).reduce((s, v) => s.plus(v), new Decimal(0))

      items.push({
        financialRuleId: rule.id,
        label: rule.name,
        category: rule.category,
        targetType: rule.targetType as string,
        targetId: rule.targetId,
        totalAllocated: totalForRule,
        bySource,
        percentOfCombined: combinedIncome.greaterThan(0)
          ? CurrencyService.round(totalForRule.div(combinedIncome).mul(100))
          : new Decimal(0),
        wasConditionSkipped: false,
      })
    }

    const totalAllocated = items.reduce(
      (s, item) => s.plus(item.totalAllocated),
      new Decimal(0),
    )
    const totalRemaining = Object.values(remaining).reduce((s, v) => s.plus(v), new Decimal(0))

    return {
      combinedIncome: CurrencyService.round(combinedIncome),
      items,
      sourceRemaining: remaining,
      totalAllocated: CurrencyService.round(totalAllocated),
      totalRemaining: CurrencyService.round(totalRemaining),
      warnings,
      hasWarnings: warnings.length > 0,
    }
  }

  preview(
    sources: RuleEngineSource[],
    rules: RuleWithRelations[],
    conditionCtx: ConditionContext,
    today?: Date,
  ): RuleEngineResult {
    return this.run(sources, rules, conditionCtx, today)
  }
}

export const ruleEngine = new RuleEngine()

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function deductSplitByPerson(
  rule: RuleWithRelations,
  ruleTotal: Decimal,
  remaining: Record<string, Decimal>,
  sourceMap: Map<string, RuleEngineSource>,
  warnings: RuleEngineWarning[],
): Record<string, Decimal> {
  const bySource: Record<string, Decimal> = {}

  for (const split of rule.splits) {
    // Find all sources belonging to this user
    const userSources = [...sourceMap.values()].filter((s) => s.userId === split.userId)
    if (userSources.length === 0) continue

    const contribution = CurrencyService.round(
      ruleTotal.mul(new Decimal(split.percent.toString())).div(100),
    )

    // Deduct from this user's sources in order of available balance (largest first)
    let toDeduct = contribution
    const sortedSources = userSources.sort(
      (a, b) => (remaining[b.id] ?? new Decimal(0)).minus(remaining[a.id] ?? new Decimal(0)).toNumber(),
    )

    for (const src of sortedSources) {
      if (toDeduct.lessThanOrEqualTo(0)) break
      const avail = remaining[src.id] ?? new Decimal(0)
      const take = Decimal.min(toDeduct, avail.greaterThan(0) ? avail : new Decimal(0))
      bySource[src.id] = (bySource[src.id] ?? new Decimal(0)).plus(take)
      remaining[src.id] = CurrencyService.round(avail.minus(take))
      toDeduct = CurrencyService.round(toDeduct.minus(take))
    }

    if (toDeduct.greaterThan(0)) {
      const srcId = sortedSources[0]?.id ?? 'unknown'
      warnings.push({
        financialRuleId: rule.id,
        label: rule.name,
        sourceId: srcId,
        requested: contribution,
        allocated: contribution.minus(toDeduct),
        message: `${rule.name}: needed £${contribution.toFixed(2)} for user split, allocated £${contribution.minus(toDeduct).toFixed(2)}`,
      })
    }
  }

  return bySource
}

function deductFromSources(
  rule: RuleWithRelations,
  ruleTotal: Decimal,
  remaining: Record<string, Decimal>,
  sourceMap: Map<string, RuleEngineSource>,
  sources: RuleEngineSource[],
  warnings: RuleEngineWarning[],
): Record<string, Decimal> {
  const bySource: Record<string, Decimal> = {}

  // For INDIVIDUAL rules, prefer the source tied to the rule's incomeSourceId
  // otherwise use the largest remaining source
  const candidateSources = rule.incomeSourceId
    ? sources.filter((s) => s.id === rule.incomeSourceId)
    : [...sourceMap.values()].sort(
        (a, b) => (remaining[b.id] ?? new Decimal(0)).minus(remaining[a.id] ?? new Decimal(0)).toNumber(),
      )

  let toDeduct = ruleTotal
  for (const src of candidateSources) {
    if (toDeduct.lessThanOrEqualTo(0)) break
    const avail = remaining[src.id] ?? new Decimal(0)
    const take = Decimal.min(toDeduct, avail.greaterThan(0) ? avail : new Decimal(0))
    bySource[src.id] = (bySource[src.id] ?? new Decimal(0)).plus(take)
    remaining[src.id] = CurrencyService.round(avail.minus(take))
    toDeduct = CurrencyService.round(toDeduct.minus(take))
  }

  if (toDeduct.greaterThan(0)) {
    const srcId = candidateSources[0]?.id ?? 'unknown'
    warnings.push({
      financialRuleId: rule.id,
      label: rule.name,
      sourceId: srcId,
      requested: ruleTotal,
      allocated: ruleTotal.minus(toDeduct),
      message: `${rule.name}: needed £${ruleTotal.toFixed(2)}, allocated £${ruleTotal.minus(toDeduct).toFixed(2)}`,
    })
  }

  return bySource
}

function skippedItem(rule: RuleWithRelations): RuleExecutionItem {
  return {
    financialRuleId: rule.id,
    label: rule.name,
    category: rule.category,
    targetType: rule.targetType as string,
    targetId: rule.targetId,
    totalAllocated: new Decimal(0),
    bySource: {},
    percentOfCombined: new Decimal(0),
    wasConditionSkipped: true,
  }
}

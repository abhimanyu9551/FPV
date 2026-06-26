import Decimal from 'decimal.js'
import type { FinancialRuleCondition, ConditionOperator } from '@prisma/client'

export interface ConditionContext {
  salaryAmountGbp: Decimal
  currentMonth: number       // 1-12
  currentYear: number
  incomeSourceId?: string
  creditCardBalances: Record<string, Decimal>  // debtId → balance
  savingsGoalBalances: Record<string, Decimal> // goalId → currentAmount
}

type ConditionRow = Pick<
  FinancialRuleCondition,
  'conditionField' | 'operator' | 'value' | 'valueB' | 'stringValue'
>

export const conditionEvaluator = {
  evaluate(conditions: ConditionRow[], ctx: ConditionContext): boolean {
    return conditions.every((c) => evaluateOne(c, ctx))
  },
}

function resolveField(field: string, ctx: ConditionContext): Decimal | string | null {
  switch (field) {
    case 'salary':
      return ctx.salaryAmountGbp
    case 'month':
      return String(ctx.currentMonth)
    case 'year':
      return new Decimal(ctx.currentYear)
    case 'income_source':
      return ctx.incomeSourceId ?? null
    default:
      if (field.startsWith('credit_card_balance:')) {
        const id = field.split(':')[1]
        return ctx.creditCardBalances[id] ?? new Decimal(0)
      }
      if (field.startsWith('savings_goal:')) {
        const id = field.split(':')[1]
        return ctx.savingsGoalBalances[id] ?? new Decimal(0)
      }
      return null
  }
}

function evaluateOne(c: ConditionRow, ctx: ConditionContext): boolean {
  const fieldValue = resolveField(c.conditionField, ctx)
  if (fieldValue === null) return true // unknown field → pass through

  const op = c.operator as ConditionOperator

  // String-based operators
  if (op === 'MONTH_IS' || op === 'INCOME_SOURCE_IS') {
    const strVal = typeof fieldValue === 'string' ? fieldValue : String(fieldValue)
    return strVal === (c.stringValue ?? '')
  }

  // Numeric operators
  if (typeof fieldValue === 'string') return true
  const num = fieldValue as Decimal
  const a = c.value ? new Decimal(c.value.toString()) : new Decimal(0)
  const b = c.valueB ? new Decimal(c.valueB.toString()) : new Decimal(0)

  switch (op) {
    case 'GT':      return num.greaterThan(a)
    case 'GTE':     return num.greaterThanOrEqualTo(a)
    case 'LT':      return num.lessThan(a)
    case 'LTE':     return num.lessThanOrEqualTo(a)
    case 'EQ':      return num.equals(a)
    case 'BETWEEN': return num.greaterThanOrEqualTo(a) && num.lessThanOrEqualTo(b)
    default:        return true
  }
}

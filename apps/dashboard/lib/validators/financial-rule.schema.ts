import { z } from 'zod'

export const allocationTargetEnum = z.enum([
  'ACCOUNT', 'REMITTANCE_CATEGORY', 'BUDGET_CATEGORY', 'SAVINGS_GOAL', 'DEBT',
])

export const allocationTypeEnum = z.enum(['FIXED_AMOUNT', 'PERCENTAGE', 'REMAINING'])

const ruleCategoryEnum = z.enum([
  'SAVINGS', 'INVESTMENT', 'DEBT', 'CREDIT_CARD', 'EMI',
  'RENT', 'MORTGAGE', 'UTILITIES', 'GROCERY', 'LEISURE',
  'INSURANCE', 'INDIAN_ACCOUNT', 'CUSTOM',
])

const conditionOperatorEnum = z.enum([
  'GT', 'GTE', 'LT', 'LTE', 'EQ', 'BETWEEN', 'MONTH_IS', 'INCOME_SOURCE_IS',
])

const conditionSchema = z.object({
  conditionField: z.string().min(1),
  operator: conditionOperatorEnum,
  value: z.number().optional().nullable(),
  valueB: z.number().optional().nullable(),
  stringValue: z.string().optional().nullable(),
})

const splitSchema = z.object({
  userId: z.string().min(1),
  percent: z.number().min(0.01).max(100),
})

export const createFinancialRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  category: ruleCategoryEnum,
  priority: z.number().int().min(1),
  isActive: z.boolean().default(true),
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
  allocationType: allocationTypeEnum,
  allocationValue: z.number().positive().optional().nullable(),
  allocationPercent: z.number().positive().max(100).optional().nullable(),
  minAmount: z.number().positive().optional().nullable(),
  maxAmount: z.number().positive().optional().nullable(),
  targetType: allocationTargetEnum,
  targetId: z.string().optional().nullable(),
  paymentResponsibility: z.enum(['INDIVIDUAL', 'SHARED']).default('INDIVIDUAL'),
  incomeSourceId: z.string().optional().nullable(),
  carryForward: z.boolean().default(false),
  carryForwardTarget: z.enum([
    'LEAVE_IN_ACCOUNT', 'MOVE_TO_SAVINGS', 'MOVE_TO_INVESTMENT', 'MOVE_TO_GOAL',
  ]).optional().nullable(),
  savingsGoalId: z.string().optional().nullable(),
  splits: z.array(splitSchema).default([]),
  conditions: z.array(conditionSchema).default([]),
  changeNote: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.allocationType === 'FIXED_AMOUNT' && !data.allocationValue) {
    ctx.addIssue({ code: 'custom', path: ['allocationValue'], message: 'Required for FIXED_AMOUNT rules' })
  }
  if (data.allocationType === 'PERCENTAGE' && !data.allocationPercent) {
    ctx.addIssue({ code: 'custom', path: ['allocationPercent'], message: 'Required for PERCENTAGE rules' })
  }
  if (data.paymentResponsibility === 'SHARED') {
    if (data.splits.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['splits'], message: 'SHARED rules require at least one split' })
    } else {
      const total = data.splits.reduce((s, sp) => s + sp.percent, 0)
      if (Math.abs(total - 100) > 0.01) {
        ctx.addIssue({ code: 'custom', path: ['splits'], message: `Split percentages must sum to 100% (got ${total.toFixed(2)}%)` })
      }
    }
  }
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be after start date' })
  }
})

// Update schema — same fields but all optional (no cross-field validation on partial updates)
export const updateFinancialRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  category: ruleCategoryEnum.optional(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
  allocationType: allocationTypeEnum.optional(),
  allocationValue: z.number().positive().optional().nullable(),
  allocationPercent: z.number().positive().max(100).optional().nullable(),
  minAmount: z.number().positive().optional().nullable(),
  maxAmount: z.number().positive().optional().nullable(),
  targetType: allocationTargetEnum.optional(),
  targetId: z.string().optional().nullable(),
  paymentResponsibility: z.enum(['INDIVIDUAL', 'SHARED']).optional(),
  incomeSourceId: z.string().optional().nullable(),
  carryForward: z.boolean().optional(),
  carryForwardTarget: z.enum([
    'LEAVE_IN_ACCOUNT', 'MOVE_TO_SAVINGS', 'MOVE_TO_INVESTMENT', 'MOVE_TO_GOAL',
  ]).optional().nullable(),
  savingsGoalId: z.string().optional().nullable(),
  splits: z.array(splitSchema).optional(),
  conditions: z.array(conditionSchema).optional(),
  changeNote: z.string().optional(),
})

export const previewV2Schema = z.object({
  year: z.number().int().min(2020).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  incomeSourceId: z.string().optional(),
  overrideAmounts: z.record(z.string(), z.number()).optional(),
})

export const processV2Schema = z.object({
  year: z.number().int().min(2020).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  incomeSourceId: z.string().optional(),
})

export type CreateFinancialRuleInput = z.infer<typeof createFinancialRuleSchema>
export type UpdateFinancialRuleInput = z.infer<typeof updateFinancialRuleSchema>

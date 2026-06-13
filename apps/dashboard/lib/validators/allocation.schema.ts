import { z } from 'zod'

export const createAllocationRuleSchema = z.object({
  incomeSourceId: z.string().min(1),
  allocationOrder: z.number().int().min(1),
  label: z.string().min(1).max(100),
  targetType: z.enum(['ACCOUNT', 'REMITTANCE_CATEGORY', 'BUDGET_CATEGORY', 'SAVINGS_GOAL', 'DEBT']),
  targetId: z.string().optional(),
  allocationType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE', 'REMAINING']),
  allocationValue: z.number().positive().optional(),
  allocationPercent: z.number().min(0).max(100).optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().positive().optional(),
  isEnabled: z.boolean().default(true),
}).refine(
  (d) => {
    if (d.allocationType === 'FIXED_AMOUNT') return d.allocationValue !== undefined
    if (d.allocationType === 'PERCENTAGE') return d.allocationPercent !== undefined
    return true // REMAINING needs no value
  },
  { message: 'allocationValue required for FIXED_AMOUNT; allocationPercent required for PERCENTAGE' }
)

export type CreateAllocationRuleInput = z.infer<typeof createAllocationRuleSchema>

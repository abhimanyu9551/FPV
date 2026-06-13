import { z } from 'zod'

export const createRemittanceSchema = z.object({
  remittanceCategoryId: z.string().min(1),
  remittanceDate: z.coerce.date(),
  originalAmount: z.number().positive('Amount must be positive'),
  originalCurrency: z.string().default('GBP'),
  exchangeRate: z.number().positive('Exchange rate is required for GBP→INR conversion'),
  notes: z.string().max(500).optional(),
})

export const createRemittanceCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priority: z.number().int().min(0).default(0),
  monthlyBudget: z.number().positive().optional(),
})

export type CreateRemittanceInput = z.infer<typeof createRemittanceSchema>
export type CreateRemittanceCategoryInput = z.infer<typeof createRemittanceCategorySchema>

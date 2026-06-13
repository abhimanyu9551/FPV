import { z } from 'zod'

export const supportedCurrencies = ['GBP', 'INR'] as const
export type SupportedCurrency = (typeof supportedCurrencies)[number]

export const createIncomeSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  sourceType: z.enum(['SALARY', 'BONUS', 'INTEREST', 'INVESTMENT_RETURN', 'OTHER']),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'IRREGULAR']),
  expectedAmount: z.number().positive().optional(),
  currencyCode: z.enum(supportedCurrencies).default('GBP'),
})

export const createIncomeEntrySchema = z.object({
  incomeSourceId: z.string().min(1),
  receivedDate: z.coerce.date(),
  originalAmount: z.number().positive('Amount must be positive'),
  originalCurrency: z.enum(supportedCurrencies).default('GBP'),
  exchangeRate: z.number().positive().optional(), // Required if currency != GBP
  notes: z.string().max(500).optional(),
})

export const processSalarySchema = z.object({
  incomeEntryId: z.string().min(1),
  exchangeRate: z.number().positive().optional(), // Manual rate for GBP→INR
})

export type CreateIncomeSourceInput = z.infer<typeof createIncomeSourceSchema>
export type CreateIncomeEntryInput = z.infer<typeof createIncomeEntrySchema>
export type ProcessSalaryInput = z.infer<typeof processSalarySchema>

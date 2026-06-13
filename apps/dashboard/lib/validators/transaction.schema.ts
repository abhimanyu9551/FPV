import { z } from 'zod'

export const createTransactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  transactionDate: z.coerce.date(),
  transactionType: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'DEBT_PAYMENT', 'SAVINGS_DEPOSIT', 'INVESTMENT_DEPOSIT', 'REMITTANCE', 'REFUND']),
  description: z.string().min(1).max(255),
  originalAmount: z.number().positive(),
  originalCurrency: z.string().default('GBP'),
  exchangeRate: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>

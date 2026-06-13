import { z } from 'zod'

export const createDebtSchema = z.object({
  name: z.string().min(1).max(100),
  debtType: z.enum(['CREDIT_CARD', 'PERSONAL_LOAN', 'FAMILY_LOAN', 'FRIEND_LOAN', 'INFORMAL', 'MORTGAGE', 'STUDENT_LOAN', 'OTHER']),
  creditorName: z.string().max(100).optional(),
  originalAmount: z.number().positive(),
  outstandingBalance: z.number().nonnegative(),
  interestRate: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().nonnegative().optional(),
  paymentDueDay: z.number().int().min(1).max(31).optional(),
  currencyCode: z.string().default('GBP'),
  startDate: z.coerce.date(),
  maturityDate: z.coerce.date().optional(),
  repaymentStrategy: z.enum(['SNOWBALL', 'AVALANCHE', 'CUSTOM']).default('AVALANCHE'),
  priority: z.number().int().min(0).default(0),
  notes: z.string().max(500).optional(),
})

export const createDebtPaymentSchema = z.object({
  debtId: z.string().min(1),
  paymentDate: z.coerce.date(),
  principalPaid: z.number().nonnegative(),
  interestPaid: z.number().nonnegative().default(0),
  isMinimumPayment: z.boolean().default(false),
  notes: z.string().max(500).optional(),
})

export const createCreditCardSchema = z.object({
  debtId: z.string().min(1),
  accountId: z.string().min(1),
  cardName: z.string().min(1).max(100),
  issuer: z.string().max(100).optional(),
  lastFourDigits: z.string().length(4).optional(),
  creditLimit: z.number().positive(),
  billingCycleStartDay: z.number().int().min(1).max(31),
  billingCycleEndDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31),
  gracePeriodDays: z.number().int().min(0).default(25),
})

export type CreateDebtInput = z.infer<typeof createDebtSchema>
export type CreateDebtPaymentInput = z.infer<typeof createDebtPaymentSchema>
export type CreateCreditCardInput = z.infer<typeof createCreditCardSchema>

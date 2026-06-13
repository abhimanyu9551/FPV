import { z } from 'zod'

export const createExchangeRateSchema = z.object({
  fromCurrency: z.string().length(3).toUpperCase(),
  toCurrency: z.string().length(3).toUpperCase(),
  rate: z.number().positive('Rate must be positive'),
  effectiveDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
})

export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>

import { RateSource } from '@prisma/client'
import { db } from '@/lib/db'

export const exchangeRatesDAL = {
  async findLatest(fromCurrency: string, toCurrency: string, asOf?: Date) {
    return db.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        effectiveDate: { lte: asOf ?? new Date() },
      },
      orderBy: { effectiveDate: 'desc' },
    })
  },

  async findById(id: string) {
    return db.exchangeRate.findUnique({ where: { id } })
  },

  async listRecent(fromCurrency: string, toCurrency: string, limit = 12) {
    return db.exchangeRate.findMany({
      where: { fromCurrency, toCurrency },
      orderBy: { effectiveDate: 'desc' },
      take: limit,
    })
  },

  async create(data: {
    fromCurrency: string
    toCurrency: string
    rate: number
    effectiveDate: Date
    source?: RateSource
    notes?: string
    createdById: string
  }) {
    return db.exchangeRate.create({ data: { ...data, source: data.source ?? RateSource.MANUAL } })
  },
}

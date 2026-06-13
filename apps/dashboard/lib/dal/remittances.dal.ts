import { db } from '@/lib/db'

export const remittancesDAL = {
  async listCategories() {
    return db.remittanceCategory.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    })
  },

  async listRemittances(limit = 24) {
    return db.remittance.findMany({
      orderBy: { remittanceDate: 'desc' },
      take: limit,
      include: { category: true, exchangeRate: true },
    })
  },

  async create(data: {
    remittanceCategoryId: string
    createdById: string
    remittanceDate: Date
    status: 'PLANNED' | 'INITIATED' | 'COMPLETED' | 'FAILED'
    originalAmount: number
    originalCurrency: string
    exchangeRateId: string | null
    convertedAmount: number | null
    convertedCurrency: string | null
    baseAmountGbp: number
    notes?: string
  }) {
    return db.remittance.create({ data, include: { category: true } })
  },

  async updateStatus(id: string, status: 'PLANNED' | 'INITIATED' | 'COMPLETED' | 'FAILED') {
    return db.remittance.update({ where: { id }, data: { status } })
  },

  async monthlySummary(year: number, month: number) {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)
    return db.remittance.groupBy({
      by: ['remittanceCategoryId'],
      where: {
        remittanceDate: { gte: start, lte: end },
        status: 'COMPLETED',
      },
      _sum: { baseAmountGbp: true, convertedAmount: true },
    })
  },
}

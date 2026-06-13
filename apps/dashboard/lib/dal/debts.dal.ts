import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export const debtsDAL = {
  async listActive() {
    return db.debt.findMany({
      where: { status: 'ACTIVE' },
      include: { creditCard: true, payments: { orderBy: { paymentDate: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    })
  },

  async findById(id: string) {
    return db.debt.findUnique({
      where: { id },
      include: {
        creditCard: true,
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    })
  },

  async create(data: Prisma.DebtCreateInput) {
    return db.debt.create({ data })
  },

  async update(id: string, data: Prisma.DebtUpdateInput) {
    return db.debt.update({ where: { id }, data })
  },

  async recordPayment(data: {
    debtId: string
    paidById: string
    paymentDate: Date
    principalPaid: number
    interestPaid: number
    totalPayment: number
    balanceAfter: number
    isMinimumPayment: boolean
    notes?: string
  }) {
    return db.$transaction([
      db.debtPayment.create({ data }),
      db.debt.update({
        where: { id: data.debtId },
        data: {
          outstandingBalance: data.balanceAfter,
          status: data.balanceAfter <= 0 ? 'PAID_OFF' : 'ACTIVE',
        },
      }),
    ])
  },

  async listPayments(debtId: string) {
    return db.debtPayment.findMany({
      where: { debtId },
      orderBy: { paymentDate: 'desc' },
    })
  },

  async listPaymentsInRange(from: Date, to: Date) {
    return db.debtPayment.findMany({
      where: { paymentDate: { gte: from, lte: to } },
      include: { debt: { select: { currencyCode: true } } },
      orderBy: { paymentDate: 'asc' },
    })
  },
}

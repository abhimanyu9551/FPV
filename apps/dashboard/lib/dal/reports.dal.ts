import { DebtType } from '@prisma/client'
import { db } from '@/lib/db'

export const reportsDAL = {
  async listSnapshots() {
    return db.monthlySnapshot.findMany({
      orderBy: { snapshotMonth: 'desc' },
      include: { netWorth: true },
    })
  },

  async findSnapshot(month: Date) {
    return db.monthlySnapshot.findUnique({
      where: { snapshotMonth: month },
      include: {
        incomeData: true,
        expenseData: true,
        debtData: true,
        netWorth: true,
      },
    })
  },

  async createSnapshot(data: {
    snapshotMonth: Date
    createdById: string
    incomeData: {
      totalGbp: number
      salaryGbp: number
      otherIncomeGbp: number
      remittancesGbp: number
      fixedExpensesGbp: number
      remainingCashGbp: number
    }
    expenseData: Array<{
      categoryId: string
      categoryName: string
      totalGbp: number
      budgetGbp?: number
      transactionCount: number
    }>
    debtData: Array<{
      debtId: string
      debtName: string
      debtType: DebtType
      outstandingBalance: number
      interestRate?: number
      monthsPaid: number
      estimatedPayoffMonths?: number
    }>
    netWorthData: {
      totalAssetsGbp: number
      totalLiabilitiesGbp: number
      netWorthGbp: number
      priorMonthNetWorthGbp?: number
      deltaGbp?: number
    }
  }) {
    return db.$transaction(async (tx) => {
      const snapshot = await tx.monthlySnapshot.create({
        data: {
          snapshotMonth: data.snapshotMonth,
          createdById: data.createdById,
          verificationStatus: 'VERIFIED',
          isLocked: true,
          lockedAt: new Date(),
          incomeData: { create: data.incomeData },
          expenseData: { create: data.expenseData },
          debtData: { create: data.debtData },
          netWorth: { create: data.netWorthData },
        },
        include: {
          incomeData: true,
          expenseData: true,
          debtData: true,
          netWorth: true,
        },
      })
      return snapshot
    })
  },
}

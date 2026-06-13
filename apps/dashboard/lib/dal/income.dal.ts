import { Prisma, AllocationType, AllocationTarget } from '@prisma/client'
import { db } from '@/lib/db'
import type { CreateIncomeEntryInput } from '@/lib/validators/income.schema'

export const incomeDAL = {
  async listSources(userId: string) {
    return db.incomeSource.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  },

  async findSource(id: string) {
    return db.incomeSource.findUnique({
      where: { id },
      include: { allocationRules: { orderBy: { allocationOrder: 'asc' } } },
    })
  },

  async listEntries(userId: string, limit = 12) {
    return db.incomeEntry.findMany({
      where: { userId },
      orderBy: { receivedDate: 'desc' },
      take: limit,
      include: { incomeSource: true, allocationLedger: { include: { items: true } } },
    })
  },

  async findEntry(id: string) {
    return db.incomeEntry.findUnique({
      where: { id },
      include: {
        incomeSource: { include: { allocationRules: { orderBy: { allocationOrder: 'asc' } } } },
        allocationLedger: { include: { items: true } },
      },
    })
  },

  async createEntry(userId: string, data: {
    incomeSourceId: string
    receivedDate: Date
    originalAmount: number
    originalCurrency: string
    baseAmountGbp: number
    notes?: string
  }) {
    return db.incomeEntry.create({ data: { userId, ...data } })
  },

  async markProcessed(id: string) {
    return db.incomeEntry.update({
      where: { id },
      data: { isProcessed: true, processedAt: new Date() },
    })
  },

  async listAllocationRules(incomeSourceId: string) {
    return db.allocationRule.findMany({
      where: { incomeSourceId },
      orderBy: { allocationOrder: 'asc' },
    })
  },

  async createAllocationRule(data: {
    incomeSourceId: string
    allocationOrder: number
    label: string
    targetType: AllocationTarget
    targetId?: string | null
    allocationType: AllocationType
    allocationValue?: number | null
    allocationPercent?: number | null
    minAmount?: number | null
    maxAmount?: number | null
    isEnabled: boolean
  }) {
    return db.allocationRule.create({ data })
  },

  async updateAllocationRule(id: string, data: {
    allocationOrder?: number
    label?: string
    allocationType?: AllocationType
    allocationValue?: number | null
    allocationPercent?: number | null
    isEnabled?: boolean
  }) {
    return db.allocationRule.update({ where: { id }, data })
  },

  async deleteAllocationRule(id: string) {
    return db.allocationRule.delete({ where: { id } })
  },

  async createAllocationLedger(data: {
    incomeEntryId: string
    totalIncome: number
    totalAllocated: number
    remainingCash: number
    hasWarnings: boolean
    warningMessages: string[]
    items: Array<{
      allocationRuleId: string
      allocatedAmount: number
      label: string
      targetType: string
      targetId: string | null
    }>
  }) {
    return db.allocationLedger.create({
      data: {
        incomeEntryId: data.incomeEntryId,
        totalIncome: data.totalIncome,
        totalAllocated: data.totalAllocated,
        remainingCash: data.remainingCash,
        hasWarnings: data.hasWarnings,
        warningMessages: data.warningMessages,
        items: {
          create: data.items as Prisma.AllocationLedgerItemUncheckedCreateWithoutLedgerInput[],
        },
      },
      include: { items: true },
    })
  },
}

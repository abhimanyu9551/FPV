import { Prisma, AllocationType, AllocationTarget, SharedRuleCategory } from '@prisma/client'
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

  async updateEntry(id: string, data: {
    incomeSourceId?: string
    receivedDate?: Date
    originalAmount?: number
    originalCurrency?: string
    baseAmountGbp?: number
    notes?: string | null
  }) {
    return db.incomeEntry.update({ where: { id }, data })
  },

  async deleteEntry(id: string) {
    return db.incomeEntry.delete({ where: { id } })
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

  // ── Shared Allocation Rules ──────────────────────────────────

  async listSharedRules() {
    return db.sharedAllocationRule.findMany({
      orderBy: { allocationOrder: 'asc' },
      include: { splits: { include: { incomeSource: true } } },
    })
  },

  async findSharedRule(id: string) {
    return db.sharedAllocationRule.findUnique({
      where: { id },
      include: { splits: { include: { incomeSource: true } } },
    })
  },

  async createSharedRule(data: {
    allocationOrder: number
    label: string
    category: SharedRuleCategory
    targetType?: AllocationTarget
    targetId?: string | null
    allocationType: AllocationType
    allocationValue?: number | null
    allocationPercent?: number | null
    isEnabled?: boolean
    notes?: string | null
    splits: Array<{ incomeSourceId: string; contributionPercent: number }>
  }) {
    const { splits, ...rest } = data
    return db.sharedAllocationRule.create({
      data: {
        ...rest,
        splits: {
          create: splits,
        },
      },
      include: { splits: { include: { incomeSource: true } } },
    })
  },

  async updateSharedRule(id: string, data: {
    allocationOrder?: number
    label?: string
    category?: SharedRuleCategory
    allocationType?: AllocationType
    allocationValue?: number | null
    allocationPercent?: number | null
    isEnabled?: boolean
    notes?: string | null
    splits?: Array<{ incomeSourceId: string; contributionPercent: number }>
  }) {
    const { splits, ...rest } = data
    if (splits !== undefined) {
      // Replace all splits
      await db.sharedAllocationRuleSplit.deleteMany({ where: { ruleId: id } })
      await db.sharedAllocationRuleSplit.createMany({
        data: splits.map((s) => ({ ...s, ruleId: id })),
      })
    }
    return db.sharedAllocationRule.update({
      where: { id },
      data: rest,
      include: { splits: { include: { incomeSource: true } } },
    })
  },

  async deleteSharedRule(id: string) {
    return db.sharedAllocationRule.delete({ where: { id } })
  },

  // ── Income entries for a month ───────────────────────────────

  async listEntriesForMonth(userId: string, year: number, month: number) {
    const from = new Date(year, month - 1, 1)
    const to = new Date(year, month, 0, 23, 59, 59)
    return db.incomeEntry.findMany({
      where: { userId, receivedDate: { gte: from, lte: to } },
      include: { incomeSource: true },
    })
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

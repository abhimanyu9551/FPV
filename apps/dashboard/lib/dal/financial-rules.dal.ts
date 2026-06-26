import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type {
  RuleCategory,
  AllocationType,
  AllocationTarget,
  PaymentResponsibility,
  CarryForwardTarget,
  ConditionOperator,
} from '@prisma/client'

export type CreateFinancialRuleInput = {
  userId: string
  name: string
  description?: string | null
  notes?: string | null
  category: RuleCategory
  priority: number
  isActive?: boolean
  startDate?: Date | null
  endDate?: Date | null
  allocationType: AllocationType
  allocationValue?: number | null
  allocationPercent?: number | null
  minAmount?: number | null
  maxAmount?: number | null
  targetType: AllocationTarget
  targetId?: string | null
  paymentResponsibility?: PaymentResponsibility
  incomeSourceId?: string | null
  carryForward?: boolean
  carryForwardTarget?: CarryForwardTarget | null
  savingsGoalId?: string | null
  splits?: Array<{ userId: string; percent: number }>
  conditions?: Array<{
    conditionField: string
    operator: ConditionOperator
    value?: number | null
    valueB?: number | null
    stringValue?: string | null
  }>
  changeNote?: string
}

const ruleInclude = {
  splits: { include: { user: { select: { id: true, fullName: true, email: true } } } },
  conditions: true,
  versions: { orderBy: { version: 'desc' as const }, take: 1 },
  incomeSource: { select: { id: true, name: true } },
  savingsGoal: { select: { id: true, name: true, targetAmount: true, currentAmount: true } },
}

export const financialRulesDAL = {
  async list(userId: string, filters?: { category?: RuleCategory; isActive?: boolean; incomeSourceId?: string }) {
    return db.financialRule.findMany({
      where: {
        userId,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.incomeSourceId && { incomeSourceId: filters.incomeSourceId }),
      },
      include: ruleInclude,
      orderBy: { priority: 'asc' },
    })
  },

  async listActive(userId: string, today: Date = new Date()) {
    return db.financialRule.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: today } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: today } }] }],
      },
      include: { ...ruleInclude, versions: false },
      orderBy: { priority: 'asc' },
    })
  },

  async findById(id: string) {
    return db.financialRule.findUnique({ where: { id }, include: ruleInclude })
  },

  async create(input: CreateFinancialRuleInput) {
    const { splits, conditions, changeNote, ...rest } = input
    return db.$transaction(async (tx) => {
      const rule = await tx.financialRule.create({
        data: {
          ...rest,
          splits: splits?.length ? { create: splits } : undefined,
          conditions: conditions?.length ? { create: conditions } : undefined,
        },
        include: ruleInclude,
      })

      await tx.financialRuleVersion.create({
        data: {
          ruleId: rule.id,
          version: 1,
          snapshot: buildSnapshot(rule) as Prisma.JsonObject,
          changedById: input.userId,
          changeNote: changeNote ?? 'Initial version',
        },
      })

      return rule
    })
  },

  async update(
    id: string,
    input: Partial<Omit<CreateFinancialRuleInput, 'userId'>> & { changedById: string },
  ) {
    const { splits, conditions, changeNote, changedById, ...rest } = input

    return db.$transaction(async (tx) => {
      if (splits !== undefined) {
        await tx.financialRuleSplit.deleteMany({ where: { ruleId: id } })
        if (splits.length > 0) {
          await tx.financialRuleSplit.createMany({ data: splits.map((s) => ({ ...s, ruleId: id })) })
        }
      }
      if (conditions !== undefined) {
        await tx.financialRuleCondition.deleteMany({ where: { ruleId: id } })
        if (conditions.length > 0) {
          await tx.financialRuleCondition.createMany({ data: conditions.map((c) => ({ ...c, ruleId: id })) })
        }
      }

      const rule = await tx.financialRule.update({
        where: { id },
        data: rest,
        include: ruleInclude,
      })

      const lastVersion = await tx.financialRuleVersion.findFirst({
        where: { ruleId: id },
        orderBy: { version: 'desc' },
      })

      await tx.financialRuleVersion.create({
        data: {
          ruleId: id,
          version: (lastVersion?.version ?? 0) + 1,
          snapshot: buildSnapshot(rule) as Prisma.JsonObject,
          changedById,
          changeNote: changeNote ?? 'Updated',
        },
      })

      return rule
    })
  },

  async softDelete(id: string, changedById: string) {
    return this.update(id, {
      isActive: false,
      endDate: new Date(),
      changedById,
      changeNote: 'Deleted (deactivated)',
    })
  },

  async listVersions(ruleId: string) {
    return db.financialRuleVersion.findMany({
      where: { ruleId },
      orderBy: { version: 'desc' },
    })
  },

  async restoreVersion(ruleId: string, versionId: string, changedById: string) {
    const version = await db.financialRuleVersion.findUnique({ where: { id: versionId } })
    if (!version || version.ruleId !== ruleId) throw new Error('Version not found')

    const snap = version.snapshot as Record<string, unknown>

    return this.update(ruleId, {
      name: snap.name as string,
      description: snap.description as string | null,
      notes: snap.notes as string | null,
      category: snap.category as RuleCategory,
      priority: snap.priority as number,
      isActive: snap.isActive as boolean,
      startDate: snap.startDate ? new Date(snap.startDate as string) : null,
      endDate: snap.endDate ? new Date(snap.endDate as string) : null,
      allocationType: snap.allocationType as AllocationType,
      allocationValue: snap.allocationValue as number | null,
      allocationPercent: snap.allocationPercent as number | null,
      minAmount: snap.minAmount as number | null,
      maxAmount: snap.maxAmount as number | null,
      targetType: snap.targetType as AllocationTarget,
      targetId: snap.targetId as string | null,
      paymentResponsibility: snap.paymentResponsibility as PaymentResponsibility,
      splits: (snap.splits as Array<{ userId: string; percent: number }>) ?? [],
      conditions: (snap.conditions as Array<{
        conditionField: string; operator: ConditionOperator
      }>) ?? [],
      changedById,
      changeNote: `Restored from v${version.version}`,
    })
  },
}

function buildSnapshot(rule: Record<string, unknown>): Record<string, unknown> {
  return {
    name: rule.name,
    description: rule.description,
    notes: rule.notes,
    category: rule.category,
    priority: rule.priority,
    isActive: rule.isActive,
    startDate: rule.startDate,
    endDate: rule.endDate,
    allocationType: rule.allocationType,
    allocationValue: rule.allocationValue ? String(rule.allocationValue) : null,
    allocationPercent: rule.allocationPercent ? String(rule.allocationPercent) : null,
    minAmount: rule.minAmount ? String(rule.minAmount) : null,
    maxAmount: rule.maxAmount ? String(rule.maxAmount) : null,
    targetType: rule.targetType,
    targetId: rule.targetId,
    paymentResponsibility: rule.paymentResponsibility,
    incomeSourceId: rule.incomeSourceId,
    carryForward: rule.carryForward,
    carryForwardTarget: rule.carryForwardTarget,
    savingsGoalId: rule.savingsGoalId,
    splits: (rule.splits as Array<{ userId: string; percent: unknown }>)?.map((s) => ({
      userId: s.userId,
      percent: String(s.percent),
    })) ?? [],
    conditions: (rule.conditions as Array<{
      conditionField: string; operator: string; value?: unknown; valueB?: unknown; stringValue?: unknown
    }>)?.map((c) => ({
      conditionField: c.conditionField,
      operator: c.operator,
      value: c.value ? String(c.value) : null,
      valueB: c.valueB ? String(c.valueB) : null,
      stringValue: c.stringValue ?? null,
    })) ?? [],
  }
}

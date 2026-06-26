import { getCurrentUserProfile } from '@/lib/auth'
import { financialRulesDAL } from '@/lib/dal/financial-rules.dal'
import { processingSessionsDAL } from '@/lib/dal/processing-sessions.dal'
import { incomeDAL } from '@/lib/dal/income.dal'
import RulesPageClient from './_components/RulesPageClient'

export default async function RulesPage() {
  const profile = await getCurrentUserProfile()

  const [rules, sessions, sources] = await Promise.all([
    financialRulesDAL.list(profile.id),
    processingSessionsDAL.listForUser(profile.id, 5),
    incomeDAL.listSources(profile.id),
  ])

  const serialisedRules = rules.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category as string,
    priority: r.priority,
    isActive: r.isActive,
    startDate: r.startDate ? r.startDate.toISOString().slice(0, 10) : null,
    endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
    allocationType: r.allocationType as string,
    allocationValue: r.allocationValue ? Number(r.allocationValue) : null,
    allocationPercent: r.allocationPercent ? Number(r.allocationPercent) : null,
    targetType: r.targetType as string,
    targetId: r.targetId,
    paymentResponsibility: r.paymentResponsibility as string,
    incomeSourceId: r.incomeSourceId,
    carryForward: r.carryForward,
    carryForwardTarget: r.carryForwardTarget as string | null,
    savingsGoalId: r.savingsGoalId,
    splits: r.splits.map((s) => ({
      userId: s.userId,
      percent: Number(s.percent),
      userName: s.user.fullName,
    })),
    conditions: r.conditions.map((c) => ({
      conditionField: c.conditionField,
      operator: c.operator as string,
      value: c.value ? Number(c.value) : null,
      valueB: c.valueB ? Number(c.valueB) : null,
      stringValue: c.stringValue,
    })),
    notes: r.notes,
  }))

  const serialisedSessions = sessions.map((s) => ({
    id: s.id,
    sessionType: s.sessionType as string,
    processedAt: s.processedAt.toISOString(),
    year: s.year,
    month: s.month,
    status: s.status as string,
    totalIncome: Number(s.totalIncome),
    totalAllocated: Number(s.totalAllocated),
    remainingCash: Number(s.remainingCash),
    hasWarnings: s.hasWarnings,
  }))

  return (
    <RulesPageClient
      rules={serialisedRules}
      recentSessions={serialisedSessions}
      incomeSources={sources.map((s) => ({ id: s.id, name: s.name }))}
    />
  )
}

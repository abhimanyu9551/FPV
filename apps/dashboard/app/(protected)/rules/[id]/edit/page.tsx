import { notFound } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth'
import { financialRulesDAL } from '@/lib/dal/financial-rules.dal'
import { db } from '@/lib/db'
import { incomeDAL } from '@/lib/dal/income.dal'
import RuleForm from '../../_components/RuleForm'
import { PageHeader } from '@/components/shared/PageHeader'

export default async function EditRulePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUserProfile()
  const { id } = await params

  const [rule, users, sources, accounts, goals, debts] = await Promise.all([
    financialRulesDAL.findById(id),
    db.userProfile.findMany({ where: { isActive: true }, select: { id: true, fullName: true, email: true } }),
    incomeDAL.listSources(profile.id),
    db.account.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true, accountType: true } }),
    db.savingsGoal.findMany({ where: { isActive: true }, select: { id: true, name: true, targetAmount: true, currentAmount: true } }),
    db.debt.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true } }),
  ])

  if (!rule) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`Edit Rule: ${rule.name}`}
        description="Update this financial rule."
      />
      <RuleForm
        ruleId={rule.id}
        defaultValues={{
          name: rule.name,
          description: rule.description ?? undefined,
          notes: rule.notes ?? undefined,
          category: rule.category,
          priority: rule.priority,
          isActive: rule.isActive,
          startDate: rule.startDate ? rule.startDate.toISOString().slice(0, 10) : undefined,
          endDate: rule.endDate ? rule.endDate.toISOString().slice(0, 10) : undefined,
          allocationType: rule.allocationType,
          allocationValue: rule.allocationValue ? Number(rule.allocationValue) : undefined,
          allocationPercent: rule.allocationPercent ? Number(rule.allocationPercent) : undefined,
          minAmount: rule.minAmount ? Number(rule.minAmount) : undefined,
          maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
          targetType: rule.targetType,
          targetId: rule.targetId ?? undefined,
          paymentResponsibility: rule.paymentResponsibility,
          incomeSourceId: rule.incomeSourceId ?? undefined,
          carryForward: rule.carryForward,
          carryForwardTarget: rule.carryForwardTarget ?? undefined,
          savingsGoalId: rule.savingsGoalId ?? undefined,
          splits: rule.splits.map((s) => ({ userId: s.userId, percent: Number(s.percent) })),
          conditions: rule.conditions.map((c) => ({
            conditionField: c.conditionField,
            operator: c.operator,
            value: c.value ? Number(c.value) : null,
            valueB: c.valueB ? Number(c.valueB) : null,
            stringValue: c.stringValue ?? null,
          })),
        }}
        users={users}
        incomeSources={sources.map((s) => ({ id: s.id, name: s.name }))}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, accountType: a.accountType }))}
        savingsGoals={goals.map((g) => ({ id: g.id, name: g.name, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount) }))}
        debts={debts}
      />
    </div>
  )
}

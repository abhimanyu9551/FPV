import { getCurrentUserProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { incomeDAL } from '@/lib/dal/income.dal'
import RuleForm from '../_components/RuleForm'
import { PageHeader } from '@/components/shared/PageHeader'

export default async function NewRulePage() {
  const profile = await getCurrentUserProfile()

  const [users, sources, accounts, goals, debts] = await Promise.all([
    db.userProfile.findMany({ where: { isActive: true }, select: { id: true, fullName: true, email: true } }),
    incomeDAL.listSources(profile.id),
    db.account.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true, accountType: true } }),
    db.savingsGoal.findMany({ where: { isActive: true }, select: { id: true, name: true, targetAmount: true, currentAmount: true } }),
    db.debt.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true } }),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="New Rule"
        description="Create a financial rule to automate income allocation."
      />
      <RuleForm
        users={users}
        incomeSources={sources.map((s) => ({ id: s.id, name: s.name }))}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, accountType: a.accountType }))}
        savingsGoals={goals.map((g) => ({ id: g.id, name: g.name, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount) }))}
        debts={debts}
      />
    </div>
  )
}

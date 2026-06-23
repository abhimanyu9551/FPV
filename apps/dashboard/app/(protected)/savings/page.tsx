import { getCurrentUserProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { CurrencyService } from '@/lib/services/currency.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Target } from 'lucide-react'

export default async function SavingsPage() {
  await getCurrentUserProfile()

  const goals = await db.savingsGoal.findMany({
    include: { contributions: { orderBy: { contributionDate: 'desc' } } },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Savings Goals" description="Track progress toward your financial targets">
        <button
          disabled
          className="px-4 py-2 bg-muted text-muted-foreground text-sm font-medium rounded-lg cursor-not-allowed"
          title="Coming soon"
        >
          + Add Goal
        </button>
      </PageHeader>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Savings goals coming soon"
          description="You'll be able to set targets for emergency fund, house deposit, India investments, and more."
        >
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {['Emergency Fund', 'House Deposit', 'India Investment', 'Holiday Fund'].map((g) => (
              <Badge key={g} variant="secondary" className="text-xs">
                {g}
              </Badge>
            ))}
          </div>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const saved = goal.contributions.reduce((s, c) => s + Number(c.amount), 0)
            const target = Number(goal.targetAmount)
            const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0

            return (
              <Card key={goal.id} className="gap-3 px-5 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-foreground font-semibold">{goal.name}</p>
                    {goal.targetDate && (
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Target: {new Date(goal.targetDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-success font-bold tabular-nums">{CurrencyService.format(saved, 'GBP')}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">of {CurrencyService.format(target, 'GBP')}</p>
                  </div>
                </div>
                <Progress value={pct} className="h-2" />
                <p className="text-right text-xs text-success tabular-nums">{pct.toFixed(1)}%</p>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

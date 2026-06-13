import { NextRequest, NextResponse } from 'next/server'
import { requireBotOrUserProfile } from '@/lib/auth'
import { debtService } from '@/lib/services/debt.service'

export async function GET(req: NextRequest) {
  try {
    await requireBotOrUserProfile(req)
    const strategy = req.nextUrl.searchParams.get('strategy') as
      | 'SNOWBALL'
      | 'AVALANCHE'
      | 'CUSTOM'
      | null
    const plan = await debtService.buildPlan(strategy ?? undefined)
    // Serialize Decimals
    return NextResponse.json({
      strategy: plan.strategy,
      totalMonthsToDebtFree: plan.totalMonthsToDebtFree,
      debtFreeDate: plan.debtFreeDate,
      totalInterestCost: plan.totalInterestCost.toNumber(),
      interestSavedVsMinimumOnly: plan.interestSavedVsMinimumOnly.toNumber(),
      totalMinimumPayments: plan.totalMinimumPayments.toNumber(),
      debts: plan.debts.map((d) => ({
        ...d,
        currentBalance: d.currentBalance.toNumber(),
        interestRate: d.interestRate?.toNumber() ?? null,
        minimumPayment: d.minimumPayment.toNumber(),
        totalInterestCost: d.totalInterestCost.toNumber(),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

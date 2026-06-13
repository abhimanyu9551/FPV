import { NextRequest, NextResponse } from 'next/server'
import { requireBotOrUserProfile } from '@/lib/auth'
import { incomeService } from '@/lib/services/income.service'
import { debtService } from '@/lib/services/debt.service'
import { remittancesDAL } from '@/lib/dal/remittances.dal'
import { reportsDAL } from '@/lib/dal/reports.dal'

export async function GET(req: NextRequest) {
  try {
    const profile = await requireBotOrUserProfile(req)

    const [recentEntries, activeDebts, remittanceCategories, snapshots] = await Promise.all([
      incomeService.listEntries(profile.id, 3),
      debtService.listActive(),
      remittancesDAL.listCategories(),
      reportsDAL.listSnapshots(),
    ])

    const totalDebt = activeDebts.reduce(
      (sum, d) => sum + Number(d.outstandingBalance),
      0
    )

    const latestSnapshot = snapshots[0] ?? null

    return NextResponse.json({
      user: { id: profile.id, fullName: profile.fullName, role: profile.role },
      recentIncome: recentEntries,
      debtSummary: {
        totalDebts: activeDebts.length,
        totalOutstandingGbp: totalDebt,
        debts: activeDebts.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.debtType,
          balanceGbp: Number(d.outstandingBalance),
          interestRate: d.interestRate ? Number(d.interestRate) : null,
        })),
      },
      remittanceCategories,
      latestSnapshot: latestSnapshot
        ? {
            month: latestSnapshot.snapshotMonth,
            netWorthGbp: latestSnapshot.netWorth?.netWorthGbp
              ? Number(latestSnapshot.netWorth.netWorthGbp)
              : null,
            deltaGbp: latestSnapshot.netWorth?.deltaGbp
              ? Number(latestSnapshot.netWorth.deltaGbp)
              : null,
          }
        : null,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

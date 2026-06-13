import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { reportsDAL } from '@/lib/dal/reports.dal'
import { db } from '@/lib/db'
import { z } from 'zod'

export async function GET() {
  try {
    await getCurrentUserProfile()
    const snapshots = await reportsDAL.listSnapshots()
    return NextResponse.json(snapshots)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

const generateSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
})

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const body = await req.json()
    const { month } = generateSchema.parse(body)

    const snapshotMonth = new Date(`${month}-01T00:00:00.000Z`)

    // Prevent duplicates
    const existing = await reportsDAL.findSnapshot(snapshotMonth)
    if (existing) {
      return NextResponse.json({ error: 'Snapshot already exists for this month' }, { status: 409 })
    }

    const startDate = new Date(`${month}-01T00:00:00.000Z`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    // Aggregate income for the month
    const incomeEntries = await db.incomeEntry.findMany({
      where: { userId: profile.id, receivedDate: { gte: startDate, lt: endDate } },
    })
    const salaryGbp = incomeEntries.reduce((s, e) => s + Number(e.baseAmountGbp), 0)

    // Aggregate remittances for the month (as expense)
    const remittances = await db.remittance.findMany({
      where: { remittanceDate: { gte: startDate, lt: endDate }, status: 'COMPLETED' },
    })
    const remittancesGbp = remittances.reduce((s, r) => s + Number(r.baseAmountGbp), 0)

    // Active debts snapshot
    const debts = await db.debt.findMany({ where: { status: 'ACTIVE' } })
    const totalLiabilitiesGbp = debts.reduce((s, d) => s + Number(d.outstandingBalance), 0)

    // Prior month net worth for delta
    const priorMonth = new Date(startDate)
    priorMonth.setMonth(priorMonth.getMonth() - 1)
    const priorSnap = await reportsDAL.findSnapshot(priorMonth)
    const priorNetWorthGbp = priorSnap?.netWorth ? Number(priorSnap.netWorth.netWorthGbp) : 0

    const netWorthGbp = -totalLiabilitiesGbp

    const snapshot = await reportsDAL.createSnapshot({
      snapshotMonth,
      createdById: profile.id,
      incomeData: {
        totalGbp: salaryGbp,
        salaryGbp,
        otherIncomeGbp: 0,
        remittancesGbp,
        fixedExpensesGbp: remittancesGbp,
        remainingCashGbp: Math.max(0, salaryGbp - remittancesGbp),
      },
      expenseData: [],
      debtData: debts.map((d) => ({
        debtId: d.id,
        debtName: d.name,
        debtType: d.debtType,
        outstandingBalance: Number(d.outstandingBalance),
        interestRate: d.interestRate ? Number(d.interestRate) : undefined,
        monthsPaid: 0,
      })),
      netWorthData: {
        totalAssetsGbp: 0,
        totalLiabilitiesGbp,
        netWorthGbp,
        priorMonthNetWorthGbp: priorNetWorthGbp,
        deltaGbp: netWorthGbp - priorNetWorthGbp,
      },
    })

    return NextResponse.json(snapshot, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

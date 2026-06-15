import { NextRequest, NextResponse } from 'next/server'
import Decimal from 'decimal.js'
import { requireBotOrUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { debtsDAL } from '@/lib/dal/debts.dal'
import { sharedAllocationEngine } from '@/lib/services/shared-allocation-engine.service'
import { exchangeRatesDAL } from '@/lib/dal/exchange-rates.dal'
import type { SourceInput, SharedRuleInput } from '@/lib/services/shared-allocation-engine.service'

/**
 * GET /api/v1/salary/monthly-status?year=2026&month=6
 * Returns current month's full allocation status for the /status telegram command.
 */
export async function GET(req: NextRequest) {
  try {
    const profile = await requireBotOrUserProfile(req)
    const now = new Date()
    const year = Number(req.nextUrl.searchParams.get('year') ?? now.getFullYear())
    const month = Number(req.nextUrl.searchParams.get('month') ?? (now.getMonth() + 1))

    const [entries, sharedRules, sources, activeDebts, gbpInrRate] = await Promise.all([
      incomeDAL.listEntriesForMonth(profile.id, year, month),
      incomeDAL.listSharedRules(),
      incomeDAL.listSources(profile.id),
      debtsDAL.listActive(),
      exchangeRatesDAL.findLatest('GBP', 'INR'),
    ])

    const sourceAmounts: Record<string, Decimal> = {}
    for (const entry of entries) {
      const sid = entry.incomeSourceId
      sourceAmounts[sid] = (sourceAmounts[sid] ?? new Decimal(0)).plus(
        new Decimal(entry.baseAmountGbp.toString())
      )
    }

    const sourceInputs: SourceInput[] = sources
      .filter((s) => sourceAmounts[s.id] !== undefined)
      .map((s) => ({
        id: s.id,
        name: s.name,
        availableGbp: sourceAmounts[s.id]!,
      }))

    const ruleInputs: SharedRuleInput[] = sharedRules.map((r) => ({
      id: r.id,
      allocationOrder: r.allocationOrder,
      label: r.label,
      category: r.category,
      allocationType: r.allocationType as 'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING',
      allocationValue: r.allocationValue ? new Decimal(r.allocationValue.toString()) : null,
      allocationPercent: r.allocationPercent ? new Decimal(r.allocationPercent.toString()) : null,
      isEnabled: r.isEnabled,
      splits: r.splits.map((sp) => ({
        incomeSourceId: sp.incomeSourceId,
        contributionPercent: new Decimal(sp.contributionPercent.toString()),
      })),
    }))

    const allocation = sourceInputs.length > 0
      ? sharedAllocationEngine.run(sourceInputs, ruleInputs)
      : null

    const inrRate = gbpInrRate ? Number(gbpInrRate.rate) : null

    // Savings breakdown per debt
    const savingsBreakdown = allocation
      ? activeDebts
          .filter((d) => d.savingsAllocationPercent && Number(d.savingsAllocationPercent) > 0)
          .map((d) => {
            const pct = Number(d.savingsAllocationPercent!)
            const gbpAmount = allocation.totalSavings.mul(pct).div(100)
            return {
              debtId: d.id,
              debtName: d.name,
              currencyCode: d.currencyCode,
              savingsPct: pct,
              amountGbp: gbpAmount.toFixed(2),
              amountInr: inrRate ? gbpAmount.mul(inrRate).toFixed(0) : null,
            }
          })
      : []

    return NextResponse.json({
      period: { year, month },
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        salaryDay: s.salaryDay,
        expectedAmount: s.expectedAmount ? Number(s.expectedAmount) : null,
        receivedThisMonth: !!sourceAmounts[s.id],
        receivedAmount: sourceAmounts[s.id] ? sourceAmounts[s.id]!.toNumber() : null,
      })),
      allocation: allocation
        ? {
            combinedIncome: allocation.combinedIncome.toNumber(),
            totalAllocated: allocation.totalAllocated.toNumber(),
            totalSavings: allocation.totalSavings.toNumber(),
            totalSavingsInr: inrRate ? allocation.totalSavings.mul(inrRate).toFixed(0) : null,
            hasWarnings: allocation.hasWarnings,
            warnings: allocation.warnings,
            items: allocation.items.map((item) => {
              const sourceNames = Object.entries(item.bySource)
                .map(([sid, amt]) => {
                  const src = sources.find((s) => s.id === sid)
                  return { sourceName: src?.name ?? sid, amount: amt.toNumber() }
                })
                .filter((x) => x.amount > 0)
              return {
                ruleId: item.ruleId,
                label: item.label,
                category: item.category,
                totalAllocated: item.totalAllocated.toNumber(),
                percentOfCombined: item.percentOfCombined.toNumber(),
                sourceBreakdown: sourceNames,
              }
            }),
          }
        : null,
      debts: activeDebts.map((d) => ({
        id: d.id,
        name: d.name,
        currencyCode: d.currencyCode,
        outstandingBalance: Number(d.outstandingBalance),
        outstandingInr: d.currencyCode === 'GBP' && inrRate
          ? (Number(d.outstandingBalance) * inrRate).toFixed(0)
          : null,
        minimumPayment: d.minimumPayment ? Number(d.minimumPayment) : null,
        paymentDueDay: d.paymentDueDay,
        savingsAllocationPercent: d.savingsAllocationPercent ? Number(d.savingsAllocationPercent) : null,
      })),
      savingsBreakdown,
      inrRate,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

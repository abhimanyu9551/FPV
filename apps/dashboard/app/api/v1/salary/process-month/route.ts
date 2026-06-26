import { NextRequest, NextResponse } from 'next/server'
import Decimal from 'decimal.js'
import { requireBotOrUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { sharedAllocationEngine } from '@/lib/services/shared-allocation-engine.service'
import type { SourceInput, SharedRuleInput } from '@/lib/services/shared-allocation-engine.service'

/**
 * POST /api/v1/salary/process-month
 * Body: { year: number, month: number }  (defaults to current month)
 *
 * Finds all income entries for the month, runs shared allocation rules,
 * and returns the full breakdown. Does not persist (call /salary/process
 * per-entry to persist individual entry ledgers).
 */
export async function POST(req: NextRequest) {
  try {
    const profile = await requireBotOrUserProfile(req)
    const body = await req.json().catch(() => ({}))
    const now = new Date()
    const year: number = body.year ?? now.getFullYear()
    const month: number = body.month ?? (now.getMonth() + 1)

    const [entries, sharedRules, sources] = await Promise.all([
      incomeDAL.listEntriesForMonth(profile.id, year, month),
      incomeDAL.listSharedRules(),
      incomeDAL.listSources(profile.id),
    ])

    // Aggregate income per source for the month
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

    // Sources that have no entry this month (salary not yet received)
    const pendingSources = sources.filter(
      (s) => s.isActive && s.sourceType === 'SALARY' && !sourceAmounts[s.id]
    )

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

    const result = sourceInputs.length > 0
      ? sharedAllocationEngine.run(sourceInputs, ruleInputs)
      : null

    const sourceNameMap = new Map(sourceInputs.map((s) => [s.id, s.name]))

    return NextResponse.json({
      period: { year, month },
      entries: entries.map((e) => ({
        id: e.id,
        incomeSourceId: e.incomeSourceId,
        sourceName: e.incomeSource.name,
        amount: Number(e.baseAmountGbp),
        receivedDate: e.receivedDate,
        isProcessed: e.isProcessed,
      })),
      pendingSources: pendingSources.map((s) => ({
        id: s.id,
        name: s.name,
        salaryDay: s.salaryDay,
        expectedAmount: s.expectedAmount ? Number(s.expectedAmount) : null,
      })),
      allocation: result
        ? {
            combinedIncome: result.combinedIncome.toNumber(),
            totalAllocated: result.totalAllocated.toNumber(),
            totalSavings: result.totalSavings.toNumber(),
            hasWarnings: result.hasWarnings,
            warnings: result.warnings,
            items: result.items.map((item) => ({
              ruleId: item.ruleId,
              label: item.label,
              category: item.category,
              totalAllocated: item.totalAllocated.toNumber(),
              percentOfCombined: item.percentOfCombined.toNumber(),
              sourceBreakdown: Object.entries(item.bySource)
                .filter(([, v]) => v.greaterThan(0))
                .map(([sourceId, v]) => ({
                  sourceName: sourceNameMap.get(sourceId) ?? sourceId,
                  amount: v.toNumber(),
                })),
            })),
            sourceRemaining: Object.fromEntries(
              Object.entries(result.sourceRemaining).map(([k, v]) => [k, v.toNumber()])
            ),
          }
        : null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Decimal from 'decimal.js'
import { requireBotOrUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { sharedAllocationEngine } from '@/lib/services/shared-allocation-engine.service'
import type { SourceInput, SharedRuleInput } from '@/lib/services/shared-allocation-engine.service'
import { db } from '@/lib/db'

/**
 * POST /api/v1/salary/confirm-month
 * Body: {
 *   year: number,
 *   month: number,
 *   ccOverrides?: { ruleId: string; amount: number }[]  // per-CC full-balance overrides
 * }
 *
 * Runs the shared allocation engine (with optional CC overrides), creates
 * AllocationLedger records for each unprocessed entry, and marks them as
 * isProcessed = true. Idempotent for already-processed entries.
 */
export async function POST(req: NextRequest) {
  try {
    const profile = await requireBotOrUserProfile(req)
    const body = await req.json().catch(() => ({}))
    const now = new Date()
    const year: number = body.year ?? now.getFullYear()
    const month: number = body.month ?? (now.getMonth() + 1)
    const ccOverrides: { ruleId: string; amount: number }[] = body.ccOverrides ?? []

    const [entries, sharedRules, sources] = await Promise.all([
      incomeDAL.listEntriesForMonth(profile.id, year, month),
      incomeDAL.listSharedRules(),
      incomeDAL.listSources(profile.id),
    ])

    const unprocessed = entries.filter((e) => !e.isProcessed)

    if (unprocessed.length === 0) {
      return NextResponse.json(
        { error: 'All income entries for this month are already processed' },
        { status: 400 },
      )
    }

    // Aggregate amounts per source
    const sourceAmounts: Record<string, Decimal> = {}
    for (const entry of unprocessed) {
      const sid = entry.incomeSourceId
      sourceAmounts[sid] = (sourceAmounts[sid] ?? new Decimal(0)).plus(
        new Decimal(entry.baseAmountGbp.toString()),
      )
    }

    const sourceInputs: SourceInput[] = sources
      .filter((s) => sourceAmounts[s.id] !== undefined)
      .map((s) => ({ id: s.id, name: s.name, availableGbp: sourceAmounts[s.id]! }))

    if (sourceInputs.length === 0) {
      return NextResponse.json({ error: 'No income sources with entries this month' }, { status: 400 })
    }

    // Apply CC overrides: replace allocationValue for overridden rules
    const overrideMap = new Map(ccOverrides.map((o) => [o.ruleId, new Decimal(o.amount)]))

    const ruleInputs: SharedRuleInput[] = sharedRules.map((r) => ({
      id: r.id,
      allocationOrder: r.allocationOrder,
      label: r.label,
      category: r.category,
      allocationType: r.allocationType as 'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING',
      allocationValue: overrideMap.has(r.id)
        ? overrideMap.get(r.id)!
        : r.allocationValue
          ? new Decimal(r.allocationValue.toString())
          : null,
      allocationPercent: r.allocationPercent
        ? new Decimal(r.allocationPercent.toString())
        : null,
      isEnabled: r.isEnabled,
      splits: r.splits.map((sp) => ({
        incomeSourceId: sp.incomeSourceId,
        contributionPercent: new Decimal(sp.contributionPercent.toString()),
      })),
    }))

    const result = sharedAllocationEngine.run(sourceInputs, ruleInputs)

    // Persist: for each unprocessed entry, create an AllocationLedger then mark processed
    const processedAt = new Date()

    await db.$transaction(async (tx) => {
      for (const entry of unprocessed) {
        const entryAmount = new Decimal(entry.baseAmountGbp.toString())

        // Pro-rate totals by this entry's share of combined income
        const ratio = result.combinedIncome.greaterThan(0)
          ? entryAmount.div(result.combinedIncome)
          : new Decimal(0)

        const allocated = result.totalAllocated.mul(ratio).toDecimalPlaces(2)
        const remaining = result.totalSavings.mul(ratio).toDecimalPlaces(2)

        await tx.allocationLedger.create({
          data: {
            incomeEntryId: entry.id,
            totalIncome: entryAmount.toDecimalPlaces(2),
            totalAllocated: allocated,
            remainingCash: remaining,
            hasWarnings: result.hasWarnings,
            warningMessages: result.warnings.map((w) => w.message),
          },
        })

        await tx.incomeEntry.update({
          where: { id: entry.id },
          data: { isProcessed: true, processedAt },
        })
      }
    })

    return NextResponse.json({
      processed: unprocessed.length,
      period: { year, month },
      combinedIncome: result.combinedIncome.toNumber(),
      totalAllocated: result.totalAllocated.toNumber(),
      totalSavings: result.totalSavings.toNumber(),
      hasWarnings: result.hasWarnings,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

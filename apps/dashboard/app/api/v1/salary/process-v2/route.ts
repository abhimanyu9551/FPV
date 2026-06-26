import { NextRequest, NextResponse } from 'next/server'
import Decimal from 'decimal.js'
import { getCurrentUserProfile } from '@/lib/auth'
import { financialRulesDAL } from '@/lib/dal/financial-rules.dal'
import { processingSessionsDAL } from '@/lib/dal/processing-sessions.dal'
import { incomeDAL } from '@/lib/dal/income.dal'
import { db } from '@/lib/db'
import { ruleEngine } from '@/lib/services/rule-engine.service'
import { processV2Schema } from '@/lib/validators/financial-rule.schema'
import { ZodError } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const body = await req.json()
    const input = processV2Schema.parse(body)

    const now = new Date()
    const year = input.year ?? now.getFullYear()
    const month = input.month ?? now.getMonth() + 1

    const entries = await incomeDAL.listEntriesForMonth(profile.id, year, month)
    const unprocessed = entries.filter((e) => !e.isProcessed)

    if (unprocessed.length === 0) {
      return NextResponse.json(
        { error: 'No unprocessed income entries found for this period' },
        { status: 400 },
      )
    }

    const rules = await financialRulesDAL.listActive(profile.id)

    // Build sources
    const sourceMap = new Map<string, { id: string; name: string; userId: string; total: Decimal; entryIds: string[] }>()
    for (const entry of unprocessed) {
      const src = entry.incomeSource
      if (!sourceMap.has(src.id)) {
        sourceMap.set(src.id, { id: src.id, name: src.name, userId: src.userId, total: new Decimal(0), entryIds: [] })
      }
      const s = sourceMap.get(src.id)!
      s.total = s.total.plus(entry.baseAmountGbp.toString())
      s.entryIds.push(entry.id)
    }

    const sources = [...sourceMap.values()].map((s) => ({
      id: s.id,
      name: s.name,
      userId: s.userId,
      availableGbp: s.total,
    }))

    const ctx = {
      salaryAmountGbp: sources.reduce((s, src) => s.plus(src.availableGbp), new Decimal(0)),
      currentMonth: month,
      currentYear: year,
      creditCardBalances: {},
      savingsGoalBalances: {},
    }

    const result = ruleEngine.run(sources, rules, ctx)

    // Persist allocation ledgers for each income entry, then create processing session
    const ledgerIds: string[] = []

    await db.$transaction(async (tx) => {
      for (const [sourceId, sourceData] of sourceMap.entries()) {
        for (const entryId of sourceData.entryIds) {
          // Gather items that reference this source
          const entryItems = result.items
            .filter((item) => !item.wasConditionSkipped && (item.bySource[sourceId]?.greaterThan(0)))
            .map((item) => ({
              financialRuleId: item.financialRuleId,
              allocatedAmount: (item.bySource[sourceId] ?? new Decimal(0)).toNumber(),
              label: item.label,
              targetType: item.targetType,
              targetId: item.targetId,
            }))

          const entryObj = unprocessed.find((e) => e.id === entryId)
          if (!entryObj) continue

          const totalAllocated = entryItems.reduce((s, i) => s + i.allocatedAmount, 0)
          const warnings = result.warnings
            .filter((w) => w.sourceId === sourceId)
            .map((w) => w.message)

          const ledger = await tx.allocationLedger.create({
            data: {
              incomeEntryId: entryId,
              totalIncome: entryObj.baseAmountGbp.toNumber(),
              totalAllocated,
              remainingCash: entryObj.baseAmountGbp.toNumber() - totalAllocated,
              hasWarnings: warnings.length > 0,
              warningMessages: warnings,
              items: {
                create: entryItems as never,
              },
            },
          })

          ledgerIds.push(ledger.id)

          await tx.incomeEntry.update({
            where: { id: entryId },
            data: { isProcessed: true, processedAt: new Date() },
          })
        }
      }
    })

    const session = await processingSessionsDAL.create({
      userId: profile.id,
      sessionType: 'MONTHLY',
      year,
      month,
      totalIncome: result.combinedIncome.toNumber(),
      totalAllocated: result.totalAllocated.toNumber(),
      remainingCash: result.totalRemaining.toNumber(),
      hasWarnings: result.hasWarnings,
      ledgerIds,
    })

    return NextResponse.json({
      session: { id: session.id, processedAt: session.processedAt },
      period: { year, month },
      totalIncome: result.combinedIncome.toNumber(),
      totalAllocated: result.totalAllocated.toNumber(),
      totalRemaining: result.totalRemaining.toNumber(),
      items: result.items.map((item) => ({
        ...item,
        totalAllocated: item.totalAllocated.toNumber(),
        percentOfCombined: item.percentOfCombined.toNumber(),
        bySource: Object.fromEntries(
          Object.entries(item.bySource).map(([k, v]) => [k, v.toNumber()]),
        ),
      })),
      warnings: result.warnings.map((w) => ({
        ...w,
        requested: w.requested.toNumber(),
        allocated: w.allocated.toNumber(),
      })),
      hasWarnings: result.hasWarnings,
    })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

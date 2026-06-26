import { NextRequest, NextResponse } from 'next/server'
import Decimal from 'decimal.js'
import { getCurrentUserProfile } from '@/lib/auth'
import { financialRulesDAL } from '@/lib/dal/financial-rules.dal'
import { incomeDAL } from '@/lib/dal/income.dal'
import { ruleEngine } from '@/lib/services/rule-engine.service'
import { previewV2Schema } from '@/lib/validators/financial-rule.schema'
import { ZodError } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const body = await req.json()
    const input = previewV2Schema.parse(body)

    const now = new Date()
    const year = input.year ?? now.getFullYear()
    const month = input.month ?? now.getMonth() + 1

    const [rules, entries] = await Promise.all([
      financialRulesDAL.listActive(profile.id),
      incomeDAL.listEntriesForMonth(profile.id, year, month),
    ])

    // Build sources from income entries
    const sourceMap = new Map<string, { id: string; name: string; userId: string; total: Decimal }>()
    for (const entry of entries) {
      const src = entry.incomeSource
      if (!sourceMap.has(src.id)) {
        sourceMap.set(src.id, { id: src.id, name: src.name, userId: src.userId, total: new Decimal(0) })
      }
      sourceMap.get(src.id)!.total = sourceMap.get(src.id)!.total.plus(entry.baseAmountGbp.toString())
    }

    // Apply overrides if provided
    const sources = [...sourceMap.values()].map((s) => ({
      id: s.id,
      name: s.name,
      userId: s.userId,
      availableGbp: input.overrideAmounts?.[s.id]
        ? new Decimal(input.overrideAmounts[s.id])
        : s.total,
    }))

    if (sources.length === 0) {
      return NextResponse.json({
        period: { year, month },
        message: 'No income entries found for this period',
        sources: [],
        items: [],
        totalIncome: 0,
        totalAllocated: 0,
        totalRemaining: 0,
        warnings: [],
      })
    }

    const ctx = {
      salaryAmountGbp: sources.reduce((s, src) => s.plus(src.availableGbp), new Decimal(0)),
      currentMonth: month,
      currentYear: year,
      creditCardBalances: {},
      savingsGoalBalances: {},
    }

    const result = ruleEngine.preview(sources, rules, ctx)

    return NextResponse.json({
      period: { year, month },
      sources: sources.map((s) => ({ ...s, availableGbp: s.availableGbp.toNumber() })),
      items: result.items.map((item) => ({
        ...item,
        totalAllocated: item.totalAllocated.toNumber(),
        percentOfCombined: item.percentOfCombined.toNumber(),
        bySource: Object.fromEntries(
          Object.entries(item.bySource).map(([k, v]) => [k, v.toNumber()]),
        ),
      })),
      totalIncome: result.combinedIncome.toNumber(),
      totalAllocated: result.totalAllocated.toNumber(),
      totalRemaining: result.totalRemaining.toNumber(),
      sourceRemaining: Object.fromEntries(
        Object.entries(result.sourceRemaining).map(([k, v]) => [k, v.toNumber()]),
      ),
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

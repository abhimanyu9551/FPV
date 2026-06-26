import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { financialRulesDAL } from '@/lib/dal/financial-rules.dal'
import { createFinancialRuleSchema } from '@/lib/validators/financial-rule.schema'
import { ZodError } from 'zod'
import type { RuleCategory } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const sp = req.nextUrl.searchParams
    const rules = await financialRulesDAL.list(profile.id, {
      category: (sp.get('category') as RuleCategory) ?? undefined,
      isActive: sp.has('isActive') ? sp.get('isActive') === 'true' : undefined,
      incomeSourceId: sp.get('incomeSourceId') ?? undefined,
    })
    return NextResponse.json(rules)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const body = await req.json()
    const input = createFinancialRuleSchema.parse(body)

    const rule = await financialRulesDAL.create({
      ...input,
      userId: profile.id,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    })
    return NextResponse.json(rule, { status: 201 })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

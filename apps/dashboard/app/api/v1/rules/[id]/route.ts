import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { financialRulesDAL } from '@/lib/dal/financial-rules.dal'
import { updateFinancialRuleSchema } from '@/lib/validators/financial-rule.schema'
import { ZodError } from 'zod'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUserProfile()
    const { id } = await params
    const rule = await financialRulesDAL.findById(id)
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rule)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await getCurrentUserProfile()
    const { id } = await params
    const body = await req.json()
    const input = updateFinancialRuleSchema.parse(body)

    const rule = await financialRulesDAL.update(id, {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : (input.startDate === null ? null : undefined),
      endDate: input.endDate ? new Date(input.endDate) : (input.endDate === null ? null : undefined),
      changedById: profile.id,
    })
    return NextResponse.json(rule)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await getCurrentUserProfile()
    const { id } = await params
    await financialRulesDAL.softDelete(id, profile.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

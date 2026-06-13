import { NextRequest, NextResponse } from 'next/server'
import { AllocationType, AllocationTarget } from '@prisma/client'
import { getCurrentUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { z } from 'zod'

const createRuleSchema = z.object({
  incomeSourceId: z.string().min(1),
  allocationOrder: z.number().int().min(1),
  label: z.string().min(1).max(100),
  targetType: z.enum(['ACCOUNT', 'REMITTANCE_CATEGORY', 'BUDGET_CATEGORY', 'SAVINGS_GOAL', 'DEBT']),
  targetId: z.string().optional().nullable(),
  allocationType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE', 'REMAINING']),
  allocationValue: z.number().positive().optional().nullable(),
  allocationPercent: z.number().positive().max(100).optional().nullable(),
  minAmount: z.number().positive().optional().nullable(),
  maxAmount: z.number().positive().optional().nullable(),
  isEnabled: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    await getCurrentUserProfile()
    const sourceId = req.nextUrl.searchParams.get('sourceId')
    if (!sourceId) return NextResponse.json({ error: 'sourceId is required' }, { status: 400 })
    const rules = await incomeDAL.listAllocationRules(sourceId)
    return NextResponse.json(rules)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUserProfile()
    const body = await req.json()
    const input = createRuleSchema.parse(body)
    const rule = await incomeDAL.createAllocationRule({
      ...input,
      targetType: input.targetType as AllocationTarget,
      allocationType: input.allocationType as AllocationType,
    })
    return NextResponse.json(rule, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

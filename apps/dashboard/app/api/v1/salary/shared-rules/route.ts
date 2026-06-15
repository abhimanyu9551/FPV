import { NextRequest, NextResponse } from 'next/server'
import { AllocationType, AllocationTarget, SharedRuleCategory } from '@prisma/client'
import { requireBotOrUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { z } from 'zod'

const splitSchema = z.object({
  incomeSourceId: z.string().min(1),
  contributionPercent: z.number().min(0).max(100),
})

const createSchema = z.object({
  allocationOrder: z.number().int().min(1),
  label: z.string().min(1).max(100),
  category: z.enum([
    'CREDIT_CARD_PAYMENT', 'EMI', 'RENT', 'GROCERIES', 'LEISURE',
    'INVESTMENT', 'SAVINGS', 'GENERAL_EXPENSE', 'OTHER',
  ]),
  targetType: z.enum(['ACCOUNT', 'REMITTANCE_CATEGORY', 'BUDGET_CATEGORY', 'SAVINGS_GOAL', 'DEBT']).optional(),
  targetId: z.string().optional().nullable(),
  allocationType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE', 'REMAINING']),
  allocationValue: z.number().positive().optional().nullable(),
  allocationPercent: z.number().min(0).max(100).optional().nullable(),
  isEnabled: z.boolean().default(true),
  notes: z.string().optional().nullable(),
  splits: z.array(splitSchema).min(0),
}).refine((d) => {
  if (d.allocationType === 'FIXED_AMOUNT') return d.allocationValue !== undefined && d.allocationValue !== null
  if (d.allocationType === 'PERCENTAGE') return d.allocationPercent !== undefined && d.allocationPercent !== null
  return true
}, { message: 'allocationValue required for FIXED_AMOUNT; allocationPercent required for PERCENTAGE' })

export async function GET(req: NextRequest) {
  try {
    await requireBotOrUserProfile(req)
    const rules = await incomeDAL.listSharedRules()
    return NextResponse.json(rules)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireBotOrUserProfile(req)
    const body = await req.json()
    const input = createSchema.parse(body)
    const rule = await incomeDAL.createSharedRule({
      ...input,
      category: input.category as SharedRuleCategory,
      targetType: (input.targetType ?? 'BUDGET_CATEGORY') as AllocationTarget,
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

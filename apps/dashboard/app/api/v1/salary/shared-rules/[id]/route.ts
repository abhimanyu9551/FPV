import { NextRequest, NextResponse } from 'next/server'
import { AllocationType, SharedRuleCategory } from '@prisma/client'
import { getCurrentUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { z } from 'zod'

const splitSchema = z.object({
  incomeSourceId: z.string().min(1),
  contributionPercent: z.number().min(0).max(100),
})

const updateSchema = z.object({
  allocationOrder: z.number().int().min(1).optional(),
  label: z.string().min(1).max(100).optional(),
  category: z.enum([
    'CREDIT_CARD_PAYMENT', 'EMI', 'RENT', 'GROCERIES', 'LEISURE',
    'INVESTMENT', 'SAVINGS', 'GENERAL_EXPENSE', 'OTHER',
  ]).optional(),
  allocationType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE', 'REMAINING']).optional(),
  allocationValue: z.number().positive().optional().nullable(),
  allocationPercent: z.number().min(0).max(100).optional().nullable(),
  isEnabled: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  splits: z.array(splitSchema).optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getCurrentUserProfile()
    const { id } = await params
    const body = await req.json()
    const input = updateSchema.parse(body)
    const rule = await incomeDAL.updateSharedRule(id, {
      ...input,
      category: input.category as SharedRuleCategory | undefined,
      allocationType: input.allocationType as AllocationType | undefined,
    })
    return NextResponse.json(rule)
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getCurrentUserProfile()
    const { id } = await params
    await incomeDAL.deleteSharedRule(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { AllocationType } from '@prisma/client'
import { getCurrentUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { z } from 'zod'

const updateRuleSchema = z.object({
  allocationOrder: z.number().int().min(1).optional(),
  label: z.string().min(1).max(100).optional(),
  allocationType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE', 'REMAINING']).optional(),
  allocationValue: z.number().positive().optional().nullable(),
  allocationPercent: z.number().positive().max(100).optional().nullable(),
  isEnabled: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUserProfile()
    const { id } = await params
    const body = await req.json()
    const input = updateRuleSchema.parse(body)
    const rule = await incomeDAL.updateAllocationRule(id, input)
    return NextResponse.json(rule)
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUserProfile()
    const { id } = await params
    await incomeDAL.deleteAllocationRule(id)
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { debtsDAL } from '@/lib/dal/debts.dal'
import { z } from 'zod'

const updateSchema = z.object({
  savingsAllocationPercent: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'PAID_OFF', 'DEFERRED', 'WRITTEN_OFF']).optional(),
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
    const debt = await debtsDAL.update(id, input)
    return NextResponse.json(debt)
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

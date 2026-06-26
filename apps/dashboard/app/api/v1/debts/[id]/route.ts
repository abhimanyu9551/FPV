import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { debtsDAL } from '@/lib/dal/debts.dal'
import { z } from 'zod'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getCurrentUserProfile()
    const { id } = await params
    const debt = await debtsDAL.findById(id)
    if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(debt)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  debtType: z.enum(['CREDIT_CARD', 'PERSONAL_LOAN', 'FAMILY_LOAN', 'FRIEND_LOAN', 'INFORMAL', 'MORTGAGE', 'STUDENT_LOAN', 'OTHER']).optional(),
  creditorName: z.string().max(100).nullable().optional(),
  originalAmount: z.number().positive().optional(),
  outstandingBalance: z.number().nonnegative().optional(),
  interestRate: z.number().min(0).max(100).nullable().optional(),
  minimumPayment: z.number().nonnegative().nullable().optional(),
  paymentDueDay: z.number().int().min(1).max(31).nullable().optional(),
  currencyCode: z.string().optional(),
  startDate: z.coerce.date().optional(),
  maturityDate: z.coerce.date().nullable().optional(),
  repaymentStrategy: z.enum(['SNOWBALL', 'AVALANCHE', 'CUSTOM']).optional(),
  priority: z.number().int().min(0).optional(),
  savingsAllocationPercent: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getCurrentUserProfile()
    const { id } = await params
    await debtsDAL.deleteById(id)
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

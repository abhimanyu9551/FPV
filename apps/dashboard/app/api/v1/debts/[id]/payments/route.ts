import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { debtService } from '@/lib/services/debt.service'
import { createDebtPaymentSchema } from '@/lib/validators/debt.schema'
import { ZodError } from 'zod'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await getCurrentUserProfile()
    const { id } = await params
    const body = await req.json()
    const input = createDebtPaymentSchema.parse({ ...body, debtId: id })
    const [payment] = await debtService.recordPayment(profile.id, input)
    return NextResponse.json(payment, { status: 201 })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

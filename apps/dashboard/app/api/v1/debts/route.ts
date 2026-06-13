import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { debtService } from '@/lib/services/debt.service'
import { createDebtSchema } from '@/lib/validators/debt.schema'
import { ZodError } from 'zod'

export async function GET() {
  try {
    await getCurrentUserProfile()
    const debts = await debtService.listActive()
    return NextResponse.json(debts)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUserProfile()
    const body = await req.json()
    const input = createDebtSchema.parse(body)
    const debt = await debtService.create(input)
    return NextResponse.json(debt, { status: 201 })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

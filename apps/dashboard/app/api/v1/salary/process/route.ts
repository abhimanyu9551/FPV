import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { incomeService } from '@/lib/services/income.service'
import { processSalarySchema } from '@/lib/validators/income.schema'
import { ZodError } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const body = await req.json()
    const input = processSalarySchema.parse(body)
    const result = await incomeService.processAllocation(
      input.incomeEntryId,
      profile.id,
      input.exchangeRate
    )
    return NextResponse.json(result, { status: 200 })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

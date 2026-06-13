import { NextRequest, NextResponse } from 'next/server'
import { requireBotOrUserProfile } from '@/lib/auth'
import { incomeService } from '@/lib/services/income.service'
import { createIncomeEntrySchema } from '@/lib/validators/income.schema'
import { ZodError } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const profile = await requireBotOrUserProfile(req)
    const entries = await incomeService.listEntries(profile.id)
    return NextResponse.json(entries)
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await requireBotOrUserProfile(req)
    const body = await req.json()
    const input = createIncomeEntrySchema.parse(body)
    const entry = await incomeService.createEntry(profile.id, input)
    return NextResponse.json(entry, { status: 201 })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

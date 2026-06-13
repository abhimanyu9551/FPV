import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { exchangeRatesDAL } from '@/lib/dal/exchange-rates.dal'
import { createExchangeRateSchema } from '@/lib/validators/exchange-rate.schema'
import { ZodError } from 'zod'

export async function GET(req: NextRequest) {
  try {
    await getCurrentUserProfile()
    const from = req.nextUrl.searchParams.get('from') ?? 'GBP'
    const to = req.nextUrl.searchParams.get('to') ?? 'INR'
    const rates = await exchangeRatesDAL.listRecent(from, to)
    return NextResponse.json(rates)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const body = await req.json()
    const input = createExchangeRateSchema.parse(body)
    const rate = await exchangeRatesDAL.create({ ...input, createdById: profile.id })
    return NextResponse.json(rate, { status: 201 })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

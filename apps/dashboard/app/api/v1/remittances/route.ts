import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { remittancesDAL } from '@/lib/dal/remittances.dal'
import { exchangeRatesDAL } from '@/lib/dal/exchange-rates.dal'
import { createRemittanceSchema } from '@/lib/validators/remittance.schema'
import { CurrencyService } from '@/lib/services/currency.service'
import { ZodError } from 'zod'

export async function GET() {
  try {
    await getCurrentUserProfile()
    const remittances = await remittancesDAL.listRemittances()
    return NextResponse.json(remittances)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const body = await req.json()
    const input = createRemittanceSchema.parse(body)

    // Store the rate and get its ID
    const rate = await exchangeRatesDAL.create({
      fromCurrency: input.originalCurrency,
      toCurrency: 'INR',
      rate: input.exchangeRate,
      effectiveDate: input.remittanceDate,
      createdById: profile.id,
    }).catch(() =>
      // Rate may already exist for this date — look it up
      exchangeRatesDAL.findLatest(input.originalCurrency, 'INR', input.remittanceDate)
    )

    const convertedAmount = CurrencyService.convertWithRate(input.originalAmount, input.exchangeRate)
    const baseAmountGbp = input.originalCurrency === 'GBP'
      ? input.originalAmount
      : CurrencyService.convertWithRate(input.originalAmount, 1 / input.exchangeRate).toNumber()

    const remittance = await remittancesDAL.create({
      remittanceCategoryId: input.remittanceCategoryId,
      createdById: profile.id,
      remittanceDate: input.remittanceDate,
      status: 'PLANNED',
      originalAmount: input.originalAmount,
      originalCurrency: input.originalCurrency,
      exchangeRateId: rate?.id ?? null,
      convertedAmount: convertedAmount.toNumber(),
      convertedCurrency: 'INR',
      baseAmountGbp,
      notes: input.notes,
    })

    return NextResponse.json(remittance, { status: 201 })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

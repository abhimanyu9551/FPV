import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import Decimal from 'decimal.js'
import { getCurrentUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { CurrencyService } from '@/lib/services/currency.service'

const updateSchema = z.object({
  incomeSourceId: z.string().optional(),
  receivedDate: z.string().date().optional(),
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.string().min(3).max(3).optional(),
  exchangeRate: z.number().positive().optional(),
  notes: z.string().max(500).optional().nullable(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUserProfile()
    const { id } = await params
    const entry = await incomeDAL.findEntry(id)
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(entry)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUserProfile()
    const { id } = await params

    const existing = await incomeDAL.findEntry(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const input = updateSchema.parse(body)

    const update: Parameters<typeof incomeDAL.updateEntry>[1] = {}

    if (input.incomeSourceId !== undefined) update.incomeSourceId = input.incomeSourceId
    if (input.receivedDate !== undefined) update.receivedDate = new Date(input.receivedDate)
    if (input.notes !== undefined) update.notes = input.notes
    if (input.originalAmount !== undefined) update.originalAmount = input.originalAmount
    if (input.originalCurrency !== undefined) update.originalCurrency = input.originalCurrency

    // Recalculate GBP base if amount or currency changed
    const newAmount = input.originalAmount ?? Number(existing.originalAmount)
    const newCurrency = input.originalCurrency ?? existing.originalCurrency
    if (input.originalAmount !== undefined || input.originalCurrency !== undefined) {
      if (newCurrency === 'GBP') {
        update.baseAmountGbp = newAmount
      } else if (input.exchangeRate) {
        update.baseAmountGbp = CurrencyService.convertWithRate(newAmount, input.exchangeRate).toNumber()
      } else {
        // Use existing rate ratio
        const existingRate = new Decimal(existing.originalAmount.toString())
          .div(existing.baseAmountGbp.toString())
        update.baseAmountGbp = new Decimal(newAmount).div(existingRate).toNumber()
      }
    }

    const entry = await incomeDAL.updateEntry(id, update)
    return NextResponse.json(entry)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUserProfile()
    const { id } = await params

    const existing = await incomeDAL.findEntry(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.isProcessed) {
      return NextResponse.json(
        { error: 'Cannot delete a processed income entry. Undo the allocation session first.' },
        { status: 409 },
      )
    }

    await incomeDAL.deleteEntry(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

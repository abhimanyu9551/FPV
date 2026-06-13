import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { incomeService } from '@/lib/services/income.service'
import { ZodError } from 'zod'
import { z } from 'zod'

const previewSchema = z.object({
  incomeSourceId: z.string().min(1),
  amount: z.number().positive(),
})

export async function POST(req: NextRequest) {
  try {
    await getCurrentUserProfile()
    const body = await req.json()
    const { incomeSourceId, amount } = previewSchema.parse(body)
    const preview = await incomeService.previewAllocation(incomeSourceId, amount)
    // Serialize Decimals for JSON
    return NextResponse.json({
      incomeAmountGbp: preview.incomeAmountGbp.toNumber(),
      totalAllocated: preview.totalAllocated.toNumber(),
      remainingCash: preview.remainingCash.toNumber(),
      hasWarnings: preview.hasWarnings,
      warnings: preview.warnings.map((w) => ({
        ...w,
        requested: w.requested.toNumber(),
        allocated: w.allocated.toNumber(),
      })),
      items: preview.items.map((item) => ({
        ...item,
        allocatedAmount: item.allocatedAmount.toNumber(),
        percentage: item.percentage.toNumber(),
      })),
    })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

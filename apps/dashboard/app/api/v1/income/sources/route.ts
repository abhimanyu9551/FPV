import { NextRequest, NextResponse } from 'next/server'
import { requireBotOrUserProfile } from '@/lib/auth'
import { incomeService } from '@/lib/services/income.service'

export async function GET(req: NextRequest) {
  try {
    const profile = await requireBotOrUserProfile(req)
    const sources = await incomeService.listSources(profile.id)
    return NextResponse.json(sources)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

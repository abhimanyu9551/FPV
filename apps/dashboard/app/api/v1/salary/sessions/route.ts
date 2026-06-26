import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { processingSessionsDAL } from '@/lib/dal/processing-sessions.dal'

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20')
    const sessions = await processingSessionsDAL.listForUser(profile.id, limit)
    return NextResponse.json(sessions)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

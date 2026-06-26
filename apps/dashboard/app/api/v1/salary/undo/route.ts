import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { processingSessionsDAL } from '@/lib/dal/processing-sessions.dal'
import { z } from 'zod'

const undoSchema = z.object({ sessionId: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()
    const body = await req.json()
    const { sessionId } = undoSchema.parse(body)
    const session = await processingSessionsDAL.undo(sessionId, profile.id)
    return NextResponse.json({ success: true, session })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

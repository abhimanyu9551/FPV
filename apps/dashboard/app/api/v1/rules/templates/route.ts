import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    await getCurrentUserProfile()
    const templates = await db.ruleTemplate.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(templates)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

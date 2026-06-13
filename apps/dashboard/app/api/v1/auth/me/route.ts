import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'

export async function GET() {
  try {
    const profile = await getCurrentUserProfile()
    return NextResponse.json(profile)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

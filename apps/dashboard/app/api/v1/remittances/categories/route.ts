import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { remittancesDAL } from '@/lib/dal/remittances.dal'

export async function GET() {
  try {
    await getCurrentUserProfile()
    const categories = await remittancesDAL.listCategories()
    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

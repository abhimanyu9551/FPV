import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import { financialRulesDAL } from '@/lib/dal/financial-rules.dal'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUserProfile()
    const { id } = await params
    const versions = await financialRulesDAL.listVersions(id)
    return NextResponse.json(versions)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await getCurrentUserProfile()
    const { id } = await params
    const body = await req.json()
    const versionId: string = body.versionId
    if (!versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 })
    const rule = await financialRulesDAL.restoreVersion(id, versionId, profile.id)
    return NextResponse.json(rule)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

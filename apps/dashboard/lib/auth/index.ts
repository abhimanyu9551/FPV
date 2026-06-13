import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function getSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function requireAuth() {
  const user = await getSession()
  if (!user) redirect('/login')
  return user
}

export async function getCurrentUserProfile() {
  const user = await requireAuth()
  const profile = await db.userProfile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')
  return profile
}

export async function requireAdmin() {
  const profile = await getCurrentUserProfile()
  if (profile.role !== 'ADMIN') {
    throw new Error('Admin access required')
  }
  return profile
}

/** Used by API routes the Telegram bot calls.
 *  Accepts a valid x-bot-secret header as an alternative to a Supabase session.
 *  When the bot authenticates, returns the primary ADMIN profile.
 */
export async function requireBotOrUserProfile(req: NextRequest) {
  const botSecret = req.headers.get('x-bot-secret')
  if (botSecret && process.env.BOT_API_SECRET && botSecret === process.env.BOT_API_SECRET) {
    const profile = await db.userProfile.findFirst({
      where: { role: 'ADMIN', isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!profile) throw new Error('No admin profile configured for bot auth')
    return profile
  }
  return getCurrentUserProfile()
}

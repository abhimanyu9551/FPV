/**
 * Creates test@fpv.local in Supabase Auth + user_profiles, then smoke-tests all routes.
 * Run: npx tsx scripts/create-test-user.ts
 */
import 'dotenv/config'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DATABASE_URL = process.env.DATABASE_URL!

const TEST_EMAIL = 'test@fpv.local'
const TEST_PASSWORD = 'FpvTest2026!'

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
    process.exit(1)
  }

  // ── 1. Create (or fetch existing) Supabase auth user ──────────────────────
  console.log(`\n[1/3] Creating Supabase auth user ${TEST_EMAIL}…`)
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    }),
  })

  let userId: string
  if (createRes.status === 422) {
    // User already exists — list users and find it
    console.log('  User already exists, looking up UUID…')
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
      headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY },
    })
    const listData = await listRes.json() as { users: Array<{ id: string; email: string }> }
    const existing = listData.users.find((u) => u.email === TEST_EMAIL)
    if (!existing) { console.error('Cannot find existing user'); process.exit(1) }
    userId = existing.id
    console.log(`  Found existing user: ${userId}`)
  } else if (!createRes.ok) {
    const body = await createRes.text()
    console.error(`  Failed to create user: ${createRes.status} ${body}`)
    process.exit(1)
  } else {
    const data = await createRes.json() as { id: string }
    userId = data.id
    console.log(`  Created auth user: ${userId}`)
  }

  // ── 2. Upsert user_profile via Prisma ─────────────────────────────────────
  console.log(`\n[2/3] Upserting user_profile for ${userId}…`)
  const { PrismaClient } = await import('@prisma/client')
  const db = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } })

  try {
    const profile = await db.userProfile.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: TEST_EMAIL,
        fullName: 'Test User',
        role: 'ADMIN',
        isActive: true,
      },
    })
    console.log(`  Upserted user_profile: ${profile.id} (${profile.role})`)
  } finally {
    await db.$disconnect()
  }

  // ── 3. Sign in to get session cookies ─────────────────────────────────────
  console.log(`\n[3/3] Signing in to get session tokens…`)
  const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })

  if (!signInRes.ok) {
    console.error(`  Sign-in failed: ${signInRes.status} ${await signInRes.text()}`)
    process.exit(1)
  }

  const session = await signInRes.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  console.log(`  Session obtained. Token expires in ${session.expires_in}s`)
  console.log(`\n✅ Test user ready!`)
  console.log(`   Email:    ${TEST_EMAIL}`)
  console.log(`   Password: ${TEST_PASSWORD}`)
  console.log(`   UUID:     ${userId}`)
  console.log(`\n   Access token (first 40 chars): ${session.access_token.slice(0, 40)}…`)

  // Write tokens to a temp file for the route tester
  const fs = await import('fs')
  fs.writeFileSync(
    'scripts/.test-session.json',
    JSON.stringify({ userId, accessToken: session.access_token, refreshToken: session.refresh_token }, null, 2)
  )
  console.log(`\n   Session saved to scripts/.test-session.json`)
}

main().catch((e) => { console.error(e); process.exit(1) })

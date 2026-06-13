/**
 * Smoke-tests all protected routes.
 * Signs in as test@fpv.local, constructs the Supabase SSR cookie,
 * then makes HEAD/GET requests to each route.
 *
 * Run: npx tsx scripts/test-routes.ts  (from apps/dashboard)
 */
import 'dotenv/config'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BASE = 'http://localhost:3000'
const TEST_EMAIL = 'test@fpv.local'
const TEST_PASSWORD = 'FpvTest2026!'

// Extract project ref from URL: https://pdhesqijfxvhjyxjgasc.supabase.co
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const COOKIE_NAME = `sb-${projectRef}-auth-token`

/** Supabase SSR base64url cookie encoding */
function encodeSession(session: object): string {
  const json = JSON.stringify(session)
  // Node 22 Buffer.toString('base64url') produces URL-safe base64 without padding
  const b64 = Buffer.from(json, 'utf8').toString('base64url')
  return `base64-${b64}`
}

const ROUTES: Array<{ path: string; description: string }> = [
  { path: '/dashboard', description: 'Overview dashboard' },
  { path: '/income', description: 'Income list' },
  { path: '/income/new', description: 'Add income form' },
  { path: '/debts', description: 'Debt list' },
  { path: '/debts/new', description: 'Add debt form' },
  { path: '/allocation', description: 'Salary allocation rules' },
  { path: '/credit-cards', description: 'Credit cards dashboard' },
  { path: '/remittances', description: 'India remittances' },
  { path: '/savings', description: 'Savings goals' },
  { path: '/investments', description: 'Investments' },
  { path: '/reports', description: 'Monthly reports' },
  { path: '/settings', description: 'Settings' },
  // API routes
  { path: '/api/v1/income', description: 'API: income list' },
  { path: '/api/v1/debts', description: 'API: debts list' },
  { path: '/api/v1/exchange-rates', description: 'API: exchange rates' },
]

async function main() {
  // ── Sign in ──────────────────────────────────────────────────────────────
  console.log(`\nSigning in as ${TEST_EMAIL}…`)
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  if (!tokenRes.ok) {
    console.error('Sign-in failed:', await tokenRes.text())
    process.exit(1)
  }
  const session = await tokenRes.json()
  console.log(`  Signed in ✓  (user: ${session.user?.email}, expires_in: ${session.expires_in}s)`)

  // ── Build cookie ──────────────────────────────────────────────────────────
  const cookieValue = encodeSession(session)
  // The encoded string might be longer than 3180 URL-encoded chars → chunk it.
  // For simplicity, check if chunking is needed (likely fits in one cookie).
  const encoded = encodeURIComponent(cookieValue)
  const cookies: string[] = []
  if (encoded.length <= 3180) {
    cookies.push(`${COOKIE_NAME}=${cookieValue}`)
  } else {
    // Split into chunks of ~3180 URL-encoded chars
    let remaining = encoded
    let i = 0
    while (remaining.length > 0) {
      const slice = remaining.slice(0, 3180)
      const decoded = decodeURIComponent(slice)
      cookies.push(`${COOKIE_NAME}.${i}=${decoded}`)
      remaining = remaining.slice(slice.length)
      i++
    }
  }
  const cookieHeader = cookies.join('; ')
  console.log(`  Cookie: ${COOKIE_NAME} (${cookies.length} chunk${cookies.length !== 1 ? 's' : ''}, ${cookieValue.length} chars)`)

  // ── Test each route ───────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(65)}`)
  console.log(`Testing ${ROUTES.length} routes against ${BASE}`)
  console.log('─'.repeat(65))

  const results: Array<{ path: string; status: number; ok: boolean; note: string }> = []

  for (const route of ROUTES) {
    try {
      const res = await fetch(`${BASE}${route.path}`, {
        headers: { Cookie: cookieHeader },
        redirect: 'manual', // don't follow redirects — 307 to /login = fail, 200 = pass
      })

      const isPage = !route.path.startsWith('/api/')
      const ok = isPage
        ? res.status === 200
        : (res.status >= 200 && res.status < 300)
      const note = res.status === 307
        ? `→ ${res.headers.get('location')}` // 307 means auth failed
        : res.headers.get('content-type')?.split(';')[0] ?? ''

      results.push({ path: route.path, status: res.status, ok, note })

      const icon = ok ? '✅' : '❌'
      const label = route.description.padEnd(30)
      console.log(`${icon}  ${String(res.status).padEnd(5)} ${route.path.padEnd(25)} ${label} ${note}`)
    } catch (err) {
      results.push({ path: route.path, status: 0, ok: false, note: String(err) })
      console.log(`❌  ERR   ${route.path.padEnd(25)} ${route.description.padEnd(30)} ${err}`)
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)
  console.log('\n' + '─'.repeat(65))
  console.log(`Results: ${passed}/${results.length} passed`)
  if (failed.length) {
    console.log('\nFailed routes:')
    failed.forEach((r) => console.log(`  ❌ ${r.path} (${r.status}) ${r.note}`))
  } else {
    console.log('All routes working! ✅')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

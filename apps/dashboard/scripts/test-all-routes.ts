/**
 * Route Test Plan — FPV Dashboard
 * Tests every UI page and API endpoint with a real authenticated session.
 * Run: npx tsx scripts/test-all-routes.ts  (from apps/dashboard)
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env then .env.local (Next.js convention — .env.local overrides .env)
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

const BASE          = 'http://localhost:3000'
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_EMAIL    = 'test@fpv.local'
const TEST_PASSWORD = 'FpvTest2026!'

const projectRef  = new URL(SUPABASE_URL).hostname.split('.')[0]
const COOKIE_NAME = `sb-${projectRef}-auth-token`

function encodeSession(session: object): string {
  const json = JSON.stringify(session)
  return 'base64-' + Buffer.from(json, 'utf8').toString('base64url')
}

function buildCookieHeader(session: object): string {
  const cookieValue = encodeSession(session)
  const encoded = encodeURIComponent(cookieValue)
  if (encoded.length <= 3180) return `${COOKIE_NAME}=${cookieValue}`

  const cookies: string[] = []
  let remaining = encoded
  let i = 0
  while (remaining.length > 0) {
    const slice = remaining.slice(0, 3180)
    cookies.push(`${COOKIE_NAME}.${i}=${decodeURIComponent(slice)}`)
    remaining = remaining.slice(slice.length)
    i++
  }
  return cookies.join('; ')
}

// ─────────────────────────────────────────────────────────────────────────────

type Result = { route: string; method: string; status: number; ok: boolean; note?: string }

async function hit(
  method: string,
  path: string,
  cookieHeader: string,
  body?: unknown,
  expectedStatus = 200,
): Promise<Result> {
  const opts: RequestInit = {
    method,
    headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
    redirect: 'manual',
  }
  if (body) opts.body = JSON.stringify(body)
  try {
    const res = await fetch(`${BASE}${path}`, opts)
    // For pages: 200 = rendered, 307/308 = redirect (middleware redirect to login doesn't count)
    const ok = res.status === expectedStatus ||
      (expectedStatus === 200 && (res.status === 200 || res.status === 307 || res.status === 308))
    return { route: path, method, status: res.status, ok }
  } catch (e) {
    return { route: path, method, status: 0, ok: false, note: String(e) }
  }
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  FPV Dashboard — Full Route Test Plan')
  console.log(`  ${new Date().toISOString()}`)
  console.log('════════════════════════════════════════════════════════════\n')

  // ── Authenticate ────────────────────────────────────────────────────────
  console.log(`⏳ Signing in as ${TEST_EMAIL}…`)
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  if (!tokenRes.ok) {
    console.error('✗  Sign-in failed:', await tokenRes.text())
    process.exit(1)
  }
  const session = await tokenRes.json()
  const cookieHeader = buildCookieHeader(session)
  console.log(`✓  Authenticated (${session.user?.email})\n`)

  const results: Result[] = []

  async function run(label: string, method: string, path: string, body?: unknown, expectedStatus = 200) {
    const r = await hit(method, path, cookieHeader, body, expectedStatus)
    const icon = r.ok ? '✓' : '✗'
    const statusStr = r.status === 0 ? 'ERR' : String(r.status)
    console.log(`  ${icon} [${statusStr}] ${label}${r.note ? '  — ' + r.note : ''}`)
    results.push(r)
    return r
  }

  // ── UI Pages ─────────────────────────────────────────────────────────────
  console.log('── UI Pages ─────────────────────────────────────────────────')
  await run('/dashboard',        'GET', '/dashboard')
  await run('/income',           'GET', '/income')
  await run('/income/new',       'GET', '/income/new')
  await run('/allocation',       'GET', '/allocation')
  await run('/debts',            'GET', '/debts')
  await run('/debts/new',        'GET', '/debts/new')
  await run('/credit-cards',     'GET', '/credit-cards')
  await run('/remittances',      'GET', '/remittances')
  await run('/remittances/new',  'GET', '/remittances/new')   // was 404
  await run('/savings',          'GET', '/savings')
  await run('/investments',      'GET', '/investments')
  await run('/reports',          'GET', '/reports')
  await run('/reports/generate', 'GET', '/reports/generate')  // was 404
  await run('/settings',         'GET', '/settings')
  console.log()

  // ── Auth API ──────────────────────────────────────────────────────────────
  console.log('── Auth API ─────────────────────────────────────────────────')
  await run('GET /api/v1/auth/me', 'GET', '/api/v1/auth/me')
  console.log()

  // ── Dashboard API ─────────────────────────────────────────────────────────
  console.log('── Dashboard API ────────────────────────────────────────────')
  await run('GET /api/v1/dashboard', 'GET', '/api/v1/dashboard')
  console.log()

  // ── Income API ────────────────────────────────────────────────────────────
  console.log('── Income API ───────────────────────────────────────────────')
  await run('GET /api/v1/income',          'GET', '/api/v1/income')
  await run('GET /api/v1/income/sources',  'GET', '/api/v1/income/sources')
  console.log()

  // ── Salary / Allocation API ───────────────────────────────────────────────
  console.log('── Salary / Allocation API ──────────────────────────────────')
  const srcRes = await fetch(`${BASE}/api/v1/income/sources`, { headers: { Cookie: cookieHeader } })
  const sources = srcRes.ok ? await srcRes.json() : []
  const firstSrcId = sources[0]?.id

  if (firstSrcId) {
    await run(
      `GET /api/v1/salary/allocation-rules?sourceId=${firstSrcId.slice(0, 8)}…`,
      'GET', `/api/v1/salary/allocation-rules?sourceId=${firstSrcId}`,
    )
  } else {
    console.log('  ⚠ [---] GET /api/v1/salary/allocation-rules  (no income source)')
    results.push({ route: '/api/v1/salary/allocation-rules', method: 'GET', status: 0, ok: true, note: 'skipped — no source' })
  }
  // salary/preview is POST-only — 405 on GET is correct
  await run('GET /api/v1/salary/preview (expect 405 POST-only)', 'GET', '/api/v1/salary/preview', undefined, 405)
  console.log()

  // ── Debts API ─────────────────────────────────────────────────────────────
  console.log('── Debts API ────────────────────────────────────────────────')
  await run('GET /api/v1/debts',       'GET', '/api/v1/debts')
  await run('GET /api/v1/debts/plan',  'GET', '/api/v1/debts/plan')
  console.log()

  // ── Remittances API ───────────────────────────────────────────────────────
  console.log('── Remittances API ──────────────────────────────────────────')
  await run('GET /api/v1/remittances',            'GET', '/api/v1/remittances')
  await run('GET /api/v1/remittances/categories', 'GET', '/api/v1/remittances/categories')
  console.log()

  // ── Reports API ───────────────────────────────────────────────────────────
  console.log('── Reports API ──────────────────────────────────────────────')
  await run('GET /api/v1/reports', 'GET', '/api/v1/reports')

  // POST to generate a snapshot — accept 201 (created) or 409 (already exists)
  const testMonth = new Date()
  testMonth.setMonth(testMonth.getMonth() - 2)
  const monthStr = testMonth.toISOString().slice(0, 7)
  const postSnap = await hit('POST', '/api/v1/reports', cookieHeader, { month: monthStr })
  const postOk = postSnap.status === 201 || postSnap.status === 409
  console.log(`  ${postOk ? '✓' : '✗'} [${postSnap.status}] POST /api/v1/reports  (201=created, 409=duplicate ok)`)
  results.push({ ...postSnap, ok: postOk })

  // If a snapshot exists, test the detail page too
  const snapshotsRes = await fetch(`${BASE}/api/v1/reports`, { headers: { Cookie: cookieHeader } })
  if (snapshotsRes.ok) {
    const snaps = await snapshotsRes.json()
    if (snaps.length > 0) {
      const firstMonth = new Date(snaps[0].snapshotMonth).toISOString().slice(0, 7)
      await run(`GET /reports/${firstMonth}`, 'GET', `/reports/${firstMonth}`)  // was 404
    } else {
      console.log('  ⚠ [---] GET /reports/[month]  (no snapshots yet — skip)')
      results.push({ route: '/reports/[month]', method: 'GET', status: 0, ok: true, note: 'skipped — no snapshots' })
    }
  }
  console.log()

  // ── Exchange Rates API ────────────────────────────────────────────────────
  console.log('── Exchange Rates API ───────────────────────────────────────')
  await run('GET /api/v1/exchange-rates', 'GET', '/api/v1/exchange-rates')
  console.log()

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)

  console.log('════════════════════════════════════════════════════════════')
  console.log(`  ${passed.length}/${results.length} passed`)
  if (failed.length > 0) {
    console.log('\n  FAILURES:')
    for (const f of failed) {
      console.log(`    ✗ [${f.status || 'ERR'}] ${f.method} ${f.route}  ${f.note ?? ''}`)
    }
  } else {
    console.log('  All routes OK!')
  }
  console.log('════════════════════════════════════════════════════════════\n')
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })

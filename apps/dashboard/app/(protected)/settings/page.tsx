import { getCurrentUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { exchangeRatesDAL } from '@/lib/dal/exchange-rates.dal'
import ExchangeRateForm from './_components/ExchangeRateForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export default async function SettingsPage() {
  const profile = await getCurrentUserProfile()
  const [sources, latestRate] = await Promise.all([
    incomeDAL.listSources(profile.id),
    exchangeRatesDAL.findLatest('GBP', 'INR'),
  ])

  const sourcesWithRules = await Promise.all(
    sources.map(async (s) => ({
      ...s,
      ruleCount: (await incomeDAL.listAllocationRules(s.id)).length,
    }))
  )

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader title="Settings" description="Manage exchange rates and account configuration" />

      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Name</p>
              <p className="text-foreground mt-0.5">{profile.fullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Email</p>
              <p className="text-foreground mt-0.5">{profile.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Role</p>
              <p className="text-foreground mt-0.5">{profile.role}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Member since</p>
              <p className="text-foreground mt-0.5">
                {new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GBP → INR Exchange Rate</CardTitle>
          <CardDescription>Manually set the rate used for salary processing and remittances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestRate && (
            <div className="rounded-xl bg-muted px-4 py-3">
              <p className="text-muted-foreground text-xs">
                Current rate (as of {new Date(latestRate.effectiveDate).toLocaleDateString('en-GB')})
              </p>
              <p className="text-foreground text-2xl font-bold font-heading mt-1">
                £1 = ₹{Number(latestRate.rate).toFixed(2)}
              </p>
            </div>
          )}
          <ExchangeRateForm currentRate={latestRate ? Number(latestRate.rate) : undefined} userId={profile.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Income Sources</CardTitle>
            <Link href="/allocation" className="text-primary hover:text-primary/80 text-xs transition">
              Manage rules →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {sourcesWithRules.map((s, i) => (
              <div key={s.id}>
                <div className="flex justify-between items-center py-3">
                  <div>
                    <p className="text-foreground text-sm">{s.name}</p>
                    <p className="text-muted-foreground text-xs">{s.sourceType} · {s.frequency} · {s.currencyCode}</p>
                  </div>
                  <Badge variant="secondary">{s.ruleCount} rule{s.ruleCount !== 1 ? 's' : ''}</Badge>
                </div>
                {i < sourcesWithRules.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

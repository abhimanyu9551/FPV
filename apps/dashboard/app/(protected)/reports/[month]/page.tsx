import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserProfile } from '@/lib/auth'
import { reportsDAL } from '@/lib/dal/reports.dal'
import { CurrencyService } from '@/lib/services/currency.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Lock, FileEdit } from 'lucide-react'

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ month: string }>
}) {
  await getCurrentUserProfile()
  const { month } = await params

  if (!/^\d{4}-\d{2}$/.test(month)) notFound()

  const snapshotDate = new Date(`${month}-01T00:00:00.000Z`)
  const snapshot = await reportsDAL.findSnapshot(snapshotDate)
  if (!snapshot) notFound()

  const monthLabel = new Date(snapshot.snapshotMonth).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const netWorth = snapshot.netWorth
  const income = snapshot.incomeData
  const debts = snapshot.debtData ?? []

  const delta = netWorth?.deltaGbp ? Number(netWorth.deltaGbp) : null
  const deltaPos = delta !== null && delta >= 0

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/reports" className="text-muted-foreground hover:text-foreground transition">
          ← Reports
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground">{monthLabel}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">{monthLabel}</h1>
          <div className="flex items-center gap-2 mt-1">
            {snapshot.isLocked ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Lock className="h-3 w-3" /> Locked
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs">
                <FileEdit className="h-3 w-3" /> Draft
              </Badge>
            )}
          </div>
        </div>
        {delta !== null && (
          <Badge className={deltaPos ? 'bg-success/10 text-success border-0' : 'bg-destructive/10 text-destructive border-0'}>
            {deltaPos ? '+' : ''}{CurrencyService.format(delta, 'GBP')} MoM
          </Badge>
        )}
      </div>

      {netWorth && (
        <Card>
          <CardHeader>
            <CardTitle>Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Assets</p>
                <p className="text-success font-bold text-lg mt-1 tabular-nums">
                  {CurrencyService.format(Number(netWorth.totalAssetsGbp), 'GBP')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Liabilities</p>
                <p className="text-destructive font-bold text-lg mt-1 tabular-nums">
                  {CurrencyService.format(Number(netWorth.totalLiabilitiesGbp), 'GBP')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Net Worth</p>
                <p className={`font-bold text-lg mt-1 tabular-nums ${Number(netWorth.netWorthGbp) >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {CurrencyService.format(Number(netWorth.netWorthGbp), 'GBP')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {income && (
        <Card>
          <CardHeader>
            <CardTitle>Income Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Total income', value: Number(income.totalGbp) },
              { label: 'Salary', value: Number(income.salaryGbp) },
              { label: 'Remittances sent', value: Number(income.remittancesGbp), negative: true },
              { label: 'Remaining cash', value: Number(income.remainingCashGbp), highlight: true },
            ].map(({ label, value, negative, highlight }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">{label}</span>
                <span className={`text-sm font-medium tabular-nums ${highlight ? 'text-success' : negative ? 'text-destructive' : 'text-foreground'}`}>
                  {negative && value > 0 ? '-' : ''}{CurrencyService.format(value, 'GBP')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {debts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debt Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {debts.map((d) => (
              <div key={d.id} className="flex justify-between items-center">
                <div>
                  <p className="text-foreground text-sm">{d.debtName}</p>
                  <p className="text-muted-foreground/60 text-xs">{d.debtType.replace(/_/g, ' ')}</p>
                </div>
                <p className="text-destructive text-sm font-medium tabular-nums">
                  {CurrencyService.format(Number(d.outstandingBalance), 'GBP')}
                </p>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground text-sm font-medium">Total debt</span>
              <span className="text-destructive font-bold tabular-nums">
                {CurrencyService.format(
                  debts.reduce((s, d) => s + Number(d.outstandingBalance), 0),
                  'GBP'
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

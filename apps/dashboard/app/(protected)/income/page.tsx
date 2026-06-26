import { getCurrentUserProfile } from '@/lib/auth'
import { incomeService } from '@/lib/services/income.service'
import { CurrencyService } from '@/lib/services/currency.service'
import ProcessMonthButton from './_components/ProcessMonthButton'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { TrendingUp, Pencil } from 'lucide-react'
import Link from 'next/link'

export default async function IncomePage() {
  const profile = await getCurrentUserProfile()
  const [sources, entries] = await Promise.all([
    incomeService.listSources(profile.id),
    incomeService.listEntries(profile.id, 24),
  ])

  const now = new Date()
  const currentMonth = `${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`

  function ordinal(n: number) {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Income" description="Manage salary entries and allocation">
        <Button asChild>
          <Link href="/income/new">+ Add Income</Link>
        </Button>
      </PageHeader>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Income Sources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sources.map((source) => (
            <Card key={source.id} className="gap-2 px-5 py-4">
              <p className="text-foreground font-medium">{source.name}</p>
              <p className="text-muted-foreground text-xs">
                {source.sourceType} · {source.frequency} · {source.currencyCode}
              </p>
              {source.salaryDay && (
                <p className="text-primary text-xs">
                  Paid on the {ordinal(source.salaryDay)} of each month
                </p>
              )}
              {source.expectedAmount && (
                <p className="text-success text-sm font-medium">
                  ~{CurrencyService.format(Number(source.expectedAmount), source.currencyCode)}
                </p>
              )}
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardContent className="flex items-center justify-between flex-wrap gap-3 py-5">
          <div>
            <h2 className="text-foreground font-semibold">Process {currentMonth}</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              Run shared allocation rules across all income received this month
            </p>
          </div>
          <ProcessMonthButton year={now.getFullYear()} month={now.getMonth() + 1} />
        </CardContent>
      </Card>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Income History</h2>
        {entries.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No income entries yet"
            description="Add your first salary entry to start allocating."
            href="/income/new"
            cta="Add Income"
          />
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card key={entry.id} className="flex-row items-center justify-between gap-0 px-5 py-4">
                <div>
                  <p className="text-foreground text-sm font-medium">{entry.incomeSource.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(entry.receivedDate).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-success font-semibold tabular-nums">
                      {CurrencyService.format(Number(entry.baseAmountGbp), 'GBP')}
                    </p>
                    {entry.originalCurrency !== 'GBP' && (
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {entry.originalCurrency} {Number(entry.originalAmount).toLocaleString()}
                      </p>
                    )}
                    <Badge variant={entry.isProcessed ? 'default' : 'secondary'} className="text-xs mt-0.5">
                      {entry.isProcessed ? 'Allocated' : 'Pending'}
                    </Badge>
                  </div>
                  <Link
                    href={`/income/${entry.id}/edit`}
                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition"
                  >
                    <Pencil size={14} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

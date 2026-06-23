import { getCurrentUserProfile } from '@/lib/auth'
import { reportsDAL } from '@/lib/dal/reports.dal'
import { CurrencyService } from '@/lib/services/currency.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Lock, FileEdit } from 'lucide-react'
import Link from 'next/link'

export default async function ReportsPage() {
  await getCurrentUserProfile()
  const snapshots = await reportsDAL.listSnapshots()

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly Reports" description="Immutable financial snapshots">
        <Button asChild>
          <Link href="/reports/generate">Generate Snapshot</Link>
        </Button>
      </PageHeader>

      {snapshots.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No snapshots yet"
          description="Generate your first monthly snapshot to start tracking net worth over time."
          href="/reports/generate"
          cta="Generate Snapshot"
        />
      ) : (
        <div className="space-y-3">
          {snapshots.map((snap) => {
            const delta = snap.netWorth?.deltaGbp ? Number(snap.netWorth.deltaGbp) : null
            return (
              <Link
                key={snap.id}
                href={`/reports/${new Date(snap.snapshotMonth).toISOString().slice(0, 7)}`}
              >
                <Card className="flex-row items-center justify-between gap-0 px-5 py-4 hover:border-primary/40 transition-colors cursor-pointer mb-3">
                  <div>
                    <p className="text-foreground font-medium">
                      {new Date(snap.snapshotMonth).toLocaleDateString('en-GB', {
                        month: 'long', year: 'numeric',
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {snap.isLocked ? (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <FileEdit className="h-3 w-3" /> Draft
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs">{snap.verificationStatus}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {snap.netWorth && (
                      <>
                        <p className="text-foreground font-semibold tabular-nums">
                          {CurrencyService.format(Number(snap.netWorth.netWorthGbp), 'GBP')}
                        </p>
                        {delta !== null && (
                          <p className={`text-xs tabular-nums ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {delta >= 0 ? '+' : ''}{CurrencyService.format(delta, 'GBP')} MoM
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

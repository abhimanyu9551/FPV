'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'

export default function GenerateReportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const defaultMonth = lastMonth.toISOString().slice(0, 7)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const month = fd.get('month') as string

    try {
      const res = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to generate snapshot')
        return
      }
      router.push('/reports')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/reports" className="text-muted-foreground hover:text-foreground transition">
          ← Reports
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground">Generate Snapshot</span>
      </div>

      <PageHeader
        title="Generate Monthly Snapshot"
        description="Creates an immutable locked record of this month's income, debts, and net worth."
      />

      <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 space-y-1">
        <p className="text-warning text-sm font-medium">Before generating</p>
        <ul className="text-warning/80 text-xs space-y-0.5 list-disc list-inside">
          <li>Make sure all income entries for the month are recorded</li>
          <li>Mark remittances as COMPLETED if they went through</li>
          <li>Snapshots are locked immediately — they cannot be edited</li>
        </ul>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Month</Label>
              <Input
                type="month"
                name="month"
                required
                defaultValue={defaultMonth}
                max={new Date().toISOString().slice(0, 7)}
              />
              <p className="text-muted-foreground/60 text-xs">Snapshots can only be generated for past or current months</p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Generating…' : 'Generate & Lock Snapshot'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/reports">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

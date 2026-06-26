'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'

interface IncomeSource {
  id: string
  name: string
  currencyCode: string
}

interface EntryData {
  id: string
  incomeSourceId: string
  receivedDate: string
  originalAmount: number
  originalCurrency: string
  baseAmountGbp: number
  notes: string | null
  isProcessed: boolean
  incomeSource: { name: string }
}

export default function EditIncomeForm({ entry }: { entry: EntryData }) {
  const router = useRouter()
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [currency, setCurrency] = useState(entry.originalCurrency)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/income/sources')
      .then((r) => r.json())
      .then(setSources)
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const exchangeRateVal = fd.get('exchangeRate') as string
    const body: Record<string, unknown> = {
      incomeSourceId: fd.get('incomeSourceId'),
      receivedDate: fd.get('receivedDate'),
      originalAmount: Number(fd.get('originalAmount')),
      originalCurrency: fd.get('originalCurrency'),
      notes: fd.get('notes') || null,
    }
    if (exchangeRateVal) body.exchangeRate = Number(exchangeRateVal)

    try {
      const res = await fetch(`/api/v1/income/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save changes')
        return
      }
      router.push('/income')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete this income entry from ${entry.incomeSource.name}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/income/${entry.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to delete')
        return
      }
      router.push('/income')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/income" className="text-muted-foreground hover:text-foreground transition">← Income</Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground">Edit Entry</span>
      </div>

      <div className="flex items-center gap-3">
        <PageHeader title="Edit Income Entry" description={entry.incomeSource.name} />
        {entry.isProcessed && (
          <Badge variant="default" className="self-start mt-1">Allocated</Badge>
        )}
      </div>

      {entry.isProcessed && (
        <div className="bg-warning/10 border border-warning/30 text-warning-foreground text-sm rounded-lg px-4 py-3">
          This entry has already been allocated. Changing the amount will not retroactively adjust ledger entries.
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Income Source</Label>
              <select
                name="incomeSourceId"
                required
                defaultValue={entry.incomeSourceId}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  name="originalAmount"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={entry.originalAmount}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <select
                  name="originalCurrency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="GBP">GBP £</option>
                  <option value="INR">INR ₹</option>
                </select>
              </div>
            </div>

            {currency !== 'GBP' && (
              <div className="space-y-1.5">
                <Label>
                  GBP / {currency} Exchange Rate
                  <span className="text-muted-foreground font-normal ml-1.5">(how many {currency} per £1)</span>
                </Label>
                <Input
                  type="number"
                  name="exchangeRate"
                  min="0.0001"
                  step="0.0001"
                  placeholder="107.50"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep existing rate (current GBP value: £{Number(entry.baseAmountGbp).toFixed(2)})
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Date Received</Label>
              <Input
                type="date"
                name="receivedDate"
                required
                defaultValue={entry.receivedDate.slice(0, 10)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                name="notes"
                rows={2}
                defaultValue={entry.notes ?? ''}
                placeholder="e.g. June salary"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/income">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!entry.isProcessed && (
        <div className="border border-destructive/30 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Danger Zone</p>
          <p className="text-xs text-muted-foreground">Deleting this entry is permanent and cannot be undone.</p>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Entry'}
          </Button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/PageHeader'

interface IncomeSource {
  id: string
  name: string
  currencyCode: string
  sourceType: string
}

export default function NewIncomePage() {
  const router = useRouter()
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [currency, setCurrency] = useState('GBP')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/income/sources')
      .then((r) => r.json())
      .then(setSources)
      .catch(() => setError('Failed to load income sources'))
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const exchangeRateVal = fd.get('exchangeRate') as string
    const body = {
      incomeSourceId: fd.get('incomeSourceId') as string,
      receivedDate: fd.get('receivedDate') as string,
      originalAmount: Number(fd.get('originalAmount')),
      originalCurrency: fd.get('originalCurrency') as string,
      ...(exchangeRateVal ? { exchangeRate: Number(exchangeRateVal) } : {}),
      ...(fd.get('notes') ? { notes: fd.get('notes') as string } : {}),
    }
    try {
      const res = await fetch('/api/v1/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save income entry')
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

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/income" className="text-muted-foreground hover:text-foreground transition">← Income</Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground">Add Entry</span>
      </div>

      <PageHeader title="Add Income Entry" description="Record a salary or income payment" />

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
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select source…</option>
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
                  placeholder="3000.00"
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
                  required
                  placeholder="107.50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Date Received</Label>
              <Input
                type="date"
                name="receivedDate"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                name="notes"
                rows={2}
                placeholder="e.g. June salary"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving…' : 'Save Income Entry'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/income">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

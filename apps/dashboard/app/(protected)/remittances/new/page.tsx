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

interface Category {
  id: string
  name: string
  priority: number
  monthlyBudget: string | null
}

export default function NewRemittancePage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')

  useEffect(() => {
    fetch('/api/v1/remittances/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setError('Failed to load categories'))
  }, [])

  const convertedInr =
    amount && rate ? (parseFloat(amount) * parseFloat(rate)).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const body = {
      remittanceCategoryId: fd.get('remittanceCategoryId') as string,
      remittanceDate: fd.get('remittanceDate') as string,
      originalAmount: Number(fd.get('originalAmount')),
      originalCurrency: 'GBP',
      exchangeRate: Number(fd.get('exchangeRate')),
      notes: (fd.get('notes') as string) || undefined,
    }
    try {
      const res = await fetch('/api/v1/remittances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to create remittance')
        return
      }
      router.push('/remittances')
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
        <Link href="/remittances" className="text-muted-foreground hover:text-foreground transition">
          ← India Transfers
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground">New Transfer</span>
      </div>

      <PageHeader title="New India Transfer" description="Record a GBP → INR remittance" />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                name="remittanceCategoryId"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.monthlyBudget ? ` (budget: £${parseFloat(c.monthlyBudget).toFixed(0)}/mo)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (GBP £)</Label>
                <Input
                  type="number"
                  name="originalAmount"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="300.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  GBP → INR Rate
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(₹ per £1)</span>
                </Label>
                <Input
                  type="number"
                  name="exchangeRate"
                  min="1"
                  step="0.01"
                  required
                  placeholder="107.50"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
            </div>

            {convertedInr && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5 flex justify-between items-center">
                <span className="text-muted-foreground text-sm">You&apos;re sending</span>
                <span className="text-primary font-semibold text-sm tabular-nums">≈ ₹{convertedInr}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Transfer Date</Label>
              <Input
                type="date"
                name="remittanceDate"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                name="notes"
                rows={2}
                placeholder="e.g. June dad support"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving…' : 'Record Transfer'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/remittances">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

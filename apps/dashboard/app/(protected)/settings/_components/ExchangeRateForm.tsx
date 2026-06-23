'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ExchangeRateForm({ currentRate, userId }: { currentRate?: number; userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError('')
    const fd = new FormData(e.currentTarget)
    const body = {
      fromCurrency: 'GBP',
      toCurrency: 'INR',
      rate: Number(fd.get('rate')),
      effectiveDate: fd.get('effectiveDate') as string,
      notes: fd.get('notes') || undefined,
      createdById: userId,
    }
    try {
      const res = await fetch('/api/v1/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save rate')
        return
      }
      setSuccess(true)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && <p className="text-success text-sm">Exchange rate updated.</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">New Rate (₹ per £1)</Label>
          <Input
            type="number"
            name="rate"
            min="1"
            step="0.0001"
            required
            defaultValue={currentRate}
            placeholder="107.50"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Effective Date</Label>
          <Input
            type="date"
            name="effectiveDate"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">
          Notes <span className="text-muted-foreground/60">(optional)</span>
        </Label>
        <Input
          type="text"
          name="notes"
          placeholder="e.g. June salary processing"
        />
      </div>
      <Button type="submit" disabled={loading} size="sm">
        {loading ? 'Saving…' : 'Update Rate'}
      </Button>
    </form>
  )
}

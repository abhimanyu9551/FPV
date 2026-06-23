'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEBT_TYPES = [
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'PERSONAL_LOAN', label: 'Personal Loan' },
  { value: 'FAMILY_LOAN', label: 'Family Loan' },
  { value: 'FRIEND_LOAN', label: 'Friend Loan' },
  { value: 'INFORMAL', label: 'Informal Debt' },
  { value: 'MORTGAGE', label: 'Mortgage' },
  { value: 'STUDENT_LOAN', label: 'Student Loan' },
  { value: 'OTHER', label: 'Other' },
]

export default function NewDebtPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      name: fd.get('name'),
      debtType: fd.get('debtType'),
      originalAmount: Number(fd.get('originalAmount')),
      outstandingBalance: Number(fd.get('outstandingBalance')),
      startDate: fd.get('startDate'),
      currencyCode: fd.get('currencyCode') || 'GBP',
      repaymentStrategy: fd.get('repaymentStrategy') || 'AVALANCHE',
      priority: Number(fd.get('priority') || 0),
    }
    if (fd.get('creditorName')) body.creditorName = fd.get('creditorName')
    if (fd.get('interestRate')) body.interestRate = Number(fd.get('interestRate'))
    if (fd.get('minimumPayment')) body.minimumPayment = Number(fd.get('minimumPayment'))
    if (fd.get('paymentDueDay')) body.paymentDueDay = Number(fd.get('paymentDueDay'))
    if (fd.get('maturityDate')) body.maturityDate = fd.get('maturityDate')
    if (fd.get('notes')) body.notes = fd.get('notes')

    try {
      const res = await fetch('/api/v1/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save debt')
        return
      }
      router.push('/debts')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/debts" className="text-muted-foreground hover:text-foreground transition text-sm">← Debts</Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground/80 text-sm">Add Debt</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Add Debt</h1>
        <p className="text-muted-foreground text-sm mt-1">Track a new credit card, loan, or informal debt</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Debt Name</label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. HSBC Credit Card"
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Debt Type</label>
            <select
              name="debtType"
              required
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {DEBT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Creditor <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="text"
              name="creditorName"
              placeholder="e.g. HSBC"
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Original Amount</label>
            <input
              type="number"
              name="originalAmount"
              min="0.01"
              step="0.01"
              required
              placeholder="5000.00"
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Outstanding Balance</label>
            <input
              type="number"
              name="outstandingBalance"
              min="0"
              step="0.01"
              required
              placeholder="3200.00"
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Interest Rate % APR <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="number"
              name="interestRate"
              min="0"
              max="100"
              step="0.01"
              placeholder="22.90"
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Min Monthly Payment <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="number"
              name="minimumPayment"
              min="0"
              step="0.01"
              placeholder="50.00"
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Start Date</label>
            <input
              type="date"
              name="startDate"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Payoff Strategy</label>
            <select
              name="repaymentStrategy"
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="AVALANCHE">Avalanche (highest rate first)</option>
              <option value="SNOWBALL">Snowball (smallest balance first)</option>
              <option value="CUSTOM">Custom priority</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            name="notes"
            rows={2}
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-foreground font-semibold rounded-lg transition"
          >
            {loading ? 'Saving…' : 'Add Debt'}
          </button>
          <Link
            href="/debts"
            className="px-5 py-2.5 bg-muted hover:bg-accent text-foreground/80 font-medium rounded-lg transition text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

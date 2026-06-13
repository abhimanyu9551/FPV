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
        <Link href="/debts" className="text-gray-500 hover:text-white transition text-sm">← Debts</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm">Add Debt</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Add Debt</h1>
        <p className="text-gray-400 text-sm mt-1">Track a new credit card, loan, or informal debt</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Debt Name</label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. HSBC Credit Card"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Debt Type</label>
            <select
              name="debtType"
              required
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DEBT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Creditor <span className="text-gray-500 font-normal">(optional)</span></label>
            <input
              type="text"
              name="creditorName"
              placeholder="e.g. HSBC"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Original Amount</label>
            <input
              type="number"
              name="originalAmount"
              min="0.01"
              step="0.01"
              required
              placeholder="5000.00"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Outstanding Balance</label>
            <input
              type="number"
              name="outstandingBalance"
              min="0"
              step="0.01"
              required
              placeholder="3200.00"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Interest Rate % APR <span className="text-gray-500 font-normal">(optional)</span></label>
            <input
              type="number"
              name="interestRate"
              min="0"
              max="100"
              step="0.01"
              placeholder="22.90"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Min Monthly Payment <span className="text-gray-500 font-normal">(optional)</span></label>
            <input
              type="number"
              name="minimumPayment"
              min="0"
              step="0.01"
              placeholder="50.00"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Start Date</label>
            <input
              type="date"
              name="startDate"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Payoff Strategy</label>
            <select
              name="repaymentStrategy"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="AVALANCHE">Avalanche (highest rate first)</option>
              <option value="SNOWBALL">Snowball (smallest balance first)</option>
              <option value="CUSTOM">Custom priority</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Notes <span className="text-gray-500 font-normal">(optional)</span></label>
          <textarea
            name="notes"
            rows={2}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Saving…' : 'Add Debt'}
          </button>
          <Link
            href="/debts"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

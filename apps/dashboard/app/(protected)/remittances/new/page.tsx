'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      <div className="flex items-center gap-3">
        <Link href="/remittances" className="text-gray-500 hover:text-white transition text-sm">
          ← India Transfers
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm">New Transfer</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">New India Transfer</h1>
        <p className="text-gray-400 text-sm mt-1">Record a GBP → INR remittance</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
          <select
            name="remittanceCategoryId"
            required
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount (GBP £)</label>
            <input
              type="number"
              name="originalAmount"
              min="0.01"
              step="0.01"
              required
              placeholder="300.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              GBP → INR Rate
              <span className="text-gray-500 font-normal ml-1 text-xs">(₹ per £1)</span>
            </label>
            <input
              type="number"
              name="exchangeRate"
              min="1"
              step="0.01"
              required
              placeholder="107.50"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {convertedInr && (
          <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg px-4 py-2.5 flex justify-between items-center">
            <span className="text-gray-400 text-sm">You&apos;re sending</span>
            <span className="text-indigo-300 font-semibold text-sm">≈ ₹{convertedInr}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Transfer Date</label>
          <input
            type="date"
            name="remittanceDate"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Notes <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            name="notes"
            rows={2}
            placeholder="e.g. June dad support"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Saving…' : 'Record Transfer'}
          </button>
          <Link
            href="/remittances"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      <div className="flex items-center gap-3">
        <Link href="/income" className="text-gray-500 hover:text-white transition text-sm">← Income</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm">Add Entry</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Add Income Entry</h1>
        <p className="text-gray-400 text-sm mt-1">Record a salary or income payment</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Income Source</label>
          <select
            name="incomeSourceId"
            required
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select source…</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount</label>
            <input
              type="number"
              name="originalAmount"
              min="0.01"
              step="0.01"
              required
              placeholder="3000.00"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Currency</label>
            <select
              name="originalCurrency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="GBP">GBP £</option>
              <option value="INR">INR ₹</option>
            </select>
          </div>
        </div>

        {currency !== 'GBP' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              GBP / {currency} Exchange Rate
              <span className="text-gray-500 font-normal ml-1.5">(how many {currency} per £1)</span>
            </label>
            <input
              type="number"
              name="exchangeRate"
              min="0.0001"
              step="0.0001"
              required
              placeholder="107.50"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Date Received</label>
          <input
            type="date"
            name="receivedDate"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Notes <span className="text-gray-500 font-normal">(optional)</span></label>
          <textarea
            name="notes"
            rows={2}
            placeholder="e.g. June salary"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Saving…' : 'Save Income Entry'}
          </button>
          <Link
            href="/income"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

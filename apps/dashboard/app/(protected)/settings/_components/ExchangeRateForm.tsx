'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      {success && (
        <p className="text-emerald-400 text-sm">Exchange rate updated.</p>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">New Rate (₹ per £1)</label>
          <input
            type="number"
            name="rate"
            min="1"
            step="0.0001"
            required
            defaultValue={currentRate}
            placeholder="107.50"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Effective Date</label>
          <input
            type="date"
            name="effectiveDate"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Notes <span className="text-gray-600">(optional)</span></label>
        <input
          type="text"
          name="notes"
          placeholder="e.g. June salary processing"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-lg transition"
      >
        {loading ? 'Saving…' : 'Update Rate'}
      </button>
    </form>
  )
}

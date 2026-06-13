'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function GenerateReportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Default to last month
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
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-gray-500 hover:text-white transition text-sm">
          ← Reports
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm">Generate Snapshot</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Generate Monthly Snapshot</h1>
        <p className="text-gray-400 text-sm mt-1">
          Creates an immutable locked record of this month&apos;s income, debts, and net worth.
        </p>
      </div>

      <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 text-amber-300 text-sm space-y-1">
        <p className="font-medium">Before generating</p>
        <ul className="text-amber-400/80 text-xs space-y-0.5 list-disc list-inside">
          <li>Make sure all income entries for the month are recorded</li>
          <li>Mark remittances as COMPLETED if they went through</li>
          <li>Snapshots are locked immediately — they cannot be edited</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Month</label>
          <input
            type="month"
            name="month"
            required
            defaultValue={defaultMonth}
            max={new Date().toISOString().slice(0, 7)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-gray-600 text-xs mt-1">Snapshots can only be generated for past or current months</p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Generating…' : 'Generate & Lock Snapshot'}
          </button>
          <Link
            href="/reports"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

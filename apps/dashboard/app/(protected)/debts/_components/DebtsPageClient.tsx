'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import type { CurrencyGroup, MonthlyPaymentTotal, DebtSummary } from '../page'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  if (currency === 'INR') return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtGbp(n: number) { return fmt(n, 'GBP') }

const DEBT_TYPE_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Credit Card', PERSONAL_LOAN: 'Personal Loan',
  STUDENT_LOAN: 'Student Loan', MORTGAGE: 'Mortgage',
  CAR_LOAN: 'Car Loan', FAMILY_LOAN: 'Family Loan',
  BUSINESS_LOAN: 'Business Loan', OTHER: 'Other',
}

// ─── sub-components ─────────────────────────────────────────────────────────

function DebtCard({ d }: { d: DebtSummary }) {
  const symbol = d.currencyCode === 'INR' ? '₹' : '£'
  const isCritical = d.payoffProgress < 25
  const isGbp = d.currencyCode === 'GBP'
  const progressColor = d.payoffProgress >= 75 ? 'bg-emerald-500' : d.payoffProgress >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {d.priorityOrder > 0 && (
              <span className="bg-indigo-900/60 text-indigo-300 text-xs font-bold px-2 py-0.5 rounded">
                #{d.priorityOrder}
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${isGbp ? 'bg-blue-900/60 text-blue-300' : 'bg-amber-900/60 text-amber-300'}`}>
              {d.currencyCode}
            </span>
            <p className="text-white font-semibold">{d.name}</p>
          </div>
          <p className="text-gray-500 text-xs">
            {DEBT_TYPE_LABELS[d.debtType] ?? d.debtType}
            {d.creditorName ? ` · ${d.creditorName}` : ''}
            {d.interestRate ? ` · ${d.interestRate}% APR` : ' · Interest-free'}
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className={`font-bold text-lg ${isCritical ? 'text-red-400' : 'text-white'}`}>
            {fmt(d.outstandingBalance, d.currencyCode)}
          </p>
          <p className="text-gray-500 text-xs">
            of {fmt(d.originalAmount, d.currencyCode)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{d.payoffProgress}% paid off</span>
          <span>{d.monthsToPayoff > 0 ? `${d.monthsToPayoff} months left` : 'Paid off'}</span>
        </div>
        <div className="bg-gray-800 rounded-full h-2">
          <div
            className={`${progressColor} h-2 rounded-full transition-all`}
            style={{ width: `${d.payoffProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Min. payment: {d.minimumPayment ? fmt(d.minimumPayment, d.currencyCode) : '—'}/mo</span>
          <span>Payoff: {d.estimatedPayoffDate}</span>
        </div>
      </div>
    </div>
  )
}

function CurrencySection({ group }: { group: CurrencyGroup }) {
  const isGbp = group.currency === 'GBP'
  const paidTotal = group.totalOriginal - group.totalOutstanding
  const progressPct = group.totalOriginal > 0 ? Math.round((paidTotal / group.totalOriginal) * 100) : 0

  return (
    <section className="space-y-3">
      {/* Section header */}
      <div className={`rounded-xl border px-5 py-4 ${isGbp ? 'bg-blue-950/30 border-blue-900' : 'bg-amber-950/30 border-amber-900'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${isGbp ? 'text-blue-400' : 'text-amber-400'}`}>
              {group.symbol}
            </span>
            <div>
              <p className="text-white font-semibold text-lg">{group.currency} Debts</p>
              <p className="text-gray-400 text-xs">{group.debtCount} active debt{group.debtCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Outstanding</p>
              <p className={`font-bold text-xl ${isGbp ? 'text-blue-300' : 'text-amber-300'}`}>
                {fmt(group.totalOutstanding, group.currency)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Monthly Min</p>
              <p className="text-white font-semibold text-lg">
                {fmt(group.monthlyMinimums, group.currency)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Progress</p>
              <p className="text-emerald-400 font-semibold text-lg">{progressPct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Debt cards */}
      <div className="space-y-3 pl-1">
        {group.debts.map((d) => <DebtCard key={d.id} d={d} />)}
      </div>
    </section>
  )
}

// ─── charts ─────────────────────────────────────────────────────────────────

function DebtBreakdownChart({ gbpGroup, inrGroup }: { gbpGroup: CurrencyGroup | null; inrGroup: CurrencyGroup | null }) {
  const data = [
    ...(gbpGroup?.debts ?? []).map((d) => ({
      name: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name,
      amount: d.outstandingBalance,
      currency: 'GBP',
    })),
    ...(inrGroup?.debts ?? []).map((d) => ({
      name: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name,
      amount: d.outstandingBalance,
      currency: 'INR',
    })),
  ].sort((a, b) => b.amount - a.amount)

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-40 text-gray-600 text-sm">No debt data</div>
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: typeof data[0]; value: number }[] }) => {
    if (!active || !payload?.[0]) return null
    const item = payload[0].payload
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
        <p className="text-white font-medium">{item.name}</p>
        <p className={item.currency === 'GBP' ? 'text-blue-400' : 'text-amber-400'}>
          {fmt(item.amount, item.currency)}
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db', fontSize: 11 }} width={100} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.currency === 'GBP' ? '#6366f1' : '#f59e0b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function PaymentHistoryChart({ data }: { data: MonthlyPaymentTotal[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <p className="text-gray-600 text-sm">No payments recorded in this period</p>
        <p className="text-gray-700 text-xs">Record a payment to see it here</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm space-y-1">
        <p className="text-gray-400 text-xs">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.name === 'gbp' ? '#818cf8' : '#fbbf24' }}>
            {p.name === 'gbp' ? '£' : '₹'}{p.value.toLocaleString(p.name === 'gbp' ? 'en-GB' : 'en-IN', { maximumFractionDigits: 0 })}
            {' '}<span className="text-gray-500 text-xs">{p.name.toUpperCase()}</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 100) / 10}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => <span className="text-gray-400 text-xs">{v.toUpperCase()}</span>} />
        <Bar dataKey="gbp" name="gbp" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
        <Bar dataKey="inr" name="inr" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Savings Allocation Section ──────────────────────────────────────────────

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface SavingsAllocationSectionProps {
  allDebts: DebtSummary[]
  inrRate: number | null
}

function SavingsAllocationSection({ allDebts, inrRate }: SavingsAllocationSectionProps) {
  const [debts, setDebts] = useState(allDebts)
  const [editing, setEditing] = useState<string | null>(null)
  const [pctInput, setPctInput] = useState(0)
  const [saving, setSaving] = useState(false)

  const allocated = debts.filter((d) => (d.savingsAllocationPercent ?? 0) > 0)
  const totalPct = allocated.reduce((s, d) => s + (d.savingsAllocationPercent ?? 0), 0)
  const unallocatedPct = Math.max(0, 100 - totalPct)

  const pieData = [
    ...allocated.map((d, i) => ({
      name: d.name,
      value: d.savingsAllocationPercent!,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    })),
    ...(unallocatedPct > 0 ? [{ name: 'Unallocated', value: unallocatedPct, fill: '#374151' }] : []),
  ]

  async function savePct(debtId: string, pct: number) {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/debts/${debtId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savingsAllocationPercent: pct }),
      })
      if (res.ok) {
        setDebts((prev) => prev.map((d) => d.id === debtId ? { ...d, savingsAllocationPercent: pct || null } : d))
        setEditing(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const PieCustomLabel = ({ cx, cy, midAngle, outerRadius, name, value }: {
    cx: number; cy: number; midAngle: number; outerRadius: number; name: string; value: number
  }) => {
    if (value < 5) return null
    const RADIAN = Math.PI / 180
    const r = outerRadius + 24
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="#d1d5db" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
        {name.length > 12 ? name.slice(0, 11) + '…' : name} {value}%
      </text>
    )
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Savings Allocation</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Set what % of monthly savings goes to each debt
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-md ${
          totalPct > 100 ? 'bg-red-900/40 text-red-300' :
          totalPct === 100 ? 'bg-emerald-900/40 text-emerald-300' :
          'bg-gray-800 text-gray-400'
        }`}>
          {totalPct}% allocated
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div>
          {allocated.length > 0 ? (
            <PieChart width={280} height={220}>
              <Pie
                data={pieData}
                cx={130}
                cy={110}
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={PieCustomLabel as unknown as boolean}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [`${v}%`, name]}
              />
            </PieChart>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
              No savings allocated yet
            </div>
          )}
        </div>

        {/* Debt list with % editors */}
        <div className="space-y-2">
          {debts.map((d) => {
            const pct = d.savingsAllocationPercent ?? 0
            const isEditing = editing === d.id
            const symbol = d.currencyCode === 'INR' ? '₹' : '£'
            return (
              <div key={d.id} className="bg-gray-800/60 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{d.name}</p>
                    <p className="text-gray-500 text-xs">
                      {symbol}{d.outstandingBalance.toLocaleString()}
                      {d.currencyCode === 'GBP' && inrRate
                        ? ` · ₹${Math.round(d.outstandingBalance * inrRate).toLocaleString('en-IN')}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditing ? (
                      <>
                        <input
                          type="number" min={0} max={100} step={1}
                          value={pctInput}
                          onChange={(e) => setPctInput(Number(e.target.value))}
                          className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                        <button
                          onClick={() => savePct(d.id, pctInput)}
                          disabled={saving}
                          className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition"
                        >
                          {saving ? '…' : '✓'}
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-md transition"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`text-sm font-semibold ${pct > 0 ? 'text-indigo-400' : 'text-gray-600'}`}>
                          {pct > 0 ? `${pct}%` : '—'}
                        </span>
                        <button
                          onClick={() => { setEditing(d.id); setPctInput(pct) }}
                          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition"
                        >
                          Set
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

interface Props {
  gbpGroup: CurrencyGroup | null
  inrGroup: CurrencyGroup | null
  otherGroups: CurrencyGroup[]
  planSummary: {
    debtFreeDate: string
    totalMonths: number
    totalInterestGbp: number
    totalMinimumGbp: number
  }
  paymentHistory: MonthlyPaymentTotal[]
  dateRange: { from: string; to: string }
  allDebts: DebtSummary[]
  inrRate: number | null
}

export default function DebtsPageClient({ gbpGroup, inrGroup, otherGroups, planSummary, paymentHistory, dateRange, allDebts, inrRate }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [from, setFrom] = useState(dateRange.from)
  const [to, setTo] = useState(dateRange.to)

  const hasDebts = (gbpGroup?.debtCount ?? 0) + (inrGroup?.debtCount ?? 0) + otherGroups.length > 0
  const totalGbpOutstanding = gbpGroup?.totalOutstanding ?? 0
  const totalInrOutstanding = inrGroup?.totalOutstanding ?? 0
  const allGroups = [gbpGroup, inrGroup, ...otherGroups].filter(Boolean) as CurrencyGroup[]

  function applyFilter() {
    startTransition(() => {
      router.push(`/debts?from=${from}&to=${to}`)
    })
  }

  const totalPaidInPeriod = paymentHistory.reduce((s, m) => s + m.total, 0)
  const totalGbpPaid = paymentHistory.reduce((s, m) => s + m.gbp, 0)
  const totalInrPaid = paymentHistory.reduce((s, m) => s + m.inr, 0)

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Debt Management</h1>
          <p className="text-gray-400 text-sm mt-1">Track and plan your debt payoff journey</p>
        </div>
        <a href="/debts/new" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition">
          + Add Debt
        </a>
      </div>

      {hasDebts ? (
        <>
          {/* ── Overview KPI Cards ── */}
          <section className="space-y-3">
            <h2 className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-950/40 border border-blue-900 rounded-xl px-5 py-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider">GBP Outstanding</p>
                <p className="text-blue-300 text-2xl font-bold mt-1">{fmtGbp(totalGbpOutstanding)}</p>
                <p className="text-gray-600 text-xs mt-1">{gbpGroup?.debtCount ?? 0} debt{(gbpGroup?.debtCount ?? 0) !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-amber-950/40 border border-amber-900 rounded-xl px-5 py-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider">INR Outstanding</p>
                <p className="text-amber-300 text-2xl font-bold mt-1">{totalInrOutstanding > 0 ? fmt(totalInrOutstanding, 'INR') : '—'}</p>
                <p className="text-gray-600 text-xs mt-1">{inrGroup?.debtCount ?? 0} debt{(inrGroup?.debtCount ?? 0) !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-red-950/30 border border-red-900 rounded-xl px-5 py-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Total Interest Left</p>
                <p className="text-red-400 text-2xl font-bold mt-1">{fmtGbp(planSummary.totalInterestGbp)}</p>
                <p className="text-gray-600 text-xs mt-1">Avalanche strategy</p>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-900 rounded-xl px-5 py-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Debt-Free Date</p>
                <p className="text-emerald-400 text-2xl font-bold mt-1">{planSummary.debtFreeDate}</p>
                <p className="text-gray-600 text-xs mt-1">{planSummary.totalMonths} months away</p>
              </div>
            </div>

            {/* GBP/INR monthly minimums row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">GBP Monthly Minimums</p>
                  <p className="text-white font-semibold mt-0.5">{fmtGbp(gbpGroup?.monthlyMinimums ?? 0)}/mo</p>
                </div>
                <span className="text-blue-400 text-2xl">£</span>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">INR Monthly Minimums</p>
                  <p className="text-white font-semibold mt-0.5">
                    {inrGroup ? fmt(inrGroup.monthlyMinimums, 'INR') + '/mo' : '—'}
                  </p>
                </div>
                <span className="text-amber-400 text-2xl">₹</span>
              </div>
            </div>
          </section>

          {/* ── Debt Breakdown Chart ── */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-white font-semibold">Debt Breakdown</h2>
              <p className="text-gray-500 text-xs mt-0.5">Outstanding balance per debt</p>
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> GBP
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> INR
                </span>
              </div>
            </div>
            <DebtBreakdownChart gbpGroup={gbpGroup} inrGroup={inrGroup} />
          </section>

          {/* ── Payment History Chart with Date Filter ── */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-white font-semibold">Payment Expenditure</h2>
                <p className="text-gray-500 text-xs mt-0.5">Monthly payments made by currency</p>
              </div>
              {/* Date filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-gray-600 text-xs">to</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={applyFilter}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-medium rounded-lg transition"
                >
                  {isPending ? '…' : 'Apply'}
                </button>
              </div>
            </div>

            {/* Period totals */}
            {paymentHistory.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-800/60 rounded-xl px-4 py-2.5">
                  <p className="text-gray-500 text-xs">GBP Paid</p>
                  <p className="text-blue-400 font-semibold text-sm">{fmtGbp(totalGbpPaid)}</p>
                </div>
                <div className="bg-gray-800/60 rounded-xl px-4 py-2.5">
                  <p className="text-gray-500 text-xs">INR Paid</p>
                  <p className="text-amber-400 font-semibold text-sm">
                    {totalInrPaid > 0 ? fmt(totalInrPaid, 'INR') : '—'}
                  </p>
                </div>
                <div className="bg-gray-800/60 rounded-xl px-4 py-2.5">
                  <p className="text-gray-500 text-xs">Payments ({paymentHistory.length} mo)</p>
                  <p className="text-white font-semibold text-sm">{paymentHistory.length > 0 ? `${paymentHistory.reduce((s, m) => s + (m.gbp > 0 ? 1 : 0) + (m.inr > 0 ? 1 : 0), 0)} txns` : '—'}</p>
                </div>
              </div>
            )}

            <PaymentHistoryChart data={paymentHistory} />
          </section>

          {/* ── Currency-Grouped Debt Sections ── */}
          {allGroups.map((group) => (
            <CurrencySection key={group.currency} group={group} />
          ))}

          {/* ── Savings Allocation ── */}
          <SavingsAllocationSection allDebts={allDebts} inrRate={inrRate} />
        </>
      ) : (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-16 text-center">
          <div className="text-4xl mb-4">💳</div>
          <p className="text-white font-medium">No active debts</p>
          <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
            Add credit cards, loans, or informal debts in GBP or INR to track them here.
          </p>
          <a href="/debts/new" className="inline-block mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition">
            + Add First Debt
          </a>
        </div>
      )}
    </div>
  )
}

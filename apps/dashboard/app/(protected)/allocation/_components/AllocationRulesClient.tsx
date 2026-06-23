'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Rule {
  id: string
  allocationOrder: number
  label: string
  targetType: string
  targetId: string | null
  allocationType: string
  allocationValue: number | null
  allocationPercent: number | null
  isEnabled: boolean
}

interface Source {
  id: string
  name: string
  currencyCode: string
  rules: Rule[]
}

const TYPE_LABELS: Record<string, string> = {
  FIXED_AMOUNT: 'Fixed £',
  PERCENTAGE: '% of income',
  REMAINING: 'Remaining cash',
}

const TARGET_OPTIONS = [
  { value: 'BUDGET_CATEGORY', label: 'General expense (rent, bills, etc.)' },
  { value: 'SAVINGS_GOAL',    label: 'Savings goal' },
  { value: 'DEBT',            label: 'Debt repayment' },
  { value: 'REMITTANCE_CATEGORY', label: 'India remittance' },
  { value: 'ACCOUNT',         label: 'Bank account transfer' },
]

export default function AllocationRulesClient({ source }: { source: Source }) {
  const router = useRouter()
  const [rules, setRules] = useState<Rule[]>(source.rules)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [allocType, setAllocType] = useState<'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING'>('FIXED_AMOUNT')

  async function handleDelete(id: string) {
    if (!confirm('Delete this allocation rule?')) return
    await fetch(`/api/v1/salary/allocation-rules/${id}`, { method: 'DELETE' })
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleToggle(rule: Rule) {
    const res = await fetch(`/api/v1/salary/allocation-rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !rule.isEnabled }),
    })
    if (res.ok) {
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r))
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      incomeSourceId: source.id,
      allocationOrder: rules.length + 1,
      label: fd.get('label'),
      targetType: fd.get('targetType') || 'BUDGET_CATEGORY',
      targetId: null,
      allocationType: allocType,
      isEnabled: true,
    }
    if (allocType === 'FIXED_AMOUNT') body.allocationValue = Number(fd.get('allocationValue'))
    if (allocType === 'PERCENTAGE')   body.allocationPercent = Number(fd.get('allocationPercent'))

    try {
      const res = await fetch('/api/v1/salary/allocation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to create rule')
        return
      }
      const rule = await res.json()
      setRules((prev) => [...prev, {
        ...rule,
        allocationValue: rule.allocationValue != null ? Number(rule.allocationValue) : null,
        allocationPercent: rule.allocationPercent != null ? Number(rule.allocationPercent) : null,
      }])
      setAdding(false)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  function formatRule(r: Rule) {
    if (r.allocationType === 'FIXED_AMOUNT') return `£${(r.allocationValue ?? 0).toFixed(2)}`
    if (r.allocationType === 'PERCENTAGE') return `${r.allocationPercent ?? 0}%`
    return 'All remaining'
  }

  const hasRemaining = rules.some((r) => r.allocationType === 'REMAINING' && r.isEnabled)

  return (
    <div className="rounded-xl border border-border bg-card shadow-[var(--card-shadow)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground font-semibold">{source.name}</h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            {source.currencyCode} · {rules.length} rule{rules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="text-sm px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition"
        >
          + Add Rule
        </button>
      </div>

      {rules.length === 0 && !adding ? (
        <p className="text-muted-foreground text-sm text-center py-4">
          No allocation rules yet. Add your first rule to start auto-allocating salary.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <div
              key={rule.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                rule.isEnabled
                  ? 'bg-muted/60 border-border'
                  : 'bg-muted/20 border-border opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground/60 text-xs w-5 text-right font-mono">{i + 1}</span>
                <div>
                  <p className="text-foreground text-sm font-medium">{rule.label}</p>
                  <p className="text-muted-foreground text-xs">
                    {TYPE_LABELS[rule.allocationType]} · {formatRule(rule)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(rule)}
                  className={`text-xs px-2 py-1 rounded-md transition ${
                    rule.isEnabled
                      ? 'text-success bg-success/20 hover:bg-success/30'
                      : 'text-muted-foreground bg-muted hover:bg-accent'
                  }`}
                >
                  {rule.isEnabled ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-xs text-destructive hover:text-destructive/80 transition px-2 py-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <form
          onSubmit={handleAdd}
          className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3 mt-2"
        >
          <p className="text-primary text-sm font-medium">New allocation rule</p>
          {error && <p className="text-destructive text-xs">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            {/* Label */}
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Label</label>
              <input
                name="label"
                required
                placeholder="e.g. Rent, Savings, Dad Support"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Category */}
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Category</label>
              <select
                name="targetType"
                defaultValue="BUDGET_CATEGORY"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {TARGET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Allocation type */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Allocation Type</label>
              <select
                value={allocType}
                onChange={(e) => setAllocType(e.target.value as typeof allocType)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="FIXED_AMOUNT">Fixed amount (£)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="REMAINING" disabled={hasRemaining}>
                  Remaining cash{hasRemaining ? ' (already set)' : ''}
                </option>
              </select>
            </div>

            {/* Amount input */}
            {allocType === 'FIXED_AMOUNT' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Amount (£)</label>
                <input
                  name="allocationValue"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="775.00"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}
            {allocType === 'PERCENTAGE' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Percentage (%)</label>
                <input
                  name="allocationPercent"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  required
                  placeholder="10"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}
            {allocType === 'REMAINING' && (
              <div className="flex items-end pb-2">
                <p className="text-muted-foreground text-xs">
                  Gets whatever is left after all fixed &amp; percentage rules run.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-foreground text-sm font-medium rounded-lg transition"
            >
              {saving ? 'Adding…' : 'Add Rule'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setError('') }}
              className="px-4 py-1.5 bg-muted hover:bg-accent text-foreground/80 text-sm rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

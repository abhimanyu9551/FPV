'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────

interface Split {
  incomeSourceId: string
  sourceName: string
  contributionPercent: number
}

interface SharedRule {
  id: string
  allocationOrder: number
  label: string
  category: string
  allocationType: string
  allocationValue: number | null
  allocationPercent: number | null
  isEnabled: boolean
  notes: string | null
  splits: Split[]
}

interface IncomeSource {
  id: string
  name: string
  currencyCode: string
}

// ─── Constants ───────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  CREDIT_CARD_PAYMENT: { label: 'Credit Card', icon: '💳', color: 'text-red-400' },
  EMI:                 { label: 'EMI',          icon: '🏦', color: 'text-orange-400' },
  RENT:                { label: 'Rent',          icon: '🏠', color: 'text-blue-400' },
  GROCERIES:           { label: 'Groceries',     icon: '🛒', color: 'text-green-400' },
  LEISURE:             { label: 'Leisure',       icon: '🎭', color: 'text-purple-400' },
  INVESTMENT:          { label: 'Investment',    icon: '📈', color: 'text-emerald-400' },
  SAVINGS:             { label: 'Savings',       icon: '💰', color: 'text-yellow-400' },
  GENERAL_EXPENSE:     { label: 'General',       icon: '📋', color: 'text-gray-400' },
  OTHER:               { label: 'Other',         icon: '•',  color: 'text-gray-400' },
}

const TYPE_LABELS: Record<string, string> = {
  FIXED_AMOUNT: 'Fixed £',
  PERCENTAGE:   '% of combined',
  REMAINING:    'Remaining',
}

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([v, { label }]) => ({ value: v, label }))

// ─── Subcomponents ───────────────────────────────────────────

function SplitBadge({ split, sourceName }: { split: Split; sourceName: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-800 rounded-md text-xs text-gray-300">
      <span className="text-gray-500">{sourceName}:</span>
      <span className="font-semibold text-white">{split.contributionPercent}%</span>
    </span>
  )
}

function RuleAmount(rule: SharedRule) {
  if (rule.allocationType === 'FIXED_AMOUNT') return `£${(rule.allocationValue ?? 0).toFixed(2)}`
  if (rule.allocationType === 'PERCENTAGE') return `${rule.allocationPercent ?? 0}% of combined`
  return 'Remaining cash'
}

// ─── Split Editor ─────────────────────────────────────────────

interface SplitEditorProps {
  sources: IncomeSource[]
  splits: { id: string; pct: number }[]
  onChange: (splits: { id: string; pct: number }[]) => void
}

function SplitEditor({ sources, splits, onChange }: SplitEditorProps) {
  const total = splits.reduce((s, sp) => s + sp.pct, 0)

  function setSplit(sourceId: string, pct: number) {
    onChange(splits.map((sp) => sp.id === sourceId ? { ...sp, pct } : sp))
  }

  function toggleSource(sourceId: string, checked: boolean) {
    if (checked) {
      onChange([...splits, { id: sourceId, pct: 0 }])
    } else {
      onChange(splits.filter((sp) => sp.id !== sourceId))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs text-gray-400">Who pays &amp; how much?</label>
        <span className={`text-xs font-medium ${total === 100 ? 'text-emerald-400' : total > 100 ? 'text-red-400' : 'text-amber-400'}`}>
          Total: {total}%
        </span>
      </div>
      {sources.map((src) => {
        const split = splits.find((sp) => sp.id === src.id)
        const isActive = !!split
        return (
          <div key={src.id} className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => toggleSource(src.id, e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-300 truncate">{src.name}</span>
            </label>
            {isActive && (
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={split!.pct}
                  onChange={(e) => setSplit(src.id, Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-gray-500 text-xs">%</span>
              </div>
            )}
          </div>
        )
      })}
      {total !== 100 && splits.length > 0 && (
        <p className="text-xs text-amber-400">
          Split percentages should add up to 100% (currently {total}%)
        </p>
      )}
      {splits.length === 0 && (
        <p className="text-xs text-gray-500">
          No sources selected — deduction will come from the largest available balance.
        </p>
      )}
    </div>
  )
}

// ─── Edit Form ────────────────────────────────────────────────

interface EditFormProps {
  rule: SharedRule
  sources: IncomeSource[]
  onSave: (rule: SharedRule) => void
  onCancel: () => void
}

function EditForm({ rule, sources, onSave, onCancel }: EditFormProps) {
  const [label, setLabel] = useState(rule.label)
  const [category, setCategory] = useState(rule.category)
  const [allocType, setAllocType] = useState(rule.allocationType)
  const [fixedAmt, setFixedAmt] = useState(rule.allocationValue ?? 0)
  const [pctAmt, setPctAmt] = useState(rule.allocationPercent ?? 0)
  const [splits, setSplits] = useState<{ id: string; pct: number }[]>(
    rule.splits.map((sp) => ({ id: sp.incomeSourceId, pct: sp.contributionPercent }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const body: Record<string, unknown> = {
      label,
      category,
      allocationType: allocType,
      isEnabled: rule.isEnabled,
      splits: splits.map((sp) => ({ incomeSourceId: sp.id, contributionPercent: sp.pct })),
    }
    if (allocType === 'FIXED_AMOUNT') body.allocationValue = fixedAmt
    if (allocType === 'PERCENTAGE') body.allocationPercent = pctAmt

    try {
      const res = await fetch(`/api/v1/salary/shared-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to update rule')
        return
      }
      const updated = await res.json()
      onSave({
        ...updated,
        allocationValue: updated.allocationValue != null ? Number(updated.allocationValue) : null,
        allocationPercent: updated.allocationPercent != null ? Number(updated.allocationPercent) : null,
        splits: updated.splits.map((sp: { incomeSourceId: string; contributionPercent: number; incomeSource: { name: string } }) => ({
          incomeSourceId: sp.incomeSourceId,
          sourceName: sp.incomeSource.name,
          contributionPercent: Number(sp.contributionPercent),
        })),
      })
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="border border-indigo-800 bg-indigo-950/20 rounded-xl p-4 space-y-3 mt-2">
      <p className="text-indigo-300 text-sm font-medium">Edit rule</p>
      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Label</label>
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select
            value={allocType}
            onChange={(e) => setAllocType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="FIXED_AMOUNT">Fixed amount (£)</option>
            <option value="PERCENTAGE">% of combined income</option>
            <option value="REMAINING">Remaining cash</option>
          </select>
        </div>

        {allocType === 'FIXED_AMOUNT' && (
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Amount (£)</label>
            <input
              type="number" min="0.01" step="0.01" required
              value={fixedAmt}
              onChange={(e) => setFixedAmt(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
        {allocType === 'PERCENTAGE' && (
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Percentage of combined income (%)</label>
            <input
              type="number" min="0.01" max="100" step="0.01" required
              value={pctAmt}
              onChange={(e) => setPctAmt(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="col-span-2">
          <SplitEditor sources={sources} splits={splits} onChange={setSplits} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-lg transition">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Main component ───────────────────────────────────────────

interface Props {
  rules: SharedRule[]
  sources: IncomeSource[]
}

export default function SharedAllocationRulesClient({ rules: initialRules, sources }: Props) {
  const router = useRouter()
  const [rules, setRules] = useState<SharedRule[]>(initialRules)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Add form state
  const [allocType, setAllocType] = useState<'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING'>('FIXED_AMOUNT')
  const [addSplits, setAddSplits] = useState<{ id: string; pct: number }[]>([])
  const [hasRemaining, setHasRemaining] = useState(rules.some((r) => r.allocationType === 'REMAINING' && r.isEnabled))

  async function handleDelete(id: string) {
    if (!confirm('Delete this shared allocation rule?')) return
    await fetch(`/api/v1/salary/shared-rules/${id}`, { method: 'DELETE' })
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleToggle(rule: SharedRule) {
    const res = await fetch(`/api/v1/salary/shared-rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !rule.isEnabled }),
    })
    if (res.ok) {
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r))
      setHasRemaining(rules.some((r) => r.allocationType === 'REMAINING' && (r.id === rule.id ? !rule.isEnabled : r.isEnabled)))
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const fd = new FormData(e.currentTarget)

    const body: Record<string, unknown> = {
      allocationOrder: rules.length + 1,
      label: fd.get('label'),
      category: fd.get('category') || 'OTHER',
      allocationType: allocType,
      isEnabled: true,
      splits: addSplits.map((sp) => ({ incomeSourceId: sp.id, contributionPercent: sp.pct })),
    }
    if (allocType === 'FIXED_AMOUNT') body.allocationValue = Number(fd.get('allocationValue'))
    if (allocType === 'PERCENTAGE') body.allocationPercent = Number(fd.get('allocationPercent'))

    try {
      const res = await fetch('/api/v1/salary/shared-rules', {
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
        splits: (rule.splits ?? []).map((sp: { incomeSourceId: string; contributionPercent: number; incomeSource: { name: string } }) => ({
          incomeSourceId: sp.incomeSourceId,
          sourceName: sp.incomeSource.name,
          contributionPercent: Number(sp.contributionPercent),
        })),
      }])
      if (allocType === 'REMAINING') setHasRemaining(true)
      setAdding(false)
      setAddSplits([])
      setAllocType('FIXED_AMOUNT')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  function handleEditSave(updated: SharedRule) {
    setRules((prev) => prev.map((r) => r.id === updated.id ? updated : r))
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Shared Allocation Rules</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Expenses split across both salaries · {rules.length} rule{rules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setAdding(!adding); setError('') }}
          className="text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
        >
          + Add Rule
        </button>
      </div>

      {rules.length === 0 && !adding ? (
        <p className="text-gray-600 text-sm text-center py-4">
          No shared rules yet. Add rent, EMI, credit card payments, etc.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, i) => {
            const cat = CATEGORY_LABELS[rule.category] ?? CATEGORY_LABELS.OTHER
            const isEditing = editingId === rule.id
            return (
              <div key={rule.id}>
                <div
                  className={`flex items-start justify-between px-4 py-3 rounded-xl border ${
                    rule.isEnabled
                      ? 'bg-gray-800/60 border-gray-700'
                      : 'bg-gray-800/20 border-gray-800 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-gray-600 text-xs w-5 text-right font-mono mt-0.5">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{cat.icon}</span>
                        <p className="text-white text-sm font-medium">{rule.label}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded bg-gray-700 ${cat.color}`}>
                          {cat.label}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {TYPE_LABELS[rule.allocationType]} · {RuleAmount(rule)}
                      </p>
                      {rule.splits.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-1.5">
                          {rule.splits.map((sp) => (
                            <SplitBadge
                              key={sp.incomeSourceId}
                              split={sp}
                              sourceName={sp.sourceName || sources.find((s) => s.id === sp.incomeSourceId)?.name || sp.incomeSourceId}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <button
                      onClick={() => setEditingId(isEditing ? null : rule.id)}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition"
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`text-xs px-2 py-1 rounded-md transition ${
                        rule.isEnabled
                          ? 'text-emerald-400 bg-emerald-900/30 hover:bg-emerald-900/50'
                          : 'text-gray-500 bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      {rule.isEnabled ? 'On' : 'Off'}
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-xs text-red-500 hover:text-red-400 transition px-2 py-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <EditForm
                    rule={rule}
                    sources={sources}
                    onSave={handleEditSave}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <form
          onSubmit={handleAdd}
          className="border border-indigo-800 bg-indigo-950/20 rounded-xl p-4 space-y-3 mt-2"
        >
          <p className="text-indigo-300 text-sm font-medium">New shared allocation rule</p>
          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Label</label>
              <input
                name="label"
                required
                placeholder="e.g. Rent, EMI, Netflix"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                name="category"
                defaultValue="OTHER"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Allocation Type</label>
              <select
                value={allocType}
                onChange={(e) => setAllocType(e.target.value as typeof allocType)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="FIXED_AMOUNT">Fixed amount (£)</option>
                <option value="PERCENTAGE">% of combined income</option>
                <option value="REMAINING" disabled={hasRemaining}>
                  Remaining cash{hasRemaining ? ' (already set)' : ''}
                </option>
              </select>
            </div>

            {allocType === 'FIXED_AMOUNT' && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Amount (£)</label>
                <input
                  name="allocationValue"
                  type="number" min="0.01" step="0.01" required
                  placeholder="775.00"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
            {allocType === 'PERCENTAGE' && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">% of combined income</label>
                <input
                  name="allocationPercent"
                  type="number" min="0.01" max="100" step="0.01" required
                  placeholder="10"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
            {allocType === 'REMAINING' && (
              <div className="col-span-2">
                <p className="text-gray-500 text-xs py-1">
                  Allocates whatever is left after all fixed &amp; percentage rules have run.
                </p>
              </div>
            )}

            <div className="col-span-2">
              <SplitEditor sources={sources} splits={addSplits} onChange={setAddSplits} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-lg transition">
              {saving ? 'Adding…' : 'Add Rule'}
            </button>
            <button type="button" onClick={() => { setAdding(false); setError(''); setAddSplits([]) }}
              className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

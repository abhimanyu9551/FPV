'use client'

import { useState } from 'react'

const EXAMPLE_SALARY = 3200

const STEPS = [
  {
    order: 1,
    label: 'Rent',
    type: 'Fixed £',
    value: '£775',
    result: '£775 ring-fenced',
    remaining: 2425,
    color: 'bg-rose-500',
  },
  {
    order: 2,
    label: 'Dad Support (India)',
    type: 'Fixed £',
    value: '£300',
    result: '£300 ring-fenced',
    remaining: 2125,
    color: 'bg-amber-500',
  },
  {
    order: 3,
    label: 'Savings',
    type: '10% of salary',
    value: '£320',
    result: '10% of £3,200',
    remaining: 1805,
    color: 'bg-emerald-500',
  },
  {
    order: 4,
    label: 'Spending cash',
    type: 'Remaining',
    value: '£1,805',
    result: 'Everything left',
    remaining: 0,
    color: 'bg-indigo-500',
  },
]

export default function HowItWorks() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-white text-sm font-medium">How allocation works</p>
            <p className="text-gray-500 text-xs">
              Rules run in priority order every time a salary is recorded
            </p>
          </div>
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-800">
          {/* Concept summary */}
          <div className="pt-4 grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-indigo-400 text-xl font-bold">1→2→3</p>
              <p className="text-white text-xs font-medium mt-1">Priority order</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Rules run top-down. Rule 1 gets its share first.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-emerald-400 text-xl font-bold">£ / %</p>
              <p className="text-white text-xs font-medium mt-1">Fixed or percent</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Fixed takes an exact amount. Percent takes a share of total salary.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-amber-400 text-xl font-bold">∞</p>
              <p className="text-white text-xs font-medium mt-1">Remaining (last)</p>
              <p className="text-gray-500 text-xs mt-0.5">
                One &ldquo;Remaining&rdquo; rule captures everything left over.
              </p>
            </div>
          </div>

          {/* Worked example */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">
              Example — £{EXAMPLE_SALARY.toLocaleString()} salary
            </p>

            <div className="space-y-2">
              {STEPS.map((step) => (
                <div key={step.order} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-4 font-mono text-right shrink-0">
                    {step.order}
                  </span>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${step.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between">
                      <span className="text-white text-sm font-medium truncate">{step.label}</span>
                      <span className="text-gray-300 text-sm font-mono ml-2 shrink-0">{step.value}</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-gray-500 text-xs">{step.type} → {step.result}</span>
                      <span className="text-gray-600 text-xs ml-2 shrink-0">
                        {step.remaining > 0 ? `£${step.remaining.toLocaleString()} left` : 'done'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-amber-400 text-xs font-semibold">Tips</p>
            <ul className="space-y-1 text-gray-400 text-xs list-none">
              <li>• Put critical fixed bills (rent, loan) at the top so they always run first.</li>
              <li>• Use one &ldquo;Remaining&rdquo; rule at the end as your spending / buffer account.</li>
              <li>• Toggle rules off temporarily instead of deleting them.</li>
              <li>• You can have rules for the same income source across different currencies.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

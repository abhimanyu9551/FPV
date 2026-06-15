import { getCurrentUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import AllocationRulesClient from './_components/AllocationRulesClient'
import SharedAllocationRulesClient from './_components/SharedAllocationRulesClient'
import HowItWorks from './_components/HowItWorks'

export default async function AllocationPage() {
  const profile = await getCurrentUserProfile()
  const sources = await incomeDAL.listSources(profile.id)

  const [sourcesWithRules, sharedRules] = await Promise.all([
    Promise.all(
      sources.map(async (s) => ({
        id: s.id,
        name: s.name,
        currencyCode: s.currencyCode,
        rules: (await incomeDAL.listAllocationRules(s.id)).map((r) => ({
          id: r.id,
          allocationOrder: r.allocationOrder,
          label: r.label,
          targetType: r.targetType,
          targetId: r.targetId,
          allocationType: r.allocationType,
          allocationValue: r.allocationValue != null ? Number(r.allocationValue) : null,
          allocationPercent: r.allocationPercent != null ? Number(r.allocationPercent) : null,
          isEnabled: r.isEnabled,
        })),
      }))
    ),
    incomeDAL.listSharedRules(),
  ])

  const sourceList = sources.map((s) => ({ id: s.id, name: s.name, currencyCode: s.currencyCode }))

  const sharedRulesList = sharedRules.map((r) => ({
    id: r.id,
    allocationOrder: r.allocationOrder,
    label: r.label,
    category: r.category,
    allocationType: r.allocationType,
    allocationValue: r.allocationValue != null ? Number(r.allocationValue) : null,
    allocationPercent: r.allocationPercent != null ? Number(r.allocationPercent) : null,
    isEnabled: r.isEnabled,
    notes: r.notes,
    splits: r.splits.map((sp) => ({
      incomeSourceId: sp.incomeSourceId,
      sourceName: sp.incomeSource.name,
      contributionPercent: Number(sp.contributionPercent),
    })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Salary Allocation</h1>
        <p className="text-gray-400 text-sm mt-1">
          Rules that distribute your combined salary automatically each month
        </p>
      </div>

      <HowItWorks />

      {sources.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-12 text-center">
          <p className="text-white font-medium">No income sources configured</p>
          <p className="text-gray-500 text-sm mt-1">Add income sources first via the Income page.</p>
        </div>
      ) : (
        <>
          {/* Shared rules — split across both salaries */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Shared Rules</h2>
            <p className="text-gray-500 text-sm mb-3">
              Each rule splits an expense across your salary sources by percentage.
              Processed in order: credit card first, then EMI, rent, etc.
            </p>
            <SharedAllocationRulesClient rules={sharedRulesList} sources={sourceList} />
          </div>

          {/* Per-source rules */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Per-Source Rules</h2>
            <p className="text-gray-500 text-sm mb-3">
              Additional rules specific to a single income source (applied after shared rules).
            </p>
            <div className="space-y-4">
              {sourcesWithRules.map((source) => (
                <AllocationRulesClient key={source.id} source={source} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

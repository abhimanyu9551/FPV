import { getCurrentUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import AllocationRulesClient from './_components/AllocationRulesClient'
import HowItWorks from './_components/HowItWorks'

export default async function AllocationPage() {
  const profile = await getCurrentUserProfile()
  const sources = await incomeDAL.listSources(profile.id)

  const sourcesWithRules = await Promise.all(
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
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Salary Allocation</h1>
        <p className="text-gray-400 text-sm mt-1">
          Priority-ordered rules that distribute each salary payment automatically
        </p>
      </div>

      <HowItWorks />

      {sourcesWithRules.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl px-6 py-12 text-center">
          <p className="text-white font-medium">No income sources configured</p>
          <p className="text-gray-500 text-sm mt-1">Add an income source first via the Income page.</p>
        </div>
      ) : (
        sourcesWithRules.map((source) => (
          <AllocationRulesClient key={source.id} source={source} />
        ))
      )}
    </div>
  )
}

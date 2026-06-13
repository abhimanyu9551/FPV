import { getCurrentUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import { exchangeRatesDAL } from '@/lib/dal/exchange-rates.dal'
import { CurrencyService } from '@/lib/services/currency.service'
import ExchangeRateForm from './_components/ExchangeRateForm'

export default async function SettingsPage() {
  const profile = await getCurrentUserProfile()
  const [sources, latestRate] = await Promise.all([
    incomeDAL.listSources(profile.id),
    exchangeRatesDAL.findLatest('GBP', 'INR'),
  ])

  const sourcesWithRules = await Promise.all(
    sources.map(async (s) => ({
      ...s,
      ruleCount: (await incomeDAL.listAllocationRules(s.id)).length,
    }))
  )

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage exchange rates and account configuration</p>
      </div>

      {/* Profile */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-white font-semibold">Your Profile</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Name</p>
            <p className="text-white mt-0.5">{profile.fullName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Email</p>
            <p className="text-white mt-0.5">{profile.email}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Role</p>
            <p className="text-white mt-0.5">{profile.role}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Member since</p>
            <p className="text-white mt-0.5">
              {new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </section>

      {/* Exchange Rate */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-white font-semibold">GBP → INR Exchange Rate</h2>
          <p className="text-gray-500 text-xs mt-0.5">Manually set the rate used for salary processing and remittances</p>
        </div>
        {latestRate && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3">
            <p className="text-gray-400 text-xs">Current rate (as of {new Date(latestRate.effectiveDate).toLocaleDateString('en-GB')})</p>
            <p className="text-white text-2xl font-bold mt-1">£1 = ₹{Number(latestRate.rate).toFixed(2)}</p>
          </div>
        )}
        <ExchangeRateForm currentRate={latestRate ? Number(latestRate.rate) : undefined} userId={profile.id} />
      </section>

      {/* Income Sources Summary */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Income Sources</h2>
          <a href="/allocation" className="text-indigo-400 hover:text-indigo-300 text-xs transition">Manage rules →</a>
        </div>
        {sourcesWithRules.map((s) => (
          <div key={s.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
            <div>
              <p className="text-white text-sm">{s.name}</p>
              <p className="text-gray-500 text-xs">{s.sourceType} · {s.frequency} · {s.currencyCode}</p>
            </div>
            <span className="text-gray-400 text-xs">{s.ruleCount} rule{s.ruleCount !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </section>
    </div>
  )
}

import Decimal from 'decimal.js'
import { incomeDAL } from '@/lib/dal/income.dal'
import { exchangeRatesDAL } from '@/lib/dal/exchange-rates.dal'
import { allocationEngine } from './allocation-engine.service'
import { CurrencyService } from './currency.service'
import type { AllocationRuleInput } from './allocation-engine.service'
import type { CreateIncomeEntryInput } from '@/lib/validators/income.schema'

export const incomeService = {
  async listSources(userId: string) {
    return incomeDAL.listSources(userId)
  },

  async listEntries(userId: string, limit = 12) {
    return incomeDAL.listEntries(userId, limit)
  },

  async createEntry(userId: string, input: CreateIncomeEntryInput) {
    let baseAmountGbp: number

    if (input.originalCurrency === 'GBP') {
      baseAmountGbp = input.originalAmount
    } else {
      if (!input.exchangeRate) {
        throw new Error('Exchange rate is required for non-GBP income entries')
      }
      baseAmountGbp = CurrencyService.convertWithRate(input.originalAmount, input.exchangeRate).toNumber()
    }

    return incomeDAL.createEntry(userId, {
      incomeSourceId: input.incomeSourceId,
      receivedDate: input.receivedDate,
      originalAmount: input.originalAmount,
      originalCurrency: input.originalCurrency,
      baseAmountGbp,
      notes: input.notes,
    })
  },

  async processAllocation(incomeEntryId: string, userId: string, manualRate?: number) {
    const entry = await incomeDAL.findEntry(incomeEntryId)
    if (!entry) throw new Error('Income entry not found')
    if (entry.isProcessed) throw new Error('This income entry has already been processed')

    const rules: AllocationRuleInput[] = entry.incomeSource.allocationRules.map((r) => ({
      id: r.id,
      allocationOrder: r.allocationOrder,
      label: r.label,
      targetType: r.targetType,
      targetId: r.targetId,
      allocationType: r.allocationType as 'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING',
      allocationValue: r.allocationValue ? new Decimal(r.allocationValue.toString()) : null,
      allocationPercent: r.allocationPercent ? new Decimal(r.allocationPercent.toString()) : null,
      minAmount: r.minAmount ? new Decimal(r.minAmount.toString()) : null,
      maxAmount: r.maxAmount ? new Decimal(r.maxAmount.toString()) : null,
      isEnabled: r.isEnabled,
    }))

    const result = allocationEngine.run(entry.baseAmountGbp.toNumber(), rules)

    const ledger = await incomeDAL.createAllocationLedger({
      incomeEntryId,
      totalIncome: result.incomeAmountGbp.toNumber(),
      totalAllocated: result.totalAllocated.toNumber(),
      remainingCash: result.remainingCash.toNumber(),
      hasWarnings: result.hasWarnings,
      warningMessages: result.warnings.map((w) => w.message),
      items: result.items.map((item) => ({
        allocationRuleId: item.ruleId,
        allocatedAmount: item.allocatedAmount.toNumber(),
        label: item.label,
        targetType: item.targetType,
        targetId: item.targetId,
      })),
    })

    await incomeDAL.markProcessed(incomeEntryId)

    return { result, ledger }
  },

  async previewAllocation(incomeSourceId: string, amount: number) {
    const source = await incomeDAL.findSource(incomeSourceId)
    if (!source) throw new Error('Income source not found')

    const rules: AllocationRuleInput[] = source.allocationRules.map((r) => ({
      id: r.id,
      allocationOrder: r.allocationOrder,
      label: r.label,
      targetType: r.targetType,
      targetId: r.targetId,
      allocationType: r.allocationType as 'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING',
      allocationValue: r.allocationValue ? new Decimal(r.allocationValue.toString()) : null,
      allocationPercent: r.allocationPercent ? new Decimal(r.allocationPercent.toString()) : null,
      minAmount: r.minAmount ? new Decimal(r.minAmount.toString()) : null,
      maxAmount: r.maxAmount ? new Decimal(r.maxAmount.toString()) : null,
      isEnabled: r.isEnabled,
    }))

    return allocationEngine.preview(amount, rules)
  },
}

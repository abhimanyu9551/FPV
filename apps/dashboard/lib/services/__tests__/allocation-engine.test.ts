import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { AllocationEngine } from '../allocation-engine.service'
import type { AllocationRuleInput } from '../allocation-engine.service'

function rule(
  overrides: Partial<AllocationRuleInput> & { id: string; allocationOrder: number; label: string; allocationType: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'REMAINING' }
): AllocationRuleInput {
  return {
    targetType: 'ACCOUNT',
    targetId: null,
    allocationValue: null,
    allocationPercent: null,
    minAmount: null,
    maxAmount: null,
    isEnabled: true,
    ...overrides,
  }
}

const engine = new AllocationEngine()

describe('AllocationEngine', () => {
  describe('run()', () => {
    it('allocates fixed amounts in priority order', () => {
      const rules: AllocationRuleInput[] = [
        rule({ id: 'r1', allocationOrder: 1, label: 'India Transfer', allocationType: 'FIXED_AMOUNT', allocationValue: new Decimal(800) }),
        rule({ id: 'r2', allocationOrder: 2, label: 'Rent',           allocationType: 'FIXED_AMOUNT', allocationValue: new Decimal(1200) }),
        rule({ id: 'r3', allocationOrder: 3, label: 'Remaining',      allocationType: 'REMAINING' }),
      ]

      const result = engine.run(3000, rules)

      expect(result.incomeAmountGbp.toNumber()).toBe(3000)
      expect(result.items[0].allocatedAmount.toNumber()).toBe(800)
      expect(result.items[1].allocatedAmount.toNumber()).toBe(1200)
      expect(result.items[2].allocatedAmount.toNumber()).toBe(1000) // 3000-800-1200
      expect(result.remainingCash.toNumber()).toBe(0)
      expect(result.hasWarnings).toBe(false)
    })

    it('allocates by percentage of income', () => {
      const rules: AllocationRuleInput[] = [
        rule({ id: 'r1', allocationOrder: 1, label: '20% Savings', allocationType: 'PERCENTAGE', allocationPercent: new Decimal(20) }),
        rule({ id: 'r2', allocationOrder: 2, label: 'Rest',        allocationType: 'REMAINING' }),
      ]

      const result = engine.run(2000, rules)

      expect(result.items[0].allocatedAmount.toNumber()).toBe(400) // 20% of 2000
      expect(result.items[1].allocatedAmount.toNumber()).toBe(1600)
      expect(result.remainingCash.toNumber()).toBe(0)
    })

    it('soft-warns when income is insufficient for a fixed rule', () => {
      const rules: AllocationRuleInput[] = [
        rule({ id: 'r1', allocationOrder: 1, label: 'India', allocationType: 'FIXED_AMOUNT', allocationValue: new Decimal(2500) }),
        rule({ id: 'r2', allocationOrder: 2, label: 'Savings', allocationType: 'FIXED_AMOUNT', allocationValue: new Decimal(1000) }),
      ]

      const result = engine.run(3000, rules)

      expect(result.items[0].allocatedAmount.toNumber()).toBe(2500)
      expect(result.items[1].allocatedAmount.toNumber()).toBe(500) // Only 500 left
      expect(result.hasWarnings).toBe(true)
      expect(result.warnings[0].label).toBe('Savings')
      expect(result.warnings[0].requested.toNumber()).toBe(1000)
      expect(result.warnings[0].allocated.toNumber()).toBe(500)
    })

    it('skips disabled rules', () => {
      const rules: AllocationRuleInput[] = [
        rule({ id: 'r1', allocationOrder: 1, label: 'Disabled', allocationType: 'FIXED_AMOUNT', allocationValue: new Decimal(500), isEnabled: false }),
        rule({ id: 'r2', allocationOrder: 2, label: 'Active', allocationType: 'REMAINING' }),
      ]

      const result = engine.run(1000, rules)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].allocatedAmount.toNumber()).toBe(1000)
    })

    it('returns 0 remaining when REMAINING rule consumes all', () => {
      const rules: AllocationRuleInput[] = [
        rule({ id: 'r1', allocationOrder: 1, label: 'All Cash', allocationType: 'REMAINING' }),
      ]
      const result = engine.run(5000, rules)
      expect(result.remainingCash.toNumber()).toBe(0)
      expect(result.totalAllocated.toNumber()).toBe(5000)
    })

    it('handles zero income gracefully', () => {
      const rules: AllocationRuleInput[] = [
        rule({ id: 'r1', allocationOrder: 1, label: 'Fixed', allocationType: 'FIXED_AMOUNT', allocationValue: new Decimal(500) }),
      ]
      const result = engine.run(0, rules)
      expect(result.items[0].allocatedAmount.toNumber()).toBe(0)
      expect(result.hasWarnings).toBe(true)
    })

    it('respects maxAmount cap on percentage rule', () => {
      const rules: AllocationRuleInput[] = [
        rule({
          id: 'r1',
          allocationOrder: 1,
          label: 'Capped savings',
          allocationType: 'PERCENTAGE',
          allocationPercent: new Decimal(30),
          maxAmount: new Decimal(500),
        }),
        rule({ id: 'r2', allocationOrder: 2, label: 'Rest', allocationType: 'REMAINING' }),
      ]
      const result = engine.run(3000, rules) // 30% = 900, but capped at 500
      expect(result.items[0].allocatedAmount.toNumber()).toBe(500)
      expect(result.items[1].allocatedAmount.toNumber()).toBe(2500)
    })
  })

  describe('validate()', () => {
    it('rejects multiple REMAINING rules', () => {
      const rules: AllocationRuleInput[] = [
        rule({ id: 'r1', allocationOrder: 1, label: 'A', allocationType: 'REMAINING' }),
        rule({ id: 'r2', allocationOrder: 2, label: 'B', allocationType: 'REMAINING' }),
      ]
      const errors = engine.validate(rules)
      expect(errors.some((e) => e.includes('REMAINING'))).toBe(true)
    })

    it('rejects total percentage over 100', () => {
      const rules: AllocationRuleInput[] = [
        rule({ id: 'r1', allocationOrder: 1, label: 'A', allocationType: 'PERCENTAGE', allocationPercent: new Decimal(70) }),
        rule({ id: 'r2', allocationOrder: 2, label: 'B', allocationType: 'PERCENTAGE', allocationPercent: new Decimal(40) }),
      ]
      const errors = engine.validate(rules)
      expect(errors.some((e) => e.includes('%'))).toBe(true)
    })

    it('passes valid rule set', () => {
      const rules: AllocationRuleInput[] = [
        rule({ id: 'r1', allocationOrder: 1, label: 'India', allocationType: 'FIXED_AMOUNT', allocationValue: new Decimal(800) }),
        rule({ id: 'r2', allocationOrder: 2, label: 'Savings', allocationType: 'PERCENTAGE', allocationPercent: new Decimal(20) }),
        rule({ id: 'r3', allocationOrder: 3, label: 'Rest', allocationType: 'REMAINING' }),
      ]
      const errors = engine.validate(rules)
      expect(errors).toHaveLength(0)
    })
  })
})

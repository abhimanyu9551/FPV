import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { DebtPlannerService } from '../debt-planner.service'
import type { DebtInput } from '../debt-planner.service'

const planner = new DebtPlannerService()

function debt(overrides: Omit<Partial<DebtInput>, 'outstandingBalance' | 'id'> & { id: string; outstandingBalance: number }): DebtInput {
  return {
    name: overrides.id,
    debtType: 'PERSONAL_LOAN',
    interestRate: new Decimal(10),
    minimumPayment: new Decimal(100),
    repaymentStrategy: 'AVALANCHE',
    priority: 0,
    ...overrides,
    outstandingBalance: new Decimal(overrides.outstandingBalance),
  }
}

describe('DebtPlannerService', () => {
  describe('buildPlan()', () => {
    it('returns empty plan for no debts', () => {
      const plan = planner.buildPlan([])
      expect(plan.debts).toHaveLength(0)
      expect(plan.totalMonthsToDebtFree).toBe(0)
    })

    it('snowball sorts by balance ascending', () => {
      const debts: DebtInput[] = [
        debt({ id: 'big', outstandingBalance: 5000, interestRate: new Decimal(5) }),
        debt({ id: 'small', outstandingBalance: 500, interestRate: new Decimal(20) }),
        debt({ id: 'mid', outstandingBalance: 2000, interestRate: new Decimal(10) }),
      ]
      const plan = planner.buildPlan(debts, 'SNOWBALL')
      expect(plan.debts[0].debtId).toBe('small')
      expect(plan.debts[1].debtId).toBe('mid')
      expect(plan.debts[2].debtId).toBe('big')
    })

    it('avalanche sorts by interest rate descending', () => {
      const debts: DebtInput[] = [
        debt({ id: 'low-rate', outstandingBalance: 5000, interestRate: new Decimal(5) }),
        debt({ id: 'high-rate', outstandingBalance: 1000, interestRate: new Decimal(25) }),
        debt({ id: 'mid-rate', outstandingBalance: 2000, interestRate: new Decimal(15) }),
      ]
      const plan = planner.buildPlan(debts, 'AVALANCHE')
      expect(plan.debts[0].debtId).toBe('high-rate')
      expect(plan.debts[1].debtId).toBe('mid-rate')
      expect(plan.debts[2].debtId).toBe('low-rate')
    })

    it('computes months to payoff for interest-free debt', () => {
      const debts: DebtInput[] = [
        debt({ id: 'family-loan', outstandingBalance: 1000, interestRate: null, minimumPayment: new Decimal(100) }),
      ]
      const plan = planner.buildPlan(debts)
      expect(plan.debts[0].monthsToPayoff).toBe(10) // 1000/100
      expect(plan.debts[0].totalInterestCost.toNumber()).toBe(0)
    })

    it('flags 999 months when payment cannot cover interest', () => {
      const debts: DebtInput[] = [
        debt({ id: 'trap', outstandingBalance: 10000, interestRate: new Decimal(24), minimumPayment: new Decimal(50) }),
        // Monthly interest = 10000 * 0.24/12 = 200 > 50 minimum
      ]
      const plan = planner.buildPlan(debts)
      expect(plan.debts[0].monthsToPayoff).toBe(999)
    })
  })

  describe('calcPayoff()', () => {
    it('returns 0 months for zero balance', () => {
      const { months } = planner.calcPayoff(new Decimal(0), new Decimal(10), new Decimal(100))
      expect(months).toBe(0)
    })

    it('computes correct payoff for standard amortizing debt', () => {
      // £1000 at 12% APR, £100/month → ~11 months
      const { months, totalInterest } = planner.calcPayoff(
        new Decimal(1000),
        new Decimal(12),
        new Decimal(100)
      )
      expect(months).toBeGreaterThan(9)
      expect(months).toBeLessThan(15)
      expect(totalInterest.toNumber()).toBeGreaterThan(0)
    })
  })

  describe('suggestExtraPayment()', () => {
    it('suggests extra payment to focus debt', () => {
      const plan = planner.buildPlan([
        debt({ id: 'd1', outstandingBalance: 500 }),
        debt({ id: 'd2', outstandingBalance: 2000 }),
      ], 'SNOWBALL')

      const suggestion = planner.suggestExtraPayment(plan, new Decimal(200))
      expect(suggestion?.debtId).toBe('d1') // Snowball — smallest first
      expect(suggestion?.extraAmount.toNumber()).toBe(200)
    })
  })
})

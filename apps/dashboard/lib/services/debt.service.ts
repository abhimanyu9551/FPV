import Decimal from 'decimal.js'
import { debtsDAL } from '@/lib/dal/debts.dal'
import { debtPlannerService } from './debt-planner.service'
import type { DebtInput } from './debt-planner.service'
import type { CreateDebtInput, CreateDebtPaymentInput } from '@/lib/validators/debt.schema'

export const debtService = {
  async listActive() {
    return debtsDAL.listActive()
  },

  async findById(id: string) {
    const debt = await debtsDAL.findById(id)
    if (!debt) throw new Error('Debt not found')
    return debt
  },

  async create(data: CreateDebtInput) {
    return debtsDAL.create({
      name: data.name,
      debtType: data.debtType,
      creditorName: data.creditorName,
      originalAmount: data.originalAmount,
      outstandingBalance: data.outstandingBalance,
      interestRate: data.interestRate,
      minimumPayment: data.minimumPayment,
      paymentDueDay: data.paymentDueDay,
      currencyCode: data.currencyCode,
      startDate: data.startDate,
      maturityDate: data.maturityDate,
      repaymentStrategy: data.repaymentStrategy,
      priority: data.priority,
      notes: data.notes,
    })
  },

  async recordPayment(userId: string, input: CreateDebtPaymentInput) {
    const debt = await debtsDAL.findById(input.debtId)
    if (!debt) throw new Error('Debt not found')

    const totalPayment = input.principalPaid + input.interestPaid
    const balanceAfter = Math.max(0, debt.outstandingBalance.toNumber() - input.principalPaid)

    return debtsDAL.recordPayment({
      debtId: input.debtId,
      paidById: userId,
      paymentDate: input.paymentDate,
      principalPaid: input.principalPaid,
      interestPaid: input.interestPaid,
      totalPayment,
      balanceAfter,
      isMinimumPayment: input.isMinimumPayment,
      notes: input.notes,
      chargedToCreditCardId: input.chargedToCreditCardId,
    })
  },

  async buildPlan(strategy?: 'SNOWBALL' | 'AVALANCHE' | 'CUSTOM') {
    const debts = await debtsDAL.listActive()

    const inputs: DebtInput[] = debts.map((d) => ({
      id: d.id,
      name: d.name,
      debtType: d.debtType,
      outstandingBalance: new Decimal(d.outstandingBalance.toString()),
      interestRate: d.interestRate ? new Decimal(d.interestRate.toString()) : null,
      minimumPayment: d.minimumPayment ? new Decimal(d.minimumPayment.toString()) : null,
      repaymentStrategy: d.repaymentStrategy as 'SNOWBALL' | 'AVALANCHE' | 'CUSTOM',
      priority: d.priority,
    }))

    return debtPlannerService.buildPlan(inputs, strategy)
  },

  async getTotalOutstanding() {
    const debts = await debtsDAL.listActive()
    return debts.reduce(
      (sum, d) => sum.plus(new Decimal(d.outstandingBalance.toString())),
      new Decimal(0)
    )
  },
}

import { notFound } from 'next/navigation'
import { debtsDAL } from '@/lib/dal/debts.dal'
import EditDebtForm from './EditDebtForm'

export default async function EditDebtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const debt = await debtsDAL.findById(id)
  if (!debt) notFound()

  return (
    <div className="max-w-xl space-y-6">
      <EditDebtForm debt={{
        id: debt.id,
        name: debt.name,
        debtType: debt.debtType,
        creditorName: debt.creditorName,
        originalAmount: Number(debt.originalAmount),
        outstandingBalance: Number(debt.outstandingBalance),
        interestRate: debt.interestRate ? Number(debt.interestRate) : null,
        minimumPayment: debt.minimumPayment ? Number(debt.minimumPayment) : null,
        paymentDueDay: debt.paymentDueDay,
        currencyCode: debt.currencyCode,
        startDate: debt.startDate.toISOString().slice(0, 10),
        maturityDate: debt.maturityDate ? debt.maturityDate.toISOString().slice(0, 10) : null,
        repaymentStrategy: debt.repaymentStrategy,
        priority: debt.priority,
        notes: debt.notes,
        status: debt.status,
      }} />
    </div>
  )
}

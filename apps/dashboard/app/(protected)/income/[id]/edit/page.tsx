import { notFound } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth'
import { incomeDAL } from '@/lib/dal/income.dal'
import EditIncomeForm from './EditIncomeForm'

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUserProfile()
  const { id } = await params
  const entry = await incomeDAL.findEntry(id)
  if (!entry) notFound()

  return (
    <EditIncomeForm
      entry={{
        id: entry.id,
        incomeSourceId: entry.incomeSourceId,
        receivedDate: entry.receivedDate.toISOString(),
        originalAmount: Number(entry.originalAmount),
        originalCurrency: entry.originalCurrency,
        baseAmountGbp: Number(entry.baseAmountGbp),
        notes: entry.notes,
        isProcessed: entry.isProcessed,
        incomeSource: { name: entry.incomeSource.name },
      }}
    />
  )
}

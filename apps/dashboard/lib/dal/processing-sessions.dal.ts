import { db } from '@/lib/db'

export const processingSessionsDAL = {
  async create(data: {
    userId: string
    sessionType: 'SINGLE_ENTRY' | 'MONTHLY'
    incomeEntryId?: string
    year?: number
    month?: number
    totalIncome: number
    totalAllocated: number
    remainingCash: number
    hasWarnings: boolean
    ledgerIds: string[]
  }) {
    return db.processingSession.create({ data })
  },

  async listForUser(userId: string, limit = 20) {
    return db.processingSession.findMany({
      where: { userId },
      orderBy: { processedAt: 'desc' },
      take: limit,
    })
  },

  async findById(id: string) {
    return db.processingSession.findUnique({ where: { id } })
  },

  async undo(sessionId: string, userId: string) {
    const session = await db.processingSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new Error('Processing session not found')
    if (session.userId !== userId) throw new Error('Unauthorized')
    if (session.status === 'UNDONE') throw new Error('Session has already been undone')

    return db.$transaction(async (tx) => {
      // Delete allocation ledger items and ledgers for this session
      for (const ledgerId of session.ledgerIds) {
        const ledger = await tx.allocationLedger.findUnique({
          where: { id: ledgerId },
          select: { incomeEntryId: true },
        })
        if (!ledger) continue

        await tx.allocationLedgerItem.deleteMany({ where: { ledgerId } })
        await tx.allocationLedger.delete({ where: { id: ledgerId } })

        // Reset income entry processed state
        await tx.incomeEntry.update({
          where: { id: ledger.incomeEntryId },
          data: { isProcessed: false, processedAt: null },
        })
      }

      // Mark session as undone
      return tx.processingSession.update({
        where: { id: sessionId },
        data: { status: 'UNDONE', undoneAt: new Date() },
      })
    })
  },
}

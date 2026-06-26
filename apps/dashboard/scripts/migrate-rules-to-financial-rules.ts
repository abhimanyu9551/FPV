/**
 * One-time migration: converts existing AllocationRule and SharedAllocationRule
 * records into FinancialRule records. Idempotent — safe to run multiple times.
 *
 * Usage:
 *   pnpm --filter @fpv/dashboard exec tsx scripts/migrate-rules-to-financial-rules.ts
 */

import { PrismaClient, type RuleCategory } from '@prisma/client'

const db = new PrismaClient({ log: ['error'] })

async function main() {
  console.log('Starting rule migration...')

  // ── 1. Find all active admin user (migration runs as them) ──────────
  const adminUser = await db.userProfile.findFirst({
    where: { role: 'ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!adminUser) throw new Error('No admin user found — cannot run migration')
  console.log(`Running as: ${adminUser.fullName} (${adminUser.id})`)

  // ── 2. Migrate AllocationRules → FinancialRule (INDIVIDUAL) ─────────
  const allocationRules = await db.allocationRule.findMany({
    include: { incomeSource: { select: { id: true, userId: true } } },
    orderBy: { allocationOrder: 'asc' },
  })

  let allocationMigrated = 0
  for (const rule of allocationRules) {
    // Check if already migrated (same label + incomeSourceId)
    const existing = await db.financialRule.findFirst({
      where: {
        name: rule.label,
        incomeSourceId: rule.incomeSourceId,
        userId: rule.incomeSource.userId,
      },
    })
    if (existing) {
      console.log(`  [skip] AllocationRule "${rule.label}" already migrated`)
      continue
    }

    const newRule = await db.financialRule.create({
      data: {
        userId: rule.incomeSource.userId,
        name: rule.label,
        description: `Migrated from AllocationRule (id: ${rule.id})`,
        category: inferCategory(rule.label) as RuleCategory,
        priority: rule.allocationOrder,
        isActive: rule.isEnabled,
        allocationType: rule.allocationType,
        allocationValue: rule.allocationValue,
        allocationPercent: rule.allocationPercent,
        minAmount: rule.minAmount,
        maxAmount: rule.maxAmount,
        targetType: rule.targetType,
        targetId: rule.targetId,
        paymentResponsibility: 'INDIVIDUAL',
        incomeSourceId: rule.incomeSourceId,
      },
    })

    await db.financialRuleVersion.create({
      data: {
        ruleId: newRule.id,
        version: 1,
        snapshot: {
          name: newRule.name,
          migratedFromAllocationRuleId: rule.id,
        },
        changedById: adminUser.id,
        changeNote: 'Migrated from AllocationRule',
      },
    })

    allocationMigrated++
    console.log(`  [ok] AllocationRule "${rule.label}" → FinancialRule "${newRule.id}"`)
  }

  // ── 3. Migrate SharedAllocationRules → FinancialRule (SHARED) ───────
  const sharedRules = await db.sharedAllocationRule.findMany({
    include: {
      splits: { include: { incomeSource: { select: { userId: true } } } },
    },
    orderBy: { allocationOrder: 'asc' },
  })

  let sharedMigrated = 0
  for (const rule of sharedRules) {
    const existing = await db.financialRule.findFirst({
      where: {
        name: rule.label,
        incomeSourceId: null,
        paymentResponsibility: 'SHARED',
      },
    })
    if (existing) {
      console.log(`  [skip] SharedAllocationRule "${rule.label}" already migrated`)
      continue
    }

    // Build person-based splits from income-source splits
    // Group by userId and sum percentages (in case same user has multiple sources)
    const userPercentMap = new Map<string, number>()
    for (const split of rule.splits) {
      const uid = split.incomeSource.userId
      userPercentMap.set(uid, (userPercentMap.get(uid) ?? 0) + Number(split.contributionPercent))
    }

    const splits = [...userPercentMap.entries()].map(([userId, percent]) => ({ userId, percent }))
    const totalPct = splits.reduce((s, sp) => s + sp.percent, 0)

    // Normalise to 100% if rounding drift
    if (splits.length > 0 && Math.abs(totalPct - 100) < 1) {
      const diff = 100 - totalPct
      splits[0].percent += diff
    }

    const newRule = await db.financialRule.create({
      data: {
        userId: adminUser.id,
        name: rule.label,
        description: `Migrated from SharedAllocationRule (id: ${rule.id})`,
        category: mapSharedCategory(rule.category) as RuleCategory,
        priority: rule.allocationOrder,
        isActive: rule.isEnabled,
        allocationType: rule.allocationType,
        allocationValue: rule.allocationValue,
        allocationPercent: rule.allocationPercent,
        targetType: rule.targetType,
        targetId: rule.targetId,
        paymentResponsibility: splits.length > 1 ? 'SHARED' : 'INDIVIDUAL',
        notes: rule.notes,
        splits: splits.length > 1 ? { create: splits } : undefined,
      },
    })

    await db.financialRuleVersion.create({
      data: {
        ruleId: newRule.id,
        version: 1,
        snapshot: {
          name: newRule.name,
          migratedFromSharedAllocationRuleId: rule.id,
        },
        changedById: adminUser.id,
        changeNote: 'Migrated from SharedAllocationRule',
      },
    })

    sharedMigrated++
    console.log(`  [ok] SharedAllocationRule "${rule.label}" → FinancialRule "${newRule.id}"`)
  }

  console.log('')
  console.log(`Migration complete.`)
  console.log(`  AllocationRules migrated: ${allocationMigrated}`)
  console.log(`  SharedAllocationRules migrated: ${sharedMigrated}`)
  console.log('')
  console.log('Old rules remain intact. New rules are under /rules in the dashboard.')
}

function inferCategory(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('rent') || l.includes('landlord')) return 'RENT'
  if (l.includes('mortgage')) return 'MORTGAGE'
  if (l.includes('credit card') || l.includes('cc ')) return 'CREDIT_CARD'
  if (l.includes('emi') || l.includes('loan')) return 'EMI'
  if (l.includes('saving')) return 'SAVINGS'
  if (l.includes('invest')) return 'INVESTMENT'
  if (l.includes('grocery') || l.includes('groceries') || l.includes('food')) return 'GROCERY'
  if (l.includes('utility') || l.includes('utilities') || l.includes('electric') || l.includes('gas') || l.includes('water')) return 'UTILITIES'
  if (l.includes('insurance')) return 'INSURANCE'
  if (l.includes('india') || l.includes('indian') || l.includes('remit') || l.includes('transfer')) return 'INDIAN_ACCOUNT'
  if (l.includes('leisure') || l.includes('entertainment') || l.includes('dining')) return 'LEISURE'
  return 'CUSTOM'
}

function mapSharedCategory(cat: string): string {
  switch (cat) {
    case 'CREDIT_CARD_PAYMENT': return 'CREDIT_CARD'
    case 'EMI':                 return 'EMI'
    case 'RENT':                return 'RENT'
    case 'GROCERIES':           return 'GROCERY'
    case 'LEISURE':             return 'LEISURE'
    case 'INVESTMENT':          return 'INVESTMENT'
    case 'SAVINGS':             return 'SAVINGS'
    default:                    return 'CUSTOM'
  }
}

main()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1) })
  .finally(() => db.$disconnect())

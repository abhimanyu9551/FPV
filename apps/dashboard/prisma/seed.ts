// Seed: Creates base data for FPV
// Run: pnpm db:seed
// Note: UserProfile IDs must match Supabase auth.users UUIDs.
//       After creating users in Supabase Auth, update the IDs below.

import { PrismaClient, UserRole, AccountType, DebtType, DebtStrategy, DebtStatus, InvestmentType, CategoryType, RemittanceStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding FPV database...')

  // ── Currencies ─────────────────────────────────────────────
  await prisma.currency.upsert({
    where: { code: 'GBP' },
    update: {},
    create: { code: 'GBP', name: 'British Pound Sterling', symbol: '£', isBaseCurrency: true, decimalPlaces: 2 },
  })
  await prisma.currency.upsert({
    where: { code: 'INR' },
    update: {},
    create: { code: 'INR', name: 'Indian Rupee', symbol: '₹', isBaseCurrency: false, decimalPlaces: 2 },
  })

  console.log('✓ Currencies seeded')

  // ── Users ───────────────────────────────────────────────────
  // IMPORTANT: Replace these placeholder IDs with real Supabase auth.users UUIDs
  // after creating users in the Supabase Auth dashboard.
  const HUSBAND_ID = process.env.SEED_HUSBAND_USER_ID || 'REPLACE_WITH_SUPABASE_HUSBAND_UUID'
  const WIFE_ID    = process.env.SEED_WIFE_USER_ID    || 'REPLACE_WITH_SUPABASE_WIFE_UUID'

  const husband = await prisma.userProfile.upsert({
    where: { id: HUSBAND_ID },
    update: {},
    create: {
      id: HUSBAND_ID,
      email: process.env.SEED_HUSBAND_EMAIL || 'husband@family.local',
      fullName: 'Husband',
      role: UserRole.ADMIN,
    },
  })

  const wife = await prisma.userProfile.upsert({
    where: { id: WIFE_ID },
    update: {},
    create: {
      id: WIFE_ID,
      email: process.env.SEED_WIFE_EMAIL || 'wife@family.local',
      fullName: 'Wife',
      role: UserRole.MEMBER,
    },
  })

  console.log('✓ Users seeded:', husband.fullName, wife.fullName)

  // ── Exchange Rate (seed a starting manual rate) ────────────
  await prisma.exchangeRate.upsert({
    where: { fromCurrency_toCurrency_effectiveDate: {
      fromCurrency: 'GBP',
      toCurrency: 'INR',
      effectiveDate: new Date('2026-01-01'),
    }},
    update: {},
    create: {
      fromCurrency: 'GBP',
      toCurrency: 'INR',
      rate: 107.50,
      effectiveDate: new Date('2026-01-01'),
      source: 'MANUAL',
      notes: 'Initial seed rate',
      createdById: HUSBAND_ID,
    },
  })

  console.log('✓ Initial exchange rate seeded (GBP→INR: 107.50)')

  // ── System Budget Categories ────────────────────────────────
  const systemCategories = [
    { name: 'Salary', categoryType: CategoryType.INCOME, isSystem: true },
    { name: 'Bonus', categoryType: CategoryType.INCOME, isSystem: true },
    { name: 'Other Income', categoryType: CategoryType.INCOME, isSystem: true },
    { name: 'Groceries', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Rent', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Utilities', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Transport', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Dining Out', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Entertainment', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Healthcare', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Clothing', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Insurance', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'India Remittance', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Debt Payment', categoryType: CategoryType.DEBT_PAYMENT, isSystem: true },
    { name: 'Credit Card Payment', categoryType: CategoryType.DEBT_PAYMENT, isSystem: true },
    { name: 'Savings Deposit', categoryType: CategoryType.SAVINGS, isSystem: true },
    { name: 'Investment', categoryType: CategoryType.INVESTMENT, isSystem: true },
    { name: 'Internal Transfer', categoryType: CategoryType.TRANSFER, isSystem: true },
    { name: 'Leisure', categoryType: CategoryType.EXPENSE, isSystem: true },
    { name: 'Emergency Fund', categoryType: CategoryType.SAVINGS, isSystem: true },
  ]

  for (const cat of systemCategories) {
    await prisma.budgetCategory.upsert({
      where: { id: `system-${cat.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `system-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: cat.name,
        categoryType: cat.categoryType,
        isSystem: cat.isSystem,
      },
    })
  }

  console.log('✓ System budget categories seeded')

  // ── Remittance Categories ───────────────────────────────────
  const remittanceCategories = [
    { name: 'Dad Support',      priority: 1, description: 'Monthly support for parents' },
    { name: 'EMI',              priority: 2, description: 'India loan EMI payments' },
    { name: 'Chit Fund',        priority: 3, description: 'Monthly chit fund contribution' },
    { name: 'India Investment', priority: 4, description: 'India-side investments (FDs, etc.)' },
    { name: 'Family Expenses',  priority: 5, description: 'General family expenses in India' },
  ]

  for (const rc of remittanceCategories) {
    await prisma.remittanceCategory.upsert({
      where: { id: `rc-${rc.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `rc-${rc.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: rc.name,
        description: rc.description,
        priority: rc.priority,
      },
    })
  }

  console.log('✓ Remittance categories seeded')

  // ── Income Source (Husband Salary) ──────────────────────────
  await prisma.incomeSource.upsert({
    where: { id: 'income-source-husband-salary' },
    update: {},
    create: {
      id: 'income-source-husband-salary',
      userId: HUSBAND_ID,
      name: 'Husband Primary Salary',
      sourceType: 'SALARY',
      frequency: 'MONTHLY',
      currencyCode: 'GBP',
    },
  })

  await prisma.incomeSource.upsert({
    where: { id: 'income-source-wife-salary' },
    update: {},
    create: {
      id: 'income-source-wife-salary',
      userId: WIFE_ID,
      name: 'Wife Primary Salary',
      sourceType: 'SALARY',
      frequency: 'MONTHLY',
      currencyCode: 'GBP',
    },
  })

  console.log('✓ Income sources seeded')

  console.log('')
  console.log('✅ Seed complete!')
  console.log('')
  console.log('⚠️  NEXT STEPS:')
  console.log('  1. Create 2 users in Supabase Auth dashboard (email/password)')
  console.log('  2. Copy their UUIDs into .env as SEED_HUSBAND_USER_ID and SEED_WIFE_USER_ID')
  console.log('  3. Copy their emails into SEED_HUSBAND_EMAIL and SEED_WIFE_EMAIL')
  console.log('  4. Run `pnpm db:seed` again to update the user profiles')
  console.log('  5. Set up Allocation Rules via the Settings page in the dashboard')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })

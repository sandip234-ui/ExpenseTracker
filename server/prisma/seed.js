import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Default Data from FinTrack Baseline ─────────────────────────────────────

const DEFAULT_ACCOUNTS = [
  {
    id: 'account-cash',
    name: 'Cash',
    type: 'cash',
    openingBalance: 0,
    currency: 'INR',
    icon: '💵',
    color: '#10B981',
  },
  {
    id: 'account-sbi',
    name: 'Bank Account',
    type: 'bank',
    openingBalance: 0,
    currency: 'INR',
    icon: '🏦',
    color: '#3B82F6',
  },
  {
    id: 'account-upi',
    name: 'UPI / Wallet',
    type: 'upi',
    openingBalance: 0,
    currency: 'INR',
    icon: '📱',
    color: '#8B5CF6',
  },
]

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#f59e0b', type: 'expense' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense' },
  { id: 'bills', name: 'Bills', icon: '🧾', color: '#6366f1', type: 'expense' },
  { id: 'education', name: 'Education', icon: '📚', color: '#8b5cf6', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#f43f5e', type: 'expense' },
  { id: 'health', name: 'Health', icon: '💊', color: '#10b981', type: 'expense' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#0ea5e9', type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', icon: '📱', color: '#a855f7', type: 'expense' },
]

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary', icon: '💼', color: '#10b981', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#3b82f6', type: 'income' },
  { id: 'business', name: 'Business', icon: '🏢', color: '#f59e0b', type: 'income' },
  { id: 'investment', name: 'Investment', icon: '📈', color: '#6366f1', type: 'income' },
  { id: 'gift', name: 'Gift', icon: '🎁', color: '#ec4899', type: 'income' },
]

const DEFAULT_SYSTEM_CATEGORIES = [
  { id: 'other', name: 'Other', icon: '📦', color: '#78716c', type: 'both' },
  { id: 'savings', name: 'Savings Transfer', icon: '🎯', color: '#10b981', type: 'transfer' },
]

const DEFAULT_SETTINGS = [
  { key: 'currency', value: 'INR' },
  { key: 'currencySymbol', value: '₹' },
  { key: 'theme', value: 'light' },
]

async function main() {
  console.log('🌱 Starting FinTrack Database Seed...')

  // 1. Seed Accounts
  for (const account of DEFAULT_ACCOUNTS) {
    await prisma.account.upsert({
      where: { id: account.id },
      update: {
        name: account.name,
        type: account.type,
        currency: account.currency,
        icon: account.icon,
        color: account.color,
      },
      create: account,
    })
  }
  console.log(`✓ Seeded ${DEFAULT_ACCOUNTS.length} default accounts.`)

  // 2. Seed Categories
  const allCategories = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...DEFAULT_INCOME_CATEGORIES,
    ...DEFAULT_SYSTEM_CATEGORIES,
  ]
  for (const cat of allCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
      },
      create: {
        ...cat,
        isCustom: false,
      },
    })
  }
  console.log(`✓ Seeded ${allCategories.length} default categories.`)

  // 3. Seed Settings
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  console.log(`✓ Seeded ${DEFAULT_SETTINGS.length} default settings.`)

  console.log('✅ FinTrack Database Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

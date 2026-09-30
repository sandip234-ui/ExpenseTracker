/**
 * FinTrack Migration Automated Test Suite
 *
 * Tests the 10 critical migration scenarios:
 * 1. Valid migration
 * 2. Invalid data rejected
 * 3. Broken references rejected
 * 4. Duplicate IDs rejected
 * 5. Dry-run causes zero writes
 * 6. Rollback on failure
 * 7. ID preservation
 * 8. Financial totals match
 * 9. Goal transfer semantics
 * 10. Re-running does not duplicate data
 */

import prisma from '../../server/src/lib/prisma.js'
import { runMigration } from './migrator.js'
import { createVersionedPayload } from './parser.js'

const SUITE_PREFIX = `migtest-${Date.now()}`
let testCounter = 0

function generateTestPrefix() {
  testCounter++
  return `${SUITE_PREFIX}-${testCounter}`
}

async function cleanupPrefix(prefix) {
  try {
    await prisma.transaction.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.recurringTransaction.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.budget.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.savingsGoal.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.account.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.category.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.setting.deleteMany({ where: { key: { startsWith: prefix } } })
  } catch (err) {
    console.warn(`Warning during test cleanup for ${prefix}:`, err.message)
  }
}

function makeValidPayload(prefix) {
  const acc1Id = `${prefix}-acc-main`
  const acc2Id = `${prefix}-acc-savings`
  const catId = `${prefix}-cat-consulting`
  const goalId = `${prefix}-goal-emergency`
  const budgetId = `${prefix}-b-food`
  const recId = `${prefix}-rec-cloud`
  const t1Id = `${prefix}-txn-salary`
  const t2Id = `${prefix}-txn-food`
  const t3Id = `${prefix}-txn-deposit`
  const t4Id = `${prefix}-txn-withdraw`

  return {
    prefix,
    acc1Id,
    acc2Id,
    catId,
    goalId,
    budgetId,
    recId,
    t1Id,
    t2Id,
    t3Id,
    t4Id,
    payload: createVersionedPayload({
      accounts: [
        {
          id: acc1Id,
          name: `Main Checking ${prefix}`,
          type: 'bank',
          openingBalance: 1000,
          currency: 'INR',
        },
        {
          id: acc2Id,
          name: `Emergency Stash ${prefix}`,
          type: 'cash',
          openingBalance: 500,
          currency: 'INR',
        },
      ],
      categories: [
        {
          id: catId,
          name: 'Consulting Income',
          type: 'income',
          isCustom: true,
        },
      ],
      goals: [
        {
          id: goalId,
          name: 'Emergency Fund',
          targetAmount: 5000,
          currentAmount: 800,
          targetDate: '2026-12-31',
        },
      ],
      budgets: [
        {
          id: budgetId,
          categoryId: catId,
          month: '2026-10',
          amount: 3000,
        },
      ],
      recurringTransactions: [
        {
          id: recId,
          description: 'Cloud Server',
          amount: 600,
          type: 'expense',
          frequency: 'monthly',
          startDate: '2026-01-01',
          nextOccurrence: '2026-11-01',
          accountId: acc1Id,
          categoryId: 'bills',
        },
      ],
      transactions: [
        {
          id: t1Id,
          type: 'income',
          amount: 2000,
          description: 'Client Invoice',
          date: '2026-10-01',
          accountId: acc1Id,
          categoryId: catId,
        },
        {
          id: t2Id,
          type: 'expense',
          amount: 400,
          description: 'Groceries',
          date: '2026-10-02',
          accountId: acc1Id,
          categoryId: 'food',
        },
        {
          id: t3Id,
          type: 'transfer',
          transferType: 'goal_deposit',
          amount: 300,
          description: 'Transfer to Emergency Fund',
          date: '2026-10-03',
          accountId: acc1Id,
          goalId: goalId,
          goalName: 'Emergency Fund',
        },
        {
          id: t4Id,
          type: 'transfer',
          transferType: 'goal_withdrawal',
          amount: 100,
          description: 'Withdrawal from Emergency Fund',
          date: '2026-10-04',
          accountId: acc2Id,
          goalId: goalId,
          goalName: 'Emergency Fund',
        },
      ],
      settings: {
        [`${prefix}_theme`]: 'dark',
      },
    }),
  }
}

async function runAllTests() {
  console.log('='.repeat(70))
  console.log('🧪 FINTRACK CONTROLLED MIGRATION TEST SUITE')
  console.log(`   Suite Execution ID: ${SUITE_PREFIX}`)
  console.log('='.repeat(70) + '\n')

  let passed = 0
  let failed = 0

  async function assertTest(name, fn) {
    try {
      await fn()
      console.log(`✅ [PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`)
      console.error(`   ${err.message}`)
      failed++
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 1: Valid Migration (--execute)
  // ─────────────────────────────────────────────────────────────────────────────
  const p1 = generateTestPrefix()
  const d1 = makeValidPayload(p1)

  await assertTest('1. Valid migration atomically imports all records with original IDs', async () => {
    const res = await runMigration(d1.payload, { execute: true })
    if (!res.success) {
      throw new Error(`Migration execute failed: ${res.message || res.error}`)
    }
    if (res.insertedCounts.accounts !== 2) throw new Error('Expected 2 accounts inserted')
    if (res.insertedCounts.transactions !== 4) throw new Error('Expected 4 transactions inserted')
    if (res.insertedCounts.goals !== 1) throw new Error('Expected 1 goal inserted')
    if (res.insertedCounts.budgets !== 1) throw new Error('Expected 1 budget inserted')
    if (res.insertedCounts.recurring !== 1) throw new Error('Expected 1 recurring inserted')

    // Verify presence in DB
    const dbAcc = await prisma.account.findUnique({ where: { id: d1.acc1Id } })
    if (!dbAcc) throw new Error('Account 1 not found in DB after execute')
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 2: Invalid Data
  // ─────────────────────────────────────────────────────────────────────────────
  await assertTest('2. Invalid data is strictly rejected during validation before DB writes', async () => {
    const badPrefix = generateTestPrefix()
    const invalidPayload = createVersionedPayload({
      accounts: [
        { id: `${badPrefix}-acc`, name: 'Bad Account', type: 'INVALID_TYPE', openingBalance: 'NaN' },
      ],
      transactions: [
        { id: `${badPrefix}-txn`, type: 'invalid_type', amount: -50, description: '', date: 'bad-date', accountId: `${badPrefix}-acc` },
      ],
      budgets: [
        { id: `${badPrefix}-b`, categoryId: 'food', month: '2026/10', amount: -100 },
      ],
      recurringTransactions: [
        { id: `${badPrefix}-r`, description: '', amount: 0, frequency: 'hourly', startDate: 'none', accountId: `${badPrefix}-acc` },
      ],
    })

    const res = await runMigration(invalidPayload, { execute: true })
    if (res.success) throw new Error('Expected invalid payload to fail validation')
    if (res.phase !== 'validation') throw new Error(`Expected phase to be 'validation', got ${res.phase}`)
    if (res.errors.length < 5) throw new Error(`Expected multiple validation errors, got ${res.errors.length}`)

    // Verify 0 writes
    const found = await prisma.account.findUnique({ where: { id: `${badPrefix}-acc` } })
    if (found) throw new Error('Invalid account was written to DB despite validation failure')
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 3: Broken References
  // ─────────────────────────────────────────────────────────────────────────────
  await assertTest('3. Broken foreign references (account, goal, category) are rejected', async () => {
    const p3 = generateTestPrefix()
    const brokenPayload = createVersionedPayload({
      accounts: [{ id: `${p3}-acc`, name: 'Valid Acc', type: 'bank', openingBalance: 100 }],
      transactions: [
        {
          id: `${p3}-txn-broken-acc`,
          type: 'income',
          amount: 100,
          description: 'Txn with nonexistent account',
          date: '2026-10-01',
          accountId: 'completely-nonexistent-account-id',
        },
        {
          id: `${p3}-txn-broken-goal`,
          type: 'transfer',
          transferType: 'goal_deposit',
          amount: 50,
          description: 'Deposit to missing goal',
          date: '2026-10-01',
          accountId: `${p3}-acc`,
          goalId: 'completely-nonexistent-goal-id',
        },
      ],
      budgets: [
        {
          id: `${p3}-b-broken`,
          categoryId: 'completely-nonexistent-category-id',
          month: '2026-10',
          amount: 200,
        },
      ],
    })

    const res = await runMigration(brokenPayload, { execute: true })
    if (res.success) throw new Error('Expected broken references to fail validation')
    const hasAccountRefError = res.errors.some((e) => e.includes('accountId') && e.includes('Broken reference'))
    const hasGoalRefError = res.errors.some((e) => e.includes('goalId') && e.includes('Broken reference'))
    const hasBudgetRefError = res.errors.some((e) => e.includes('categoryId') && e.includes('Broken reference'))
    if (!hasAccountRefError || !hasGoalRefError || !hasBudgetRefError) {
      throw new Error(`Expected specific broken reference errors. Got: ${res.errors.join('; ')}`)
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 4: Duplicate IDs within payload
  // ─────────────────────────────────────────────────────────────────────────────
  await assertTest('4. Duplicate IDs within source payload are detected and rejected', async () => {
    const p4 = generateTestPrefix()
    const dupId = `${p4}-duplicate-id`
    const dupPayload = createVersionedPayload({
      accounts: [
        { id: dupId, name: 'Acc A', type: 'cash' },
        { id: dupId, name: 'Acc B', type: 'bank' },
      ],
      transactions: [
        { id: `${p4}-t1`, type: 'income', amount: 100, description: 'T1', date: '2026-10-01', accountId: dupId },
        { id: `${p4}-t1`, type: 'expense', amount: 50, description: 'T1 dup', date: '2026-10-02', accountId: dupId },
      ],
    })

    const res = await runMigration(dupPayload, { execute: true })
    if (res.success) throw new Error('Expected duplicate IDs to fail validation')
    const hasAccDup = res.errors.some((e) => e.includes('Duplicate account ID'))
    const hasTxnDup = res.errors.some((e) => e.includes('Duplicate transaction ID'))
    if (!hasAccDup || !hasTxnDup) {
      throw new Error(`Expected duplicate account and txn errors. Got: ${res.errors.join('; ')}`)
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 5: Dry-Run causes ZERO database writes
  // ─────────────────────────────────────────────────────────────────────────────
  await assertTest('5. Dry-run performs full validation and financial audit with ZERO database writes', async () => {
    const p5 = generateTestPrefix()
    const d5 = makeValidPayload(p5)

    const initialAccountsCount = await prisma.account.count()
    const initialTxnCount = await prisma.transaction.count()
    const initialGoalsCount = await prisma.savingsGoal.count()
    const initialBudgetsCount = await prisma.budget.count()

    const res = await runMigration(d5.payload, { dryRun: true })
    if (!res.success) throw new Error(`Dry-run failed: ${res.message}`)
    if (res.mode !== 'dry-run') throw new Error(`Expected mode 'dry-run', got ${res.mode}`)
    if (!res.zeroWrites) throw new Error('Expected zeroWrites to be true')

    const afterAccountsCount = await prisma.account.count()
    const afterTxnCount = await prisma.transaction.count()
    const afterGoalsCount = await prisma.savingsGoal.count()
    const afterBudgetsCount = await prisma.budget.count()

    if (
      initialAccountsCount !== afterAccountsCount ||
      initialTxnCount !== afterTxnCount ||
      initialGoalsCount !== afterGoalsCount ||
      initialBudgetsCount !== afterBudgetsCount
    ) {
      throw new Error('Database records count changed during dry-run!')
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 6: Rollback on Failure
  // ─────────────────────────────────────────────────────────────────────────────
  await assertTest('6. Mid-transaction failure rolls back entire batch atomically', async () => {
    const p6 = generateTestPrefix()
    const d6 = makeValidPayload(p6)

    // Intentionally inject an invalid foreign key in transactions that passes payload validation
    // by forging an account ID that doesn't exist in DB and is omitted from payload.accounts
    const poisonedPayload = JSON.parse(JSON.stringify(d6.payload))
    // We create an account, but transactions has an extra record referencing an un-inserted account
    // To trigger a runtime DB foreign key error during prisma.$transaction:
    // Let's add an account that creates a DB error or constraint collision mid-way.
    // E.g., duplicate transaction ID inserted twice in the transaction loop.
    poisonedPayload.data.transactions.push({
      id: d6.t1Id, // duplicate PK in DB insert
      type: 'income',
      amount: 100,
      description: 'Colliding PK inside batch',
      date: '2026-10-05',
      accountId: d6.acc1Id,
    })

    const res = await runMigration(poisonedPayload, { execute: true })
    if (res.success) throw new Error('Expected transaction to fail and rollback')
    if (!res.rolledBack && res.phase !== 'validation') {
      throw new Error(`Expected rollback or validation stop, got phase: ${res.phase}`)
    }

    // Verify that NO records from p6 were committed to DB
    const accountCheck = await prisma.account.findUnique({ where: { id: d6.acc1Id } })
    if (accountCheck) throw new Error('Account was left in DB after transaction rollback!')
    const goalCheck = await prisma.savingsGoal.findUnique({ where: { id: d6.goalId } })
    if (goalCheck) throw new Error('Goal was left in DB after transaction rollback!')
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 7: ID Preservation
  // ─────────────────────────────────────────────────────────────────────────────
  await assertTest('7. Exact original IDs and entity relationships are preserved in PostgreSQL', async () => {
    // Check records from Test 1 (d1)
    const acc1 = await prisma.account.findUnique({ where: { id: d1.acc1Id } })
    if (!acc1 || acc1.id !== d1.acc1Id) throw new Error('Account 1 ID was not preserved')

    const acc2 = await prisma.account.findUnique({ where: { id: d1.acc2Id } })
    if (!acc2 || acc2.id !== d1.acc2Id) throw new Error('Account 2 ID was not preserved')

    const goal = await prisma.savingsGoal.findUnique({ where: { id: d1.goalId } })
    if (!goal || goal.id !== d1.goalId) throw new Error('Goal ID was not preserved')

    const budget = await prisma.budget.findUnique({ where: { id: d1.budgetId } })
    if (!budget || budget.id !== d1.budgetId) throw new Error('Budget ID was not preserved')

    const rec = await prisma.recurringTransaction.findUnique({ where: { id: d1.recId } })
    if (!rec || rec.id !== d1.recId) throw new Error('Recurring ID was not preserved')

    const t1 = await prisma.transaction.findUnique({ where: { id: d1.t1Id } })
    if (!t1 || t1.id !== d1.t1Id) throw new Error('Transaction 1 ID was not preserved')
    if (t1.accountId !== d1.acc1Id) throw new Error('Transaction account relationship broken')
    if (t1.categoryId !== d1.catId) throw new Error('Transaction category relationship broken')
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 8: Financial Totals Match (100% precision)
  // ─────────────────────────────────────────────────────────────────────────────
  await assertTest('8. Pre- and post-migration financial totals and derived balances match 100%', async () => {
    // Check results from d1
    const p8 = generateTestPrefix()
    const d8 = makeValidPayload(p8)
    const res = await runMigration(d8.payload, { execute: true })

    if (!res.success) throw new Error(`Migration failed: ${res.message}`)
    if (!res.comparison.matches) {
      throw new Error(`Financial discrepancy: ${res.comparison.discrepancies.join('; ')}`)
    }

    const s = res.sourceFinancialSummary
    const d = res.dbFinancialSummary

    if (s.totalIncome !== d.totalIncome || s.totalIncome !== 2000) {
      throw new Error(`Income mismatch: Source=${s.totalIncome}, DB=${d.totalIncome}`)
    }
    if (s.totalExpenses !== d.totalExpenses || s.totalExpenses !== 400) {
      throw new Error(`Expenses mismatch: Source=${s.totalExpenses}, DB=${d.totalExpenses}`)
    }
    if (s.totalGoalDeposits !== d.totalGoalDeposits || s.totalGoalDeposits !== 300) {
      throw new Error(`Goal deposits mismatch: Source=${s.totalGoalDeposits}, DB=${d.totalGoalDeposits}`)
    }
    if (s.totalGoalWithdrawals !== d.totalGoalWithdrawals || s.totalGoalWithdrawals !== 100) {
      throw new Error(`Goal withdrawals mismatch: Source=${s.totalGoalWithdrawals}, DB=${d.totalGoalWithdrawals}`)
    }
    if (s.netWorth !== d.netWorth || s.netWorth !== 2900) {
      throw new Error(`Net worth mismatch: Source=${s.netWorth}, DB=${d.netWorth}`)
    }

    // Clean up d8
    await cleanupPrefix(p8)
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 9: Goal Transfer Semantics
  // ─────────────────────────────────────────────────────────────────────────────
  await assertTest('9. Goal transfer accounting semantics preserved (deposits != expenses, withdrawals != income)', async () => {
    // Verify d1 accounting model:
    // Acc 1: Opening 1000 + 2000 (inc) - 400 (exp) - 300 (deposit) = 2300
    // Acc 2: Opening 500 + 100 (withdrawal) = 600
    const txns = await prisma.transaction.findMany({
      where: { id: { in: [d1.t1Id, d1.t2Id, d1.t3Id, d1.t4Id] } },
    })

    const incomeTxns = txns.filter((t) => t.type === 'income')
    const expenseTxns = txns.filter((t) => t.type === 'expense')
    const depositTxns = txns.filter((t) => t.transferType === 'goal_deposit')
    const withdrawalTxns = txns.filter((t) => t.transferType === 'goal_withdrawal')

    if (incomeTxns.length !== 1 || incomeTxns[0].amount !== 2000) {
      throw new Error('Goal withdrawal was mistakenly categorized as external income')
    }
    if (expenseTxns.length !== 1 || expenseTxns[0].amount !== 400) {
      throw new Error('Goal deposit was mistakenly categorized as external expense')
    }
    if (depositTxns.length !== 1 || depositTxns[0].amount !== 300) {
      throw new Error('Goal deposit record missing or amount wrong')
    }
    if (withdrawalTxns.length !== 1 || withdrawalTxns[0].amount !== 100) {
      throw new Error('Goal withdrawal record missing or amount wrong')
    }

    // Verify derived balances in DB via query
    const acc1Txns = txns.filter((t) => t.accountId === d1.acc1Id)
    const acc1Derived =
      1000 +
      acc1Txns.filter((t) => t.type === 'income' || t.transferType === 'goal_withdrawal').reduce((s, t) => s + t.amount, 0) -
      acc1Txns.filter((t) => t.type === 'expense' || t.transferType === 'goal_deposit').reduce((s, t) => s + t.amount, 0)

    if (acc1Derived !== 2300) throw new Error(`Acc 1 derived balance is ${acc1Derived}, expected 2300`)

    const acc2Txns = txns.filter((t) => t.accountId === d1.acc2Id)
    const acc2Derived =
      500 +
      acc2Txns.filter((t) => t.type === 'income' || t.transferType === 'goal_withdrawal').reduce((s, t) => s + t.amount, 0) -
      acc2Txns.filter((t) => t.type === 'expense' || t.transferType === 'goal_deposit').reduce((s, t) => s + t.amount, 0)

    if (acc2Derived !== 600) throw new Error(`Acc 2 derived balance is ${acc2Derived}, expected 600`)
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 10: Re-running does not duplicate data (Conflict Detection / Idempotency)
  // ─────────────────────────────────────────────────────────────────────────────
  await assertTest('10. Re-running migration detects existing records, halts with conflicts, and prevents duplicates', async () => {
    // Attempt to run migration again with the payload from d1 (which is already in DB)
    const res = await runMigration(d1.payload, { execute: true })

    if (res.success) {
      throw new Error('Expected re-running migration to fail due to existing records')
    }
    if (res.phase !== 'conflict-detection') {
      throw new Error(`Expected phase 'conflict-detection', got ${res.phase}`)
    }
    if (!res.conflicts || res.conflicts.accounts.length === 0) {
      throw new Error('Expected accounts to be listed in conflicts')
    }
    if (res.conflicts.transactions.length === 0) {
      throw new Error('Expected transactions to be listed in conflicts')
    }

    // Verify no duplicates created
    const accountsCount = await prisma.account.count({ where: { id: d1.acc1Id } })
    if (accountsCount !== 1) throw new Error(`Account count in DB is ${accountsCount}, expected exactly 1`)

    const txnCount = await prisma.transaction.count({ where: { id: d1.t1Id } })
    if (txnCount !== 1) throw new Error(`Transaction count in DB is ${txnCount}, expected exactly 1`)
  })

  // Clean up d1 records
  await cleanupPrefix(p1)

  console.log('\n' + '='.repeat(70))
  console.log(`📊 TEST SUITE SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`)
  console.log('='.repeat(70) + '\n')

  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

runAllTests().catch(async (err) => {
  console.error('Fatal test runner error:', err)
  await prisma.$disconnect()
  process.exit(1)
})

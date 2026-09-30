import assert from 'node:assert'
import prisma from './src/lib/prisma.js'

console.log('--- Testing PostgreSQL + Prisma Database Connectivity & CRUD ---')

async function runDatabaseTests() {
  try {
    // 1. Connection check
    console.log('1. Checking PostgreSQL connectivity...')
    await prisma.$connect()
    console.log('   ✓ Connected to PostgreSQL via Prisma Client.')

    // 2. Schema check: Query seeded defaults
    console.log('2. Querying seeded records...')
    const accounts = await prisma.account.findMany({ orderBy: { id: 'asc' } })
    assert.ok(accounts.length >= 3, 'Should have at least 3 seeded accounts')
    console.log(`   ✓ Found ${accounts.length} accounts:`, accounts.map((a) => a.id).join(', '))

    const categories = await prisma.category.findMany()
    assert.ok(categories.length >= 16, 'Should have at least 16 seeded categories')
    console.log(`   ✓ Found ${categories.length} categories.`)

    const settings = await prisma.setting.findMany()
    assert.ok(settings.length >= 3, 'Should have at least 3 seeded settings')
    console.log('   ✓ Found settings:', settings.map((s) => `${s.key}=${s.value}`).join(', '))

    // 3. CRUD & Ledger Source of Truth verification
    console.log('3. Testing CRUD & Ledger Source of Truth operations...')
    const testAccountId = `test-acc-${Date.now()}`
    const testAccountName = `Automated Test Bank ${Date.now()}`
    const testAccount = await prisma.account.create({
      data: {
        id: testAccountId,
        name: testAccountName,
        normalizedName: testAccountName.toLowerCase(),
        type: 'bank',
        openingBalance: 10000,
        currency: 'INR',
      },
    })
    assert.strictEqual(testAccount.id, testAccountId)
    assert.strictEqual(testAccount.openingBalance, 10000)
    console.log('   ✓ Created test account with opening balance ₹10,000')

    // Create an income transaction
    const txnIncome = await prisma.transaction.create({
      data: {
        id: `test-txn-inc-${Date.now()}`,
        accountId: testAccountId,
        type: 'income',
        amount: 5000,
        categoryId: 'salary',
        description: 'Test Salary Credit',
        date: new Date('2026-09-01'),
        paymentMethod: 'Net Banking',
      },
      include: {
        account: true,
        category: true,
      },
    })
    assert.strictEqual(txnIncome.amount, 5000)
    assert.strictEqual(txnIncome.category?.name, 'Salary')
    console.log('   ✓ Created income transaction linked to account & category')

    // Create an expense transaction
    const txnExpense = await prisma.transaction.create({
      data: {
        id: `test-txn-exp-${Date.now()}`,
        accountId: testAccountId,
        type: 'expense',
        amount: 2000,
        categoryId: 'food',
        description: 'Test Grocery Expense',
        date: new Date('2026-09-02'),
        paymentMethod: 'Debit Card',
      },
    })
    assert.strictEqual(txnExpense.amount, 2000)
    console.log('   ✓ Created expense transaction')

    // Verify dynamic balance derivation (Opening: 10000 + Income: 5000 - Expense: 2000 = 13000)
    const txns = await prisma.transaction.findMany({ where: { accountId: testAccountId } })
    const incomeTotal = txns
      .filter((t) => t.type === 'income' || t.transferType === 'goal_withdrawal')
      .reduce((sum, t) => sum + t.amount, 0)
    const expenseTotal = txns
      .filter((t) => t.type === 'expense' || t.transferType === 'goal_deposit')
      .reduce((sum, t) => sum + t.amount, 0)
    const derivedBalance = testAccount.openingBalance + incomeTotal - expenseTotal

    assert.strictEqual(derivedBalance, 13000, 'Derived balance should be ₹13,000')
    console.log(`   ✓ Derived account balance verified: ₹${derivedBalance.toLocaleString('en-IN')}`)

    // Test Savings Goal & Transfer linking
    console.log('4. Testing Savings Goal & Transfer relations...')
    const testGoalId = `test-goal-${Date.now()}`
    const testGoal = await prisma.savingsGoal.create({
      data: {
        id: testGoalId,
        name: 'Test Emergency Fund',
        targetAmount: 50000,
        currentAmount: 0,
      },
    })
    assert.strictEqual(testGoal.id, testGoalId)

    const goalDepositTxn = await prisma.transaction.create({
      data: {
        id: `test-txn-deposit-${Date.now()}`,
        accountId: testAccountId,
        type: 'transfer',
        transferType: 'goal_deposit',
        amount: 3000,
        goalId: testGoalId,
        goalName: testGoal.name,
        categoryId: 'savings',
        description: 'Transfer to Emergency Fund',
        date: new Date('2026-09-03'),
      },
    })
    assert.strictEqual(goalDepositTxn.goalId, testGoalId)
    console.log('   ✓ Created goal transfer transaction linked to SavingsGoal')

    // Clean up test records
    console.log('5. Cleaning up test records...')
    await prisma.transaction.deleteMany({
      where: {
        id: { in: [txnIncome.id, txnExpense.id, goalDepositTxn.id] },
      },
    })
    await prisma.savingsGoal.delete({ where: { id: testGoalId } })
    await prisma.account.delete({ where: { id: testAccountId } })
    console.log('   ✓ Test records cleaned up successfully.')

    console.log('\n🎉 ALL DATABASE CONNECTIVITY & CRUD TESTS PASSED SUCCESSFULLY!')
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  } finally {
    console.log('6. Disconnecting Prisma Client...')
    await prisma.$disconnect()
    console.log('   ✓ Disconnected cleanly.')
  }
}

runDatabaseTests()

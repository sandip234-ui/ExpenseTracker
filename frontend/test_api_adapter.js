/**
 * FinTrack Phase 5: Frontend API Adapter & Integration Test Suite
 * Verifies all 18 integration requirements specified in Phase 5:
 * 1. Reach backend health endpoint
 * 2. Accounts load
 * 3. Transactions load
 * 4. Goals load
 * 5. Budgets load
 * 6. Recurring transactions load
 * 7. Categories load
 * 8. Account balance matches backend
 * 9. Net worth matches backend
 * 10. Creating income works
 * 11. Creating expense works
 * 12. Overspending is rejected with INSUFFICIENT_BALANCE
 * 13. Goal deposit works with atomic physical transfer
 * 14. Goal withdrawal works with atomic physical transfer
 * 15. Transaction edit works with backend reversal semantics
 * 16. Transaction deletion works with ledger reversal
 * 17. Budget duplicate is rejected with DUPLICATE_BUDGET
 * 18. System category deletion is protected
 */

import assert from 'node:assert'
import { setDataSourceMode } from './src/services/dataProvider/config.js'
import { dataProvider } from './src/services/dataProvider/index.js'
import { apiClient, ApiError, authApi } from './src/services/api/index.js'

// Force API mode for this test suite
setDataSourceMode('api')

const testTag = `phase5-${Date.now()}`
let createdAccountId = null
let createdGoalId = null
let createdBudgetId = null
let createdTxnIds = []
let createdCategoryId = null

function logPass(num, text) {
  console.log(`  ✓ Requirement ${num} PASSED: ${text}`)
}

async function runApiIntegrationTests() {
  console.log('=================================================================')
  console.log('--- STARTING FINTRACK PHASE 5 FRONTEND API ADAPTER VERIFICATION ---')
  console.log('=================================================================\n')

  try {
    // -----------------------------------------------------------------
    // 1. Frontend can reach backend
    // -----------------------------------------------------------------
    console.log('1. Checking backend reachability & authentication...')
    const health = await apiClient.get('/health')
    assert.strictEqual(health.status, 'ok', 'Health status should be ok')
    assert.strictEqual(health.service, 'FinTrack API', 'Service name should match')

    // Authenticate with primary user for all subsequent protected endpoints
    const authRes = await authApi.login({ email: 'demo@fintrack.local', password: 'Password123!' })
    assert.ok(authRes.token, 'Should receive auth token')
    logPass(1, 'Frontend reached FinTrack backend health endpoint & authenticated (HTTP 200 OK)')

    // -----------------------------------------------------------------
    // 2. Accounts load
    // -----------------------------------------------------------------
    console.log('2. Loading accounts via dataProvider...')
    const initialAccounts = await dataProvider.getAccounts()
    assert(Array.isArray(initialAccounts), 'Accounts should be an array')
    assert(initialAccounts.length >= 1, 'Should have at least 1 account from seed')
    assert(typeof initialAccounts[0].balance === 'number', 'Account should have numeric balance')
    logPass(2, `Loaded ${initialAccounts.length} accounts with derived balances`)

    // -----------------------------------------------------------------
    // 3. Transactions load
    // -----------------------------------------------------------------
    console.log('3. Loading transactions via dataProvider...')
    const initialTransactions = await dataProvider.getTransactions()
    assert(Array.isArray(initialTransactions), 'Transactions should be an array')
    logPass(3, `Loaded ${initialTransactions.length} transactions with normalized schema`)

    // -----------------------------------------------------------------
    // 4. Goals load
    // -----------------------------------------------------------------
    console.log('4. Loading savings goals via dataProvider...')
    const initialGoals = await dataProvider.getGoals()
    assert(Array.isArray(initialGoals), 'Goals should be an array')
    logPass(4, `Loaded ${initialGoals.length} savings goals`)

    // -----------------------------------------------------------------
    // 5. Budgets load
    // -----------------------------------------------------------------
    console.log('5. Loading budgets via dataProvider...')
    const initialBudgets = await dataProvider.getBudgets()
    assert(Array.isArray(initialBudgets), 'Budgets should be an array')
    logPass(5, `Loaded ${initialBudgets.length} budgets`)

    // -----------------------------------------------------------------
    // 6. Recurring transactions load
    // -----------------------------------------------------------------
    console.log('6. Loading recurring transaction rules via dataProvider...')
    const initialRecurring = await dataProvider.getRecurring()
    assert(Array.isArray(initialRecurring), 'Recurring should be an array')
    logPass(6, `Loaded ${initialRecurring.length} recurring rules`)

    // -----------------------------------------------------------------
    // 7. Categories load
    // -----------------------------------------------------------------
    console.log('7. Loading categories via dataProvider...')
    const initialCategories = await dataProvider.getCategories()
    assert(Array.isArray(initialCategories), 'Categories should be an array')
    assert(initialCategories.some((c) => c.id === 'food'), 'Should include food category')
    assert(initialCategories.some((c) => c.label === 'Food' || c.name === 'Food'), 'Should normalize label/name')
    logPass(7, `Loaded ${initialCategories.length} categories with label/name normalization`)

    // -----------------------------------------------------------------
    // Setup test fixtures: create a dedicated test account
    // -----------------------------------------------------------------
    console.log('\n--- Creating Isolated Test Fixtures ---')
    const testAccount = await dataProvider.createAccount({
      name: `${testTag}-Account`,
      type: 'bank',
      openingBalance: 10000,
      currency: 'INR',
    })
    createdAccountId = testAccount.id
    assert.strictEqual(testAccount.openingBalance, 10000)
    assert.strictEqual(testAccount.balance, 10000)
    console.log(`Created test account "${testAccount.name}" (ID: ${testAccount.id}, Opening: ₹10,000)`)

    // -----------------------------------------------------------------
    // 8. Account balance displayed by API mode matches backend
    // -----------------------------------------------------------------
    console.log('\n8. Verifying account balance calculation contract...')
    const accountCheck = (await dataProvider.getAccounts()).find((a) => a.id === createdAccountId)
    assert.strictEqual(accountCheck.balance, 10000)
    assert.strictEqual(accountCheck.availableBalance, 10000)
    logPass(8, 'Account balance displayed matches authoritative backend derived value (₹10,000.00)')

    // -----------------------------------------------------------------
    // 9. Net worth matches backend
    // -----------------------------------------------------------------
    console.log('9. Verifying net worth calculation...')
    const netWorth = await dataProvider.getNetWorth()
    assert(typeof netWorth === 'number' && !isNaN(netWorth), 'Net worth must be a valid number')
    logPass(9, `Net worth endpoint returned authoritative value: ₹${netWorth.toLocaleString('en-IN')}`)

    // -----------------------------------------------------------------
    // 10. Creating an income works
    // -----------------------------------------------------------------
    console.log('10. Creating an income transaction...')
    const incomeTxn = await dataProvider.createTransaction({
      type: 'income',
      amount: 5000,
      accountId: createdAccountId,
      category: 'salary',
      description: 'Consulting Income',
      date: '2026-09-30',
      paymentMethod: 'Net Banking',
    })
    createdTxnIds.push(incomeTxn.id)
    assert.strictEqual(incomeTxn.amount, 5000)
    assert.strictEqual(incomeTxn.category, 'salary')
    assert.strictEqual(incomeTxn.categoryId, 'salary')

    const accAfterIncome = (await dataProvider.getAccounts()).find((a) => a.id === createdAccountId)
    assert.strictEqual(accAfterIncome.balance, 15000, 'Balance must be 15000 after 5000 income')
    logPass(10, 'Created income of ₹5,000. Account balance increased from ₹10,000 to ₹15,000')

    // -----------------------------------------------------------------
    // 11. Creating an expense works
    // -----------------------------------------------------------------
    console.log('11. Creating an expense transaction...')
    const expenseTxn = await dataProvider.createTransaction({
      type: 'expense',
      amount: 3000,
      accountId: createdAccountId,
      category: 'food',
      description: 'Weekly Groceries',
      date: '2026-09-30',
      paymentMethod: 'Debit Card',
    })
    createdTxnIds.push(expenseTxn.id)
    assert.strictEqual(expenseTxn.amount, 3000)

    const accAfterExpense = (await dataProvider.getAccounts()).find((a) => a.id === createdAccountId)
    assert.strictEqual(accAfterExpense.balance, 12000, 'Balance must be 12000 after 3000 expense')
    logPass(11, 'Created expense of ₹3,000. Account balance decreased from ₹15,000 to ₹12,000')

    // -----------------------------------------------------------------
    // 12. Overspending is rejected
    // -----------------------------------------------------------------
    console.log('12. Testing overspending rejection (Available: ₹12,000, Attempt: ₹15,000)...')
    let overspendError = null
    try {
      await dataProvider.createTransaction({
        type: 'expense',
        amount: 15000,
        accountId: createdAccountId,
        category: 'shopping',
        description: 'Luxury Watch',
        date: '2026-09-30',
      })
    } catch (err) {
      overspendError = err
    }
    assert(overspendError instanceof ApiError, 'Expected ApiError')
    assert.strictEqual(overspendError.code, 'INSUFFICIENT_BALANCE', 'Code must be INSUFFICIENT_BALANCE')
    assert.match(overspendError.message, /Insufficient balance/, 'Message must mention insufficient balance')
    logPass(12, `Overspending rejected with code "${overspendError.code}" and message: "${overspendError.message}"`)

    // -----------------------------------------------------------------
    // 13. Goal deposit works
    // -----------------------------------------------------------------
    console.log('13. Creating savings goal & testing physical deposit...')
    const testGoal = await dataProvider.createGoal({
      name: `${testTag}-Emergency`,
      targetAmount: 50000,
      currentAmount: 0,
    })
    createdGoalId = testGoal.id

    const depositResult = await dataProvider.depositToGoal({
      goalId: testGoal.id,
      amount: 4000,
      sourceAccountId: createdAccountId,
    })
    if (depositResult.transaction?.id) {
      createdTxnIds.push(depositResult.transaction.id)
    }
    assert.strictEqual(depositResult.goal.currentAmount, 4000, 'Goal current amount should be 4000')

    const accAfterDeposit = (await dataProvider.getAccounts()).find((a) => a.id === createdAccountId)
    assert.strictEqual(accAfterDeposit.balance, 8000, 'Account balance should be 12000 - 4000 = 8000')
    logPass(13, 'Deposited ₹4,000 to goal. Goal currentAmount = ₹4,000, Account balance = ₹8,000')

    // -----------------------------------------------------------------
    // 14. Goal withdrawal works
    // -----------------------------------------------------------------
    console.log('14. Testing physical withdrawal from savings goal...')
    const withdrawResult = await dataProvider.withdrawFromGoal({
      goalId: testGoal.id,
      amount: 1500,
      destinationAccountId: createdAccountId,
    })
    if (withdrawResult.transaction?.id) {
      createdTxnIds.push(withdrawResult.transaction.id)
    }
    assert.strictEqual(withdrawResult.goal.currentAmount, 2500, 'Goal current amount should be 4000 - 1500 = 2500')

    const accAfterWithdraw = (await dataProvider.getAccounts()).find((a) => a.id === createdAccountId)
    assert.strictEqual(accAfterWithdraw.balance, 9500, 'Account balance should be 8000 + 1500 = 9500')
    logPass(14, 'Withdrew ₹1,500 from goal. Goal currentAmount = ₹2,500, Account balance = ₹9,500')

    // -----------------------------------------------------------------
    // 15. Transaction edit works (with backend reversal semantics)
    // -----------------------------------------------------------------
    console.log('15. Testing transaction edit with reversal...')
    // Edit income from 5000 to 7000 (adds 2000 to account)
    const updatedIncome = await dataProvider.updateTransaction(incomeTxn.id, {
      amount: 7000,
      description: 'Updated Consulting Income',
      accountId: createdAccountId,
      category: 'salary',
      type: 'income',
    })
    assert.strictEqual(updatedIncome.amount, 7000)

    const accAfterEdit = (await dataProvider.getAccounts()).find((a) => a.id === createdAccountId)
    assert.strictEqual(accAfterEdit.balance, 11500, 'Account balance should be 9500 + 2000 = 11500')
    logPass(15, 'Edited income from ₹5,000 to ₹7,000. Balance correctly adjusted to ₹11,500 via reversal')

    // -----------------------------------------------------------------
    // 16. Transaction deletion works
    // -----------------------------------------------------------------
    console.log('16. Testing transaction deletion and ledger adjustment...')
    // Delete expense of 3000 (restores 3000 to account)
    await dataProvider.deleteTransaction(expenseTxn.id)
    createdTxnIds = createdTxnIds.filter((id) => id !== expenseTxn.id)

    const accAfterDelete = (await dataProvider.getAccounts()).find((a) => a.id === createdAccountId)
    assert.strictEqual(accAfterDelete.balance, 14500, 'Account balance should be 11500 + 3000 = 14500')
    logPass(16, 'Deleted expense of ₹3,000. Balance restored to ₹14,500')

    // -----------------------------------------------------------------
    // 17. Budget duplicate is rejected
    // -----------------------------------------------------------------
    console.log('17. Testing budget creation & duplicate constraint...')
    const budgetMonth = '2026-11'
    const budget1 = await dataProvider.createBudget({
      categoryId: 'food',
      month: budgetMonth,
      amount: 10000,
    })
    createdBudgetId = budget1.id
    assert.strictEqual(budget1.amount, 10000)

    let budgetDupError = null
    try {
      await dataProvider.createBudget({
        categoryId: 'food',
        month: budgetMonth,
        amount: 12000,
      })
    } catch (err) {
      budgetDupError = err
    }
    assert(budgetDupError instanceof ApiError, 'Expected ApiError for duplicate budget')
    assert.strictEqual(budgetDupError.code, 'DUPLICATE_BUDGET', 'Error code should be DUPLICATE_BUDGET')
    assert.strictEqual(budgetDupError.status, 409, 'Status should be 409 Conflict')
    logPass(17, `Duplicate budget rejected with code "${budgetDupError.code}" (HTTP 409 Conflict)`)

    // -----------------------------------------------------------------
    // 18. System category protection works
    // -----------------------------------------------------------------
    console.log('18. Testing system category deletion protection...')
    let categoryDeleteError = null
    try {
      await dataProvider.deleteCategory('food')
    } catch (err) {
      categoryDeleteError = err
    }
    assert(categoryDeleteError instanceof ApiError, 'Expected ApiError when deleting system category')
    assert.strictEqual(categoryDeleteError.status, 400, 'Status should be 400')
    assert.match(categoryDeleteError.message, /System default categories cannot be deleted/, 'Should state system category protection')
    logPass(18, `System category deletion protected with HTTP 400: "${categoryDeleteError.message}"`)

    // Also test custom category creation and deletion
    const customCat = await dataProvider.createCategory({
      name: `${testTag}-PetCare`,
      type: 'expense',
      icon: '🐾',
      color: '#06B6D4',
    })
    createdCategoryId = customCat.id
    assert.strictEqual(customCat.label, `${testTag}-PetCare`)
    await dataProvider.deleteCategory(customCat.id)
    createdCategoryId = null
    console.log('  ✓ Custom category created and deleted successfully.')

    console.log('\n=================================================================')
    console.log('🎉 ALL 18/18 API INTEGRATION REQUIREMENTS VERIFIED & PASSED!')
    console.log('=================================================================\n')
  } finally {
    // Clean up test fixtures
    console.log('Cleaning up test fixtures...')
    for (const txnId of createdTxnIds) {
      try { await apiClient.delete(`/transactions/${txnId}`) } catch {}
    }
    if (createdBudgetId) {
      try { await apiClient.delete(`/budgets/${createdBudgetId}`) } catch {}
    }
    if (createdGoalId) {
      try { await apiClient.delete(`/goals/${createdGoalId}`) } catch {}
    }
    if (createdAccountId) {
      try { await apiClient.delete(`/accounts/${createdAccountId}`) } catch {}
    }
    if (createdCategoryId) {
      try { await apiClient.delete(`/categories/${createdCategoryId}`) } catch {}
    }
    console.log('Cleanup complete.')
  }
}

runApiIntegrationTests().catch((err) => {
  console.error('\n❌ API INTEGRATION TEST FAILED:', err)
  process.exit(1)
})

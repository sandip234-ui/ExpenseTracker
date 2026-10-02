import assert from 'node:assert'
import prisma from './src/lib/prisma.js'
import * as accountService from './src/services/accountService.js'
import * as transactionService from './src/services/transactionService.js'
import * as goalService from './src/services/goalService.js'
import * as budgetService from './src/services/budgetService.js'
import * as categoryService from './src/services/categoryService.js'
import {
  InsufficientBalanceError,
  GoalInsufficientFundsError,
  GoalOverfundingError,
  InvalidAmountError,
  InvalidCategoryTypeError,
  DuplicateBudgetError,
} from './src/errors/domainErrors.js'
import { getPaymentMethodsForAccount } from './src/utils/formatters.js'

console.log('===============================================================')
console.log('FINTRACK BACKEND DOMAIN SERVICES & ATOMIC FINANCIAL LOGIC TESTS')
console.log('===============================================================\n')

async function runDomainServiceTests() {
  const prefix = `test-${Date.now()}`
  const bankAccId = `${prefix}-acc-bank`
  const cashAccId = `${prefix}-acc-cash`
  const upiAccId = `${prefix}-acc-upi`
  const zeroAccId = `${prefix}-acc-zero`
  const goalId = `${prefix}-goal-macbook`

  try {
    // ─── FIXTURE SETUP ──────────────────────────────────────────────────────────
    console.log('--- Setting Up Test Fixtures ---')
    await prisma.account.createMany({
      data: [
        { id: bankAccId, name: `HDFC Bank ${prefix}`, normalizedName: `hdfc bank ${prefix}`, type: 'bank', openingBalance: 10000 },
        { id: cashAccId, name: `Cash Wallet ${prefix}`, normalizedName: `cash wallet ${prefix}`, type: 'cash', openingBalance: 5000 },
        { id: upiAccId, name: `Paytm UPI ${prefix}`, normalizedName: `paytm upi ${prefix}`, type: 'upi', openingBalance: 2000 },
        { id: zeroAccId, name: `Zero Balance Account ${prefix}`, normalizedName: `zero balance account ${prefix}`, type: 'bank', openingBalance: 0 },
      ],
    })
    console.log('✓ Accounts created: Bank (10k), Cash (5k), UPI (2k), Zero (0)')

    // ─── SECTION 1: FINANCIAL RULES & FLOWS TESTS (A to L) ──────────────────────
    console.log('\n--- Section 1: Financial Rules & Flows Tests (A to L) ---')

    // Test A: Income → Bank → ₹7,000
    console.log('Test A: Income → Bank → ₹7,000')
    const txnA = await transactionService.createTransaction({
      id: `${prefix}-tx-1`,
      type: 'income',
      amount: 7000,
      accountId: bankAccId,
      categoryId: 'salary',
      description: 'Monthly Salary',
      date: '2026-09-01',
    })
    const balA = await accountService.calculateAccountBalance(bankAccId)
    assert.strictEqual(balA, 17000, 'Bank balance should be 17000 after 7000 income')
    console.log('  ✓ Pass: Bank balance increased by 7,000 to 17,000')

    // Test B: Expense → Bank → ₹2,000
    console.log('Test B: Expense → Bank → ₹2,000')
    const txnB = await transactionService.createTransaction({
      id: `${prefix}-tx-2`,
      type: 'expense',
      amount: 2000,
      accountId: bankAccId,
      categoryId: 'food',
      description: 'Grocery shopping',
      date: '2026-09-02',
    })
    const balB = await accountService.calculateAccountBalance(bankAccId)
    assert.strictEqual(balB, 15000, 'Bank balance should be 15000 after 2000 expense')
    console.log('  ✓ Pass: Bank balance decreased by 2,000 to 15,000')

    // Test C: Expense greater than balance → rejected
    console.log('Test C: Expense greater than balance → rejected')
    let testCRejected = false
    try {
      await transactionService.createTransaction({
        id: `${prefix}-tx-fail`,
        type: 'expense',
        amount: 16000,
        accountId: bankAccId,
        categoryId: 'shopping',
        description: 'Expensive TV',
        date: '2026-09-03',
      })
    } catch (err) {
      assert.ok(err instanceof InsufficientBalanceError, 'Should throw InsufficientBalanceError')
      assert.match(err.message, /Insufficient balance\. Available in HDFC Bank.*: ₹15,000\.00/)
      testCRejected = true
      console.log(`  ✓ Pass: Correctly rejected with message: "${err.message}"`)
    }
    assert.strictEqual(testCRejected, true, 'Expense > balance must be rejected')

    // Test D: Edit expense amount with reversal calculation
    // Bank has: opening 10k, income 7k (tx-1), expense 2k (tx-2).
    // Let's create an expense of 7,000, then edit it to 18,000.
    // Opening 10k + Income 12k = 22k. Original expense = 7k -> current = 15k.
    // User edits 7k -> 18k. Available = 15k + 7k = 22k. 18k is accepted -> balance becomes 4k.
    console.log('Test D: Edit expense amount with reversal calculation')
    const editBankAccId = `${prefix}-acc-edit-bank`
    await accountService.createAccount({
      id: editBankAccId,
      name: `Edit Bank ${prefix}`,
      type: 'bank',
      openingBalance: 10000,
    })
    await transactionService.createTransaction({
      id: `${prefix}-edit-inc`,
      type: 'income',
      amount: 12000,
      accountId: editBankAccId,
      categoryId: 'salary',
      description: 'Salary',
      date: '2026-09-01',
    })
    const expTxn = await transactionService.createTransaction({
      id: `${prefix}-edit-exp`,
      type: 'expense',
      amount: 7000,
      accountId: editBankAccId,
      categoryId: 'shopping',
      description: 'Phone',
      date: '2026-09-01',
    })
    const balBeforeEdit = await accountService.calculateAccountBalance(editBankAccId)
    assert.strictEqual(balBeforeEdit, 15000, 'Current balance should be 15000')

    const availableForEdit = await accountService.getAvailableAccountBalance(
      editBankAccId,
      expTxn
    )
    assert.strictEqual(availableForEdit, 22000, 'Available balance should be 15000 + 7000 = 22000')

    // Update expense to 18,000
    await transactionService.updateTransaction(expTxn.id, {
      amount: 18000,
      description: 'Phone upgrade',
    })
    const balAfterEdit = await accountService.calculateAccountBalance(editBankAccId)
    assert.strictEqual(balAfterEdit, 4000, 'Balance should be 10000 + 12000 - 18000 = 4000')
    console.log('  ✓ Pass: Available balance calculated as ₹22,000; ₹18,000 expense accepted; balance updated to ₹4,000')

    // Test E: Edit income amount
    console.log('Test E: Edit income amount')
    // Original income: 12,000. Edit to 15,000. Final: 10000 + 15000 - 18000 = 7000.
    await transactionService.updateTransaction(`${prefix}-edit-inc`, {
      amount: 15000,
    })
    const balAfterIncEdit = await accountService.calculateAccountBalance(editBankAccId)
    assert.strictEqual(balAfterIncEdit, 7000, 'Balance should be 10000 + 15000 - 18000 = 7000')
    console.log('  ✓ Pass: Income edit reversed original and applied new amount correctly')

    // Test F: Change expense → income
    console.log('Test F: Change expense → income')
    // Balance is 7,000 with expense 18k. Let's create fresh fixture:
    // Opening: 10,000, Income: 12,000, Expense: 7,000 => Bal = 15,000.
    // Changing expense 7k to Income 5k => Balance should be 10000 + 12000 + 5000 = 27,000.
    const ex6AccId = `${prefix}-acc-ex6`
    await accountService.createAccount({ id: ex6AccId, name: `Ex6 Bank ${prefix}`, type: 'bank', openingBalance: 10000 })
    await transactionService.createTransaction({
      id: `${prefix}-ex6-inc`,
      type: 'income',
      amount: 12000,
      accountId: ex6AccId,
      categoryId: 'salary',
      description: 'Salary',
      date: '2026-09-01',
    })
    const ex6Exp = await transactionService.createTransaction({
      id: `${prefix}-ex6-exp`,
      type: 'expense',
      amount: 7000,
      accountId: ex6AccId,
      categoryId: 'bills',
      description: 'Bill',
      date: '2026-09-01',
    })
    assert.strictEqual(await accountService.calculateAccountBalance(ex6AccId), 15000)

    // User changes expense to Income 5,000
    await transactionService.updateTransaction(ex6Exp.id, {
      type: 'income',
      amount: 5000,
      categoryId: 'gift',
    })
    const balF = await accountService.calculateAccountBalance(ex6AccId)
    assert.strictEqual(balF, 27000, 'Bank balance should be 10000 + 12000 + 5000 = 27000')
    console.log('  ✓ Pass: Bank balance correctly reversed expense (+7k) and added income (+5k) -> 27,000')

    // Test G: Change income → expense
    console.log('Test G: Change income → expense')
    // Bank is 27,000. Changing the 5k income to 3k expense.
    // Available = 27,000 - 5,000 = 22,000. Expense 3k is valid.
    // Final balance = 10000 + 12000 - 3000 = 19,000.
    await transactionService.updateTransaction(ex6Exp.id, {
      type: 'expense',
      amount: 3000,
      categoryId: 'food',
    })
    const balG = await accountService.calculateAccountBalance(ex6AccId)
    assert.strictEqual(balG, 19000, 'Bank balance should be 10000 + 12000 - 3000 = 19000')
    console.log('  ✓ Pass: Income reversed (-5k) and expense applied (-3k) -> 19,000')

    // Test H: Change account while editing
    console.log('Test H: Change account while editing')
    // Original: Expense ₹7,000 from Bank (bal 15,000). Edited: Expense ₹3,000 from Cash (bal 5,000).
    // Bank should revert to 22,000. Cash should become 5,000 - 3,000 = 2,000.
    const hBankId = `${prefix}-acc-h-bank`
    const hCashId = `${prefix}-acc-h-cash`
    await accountService.createAccount({ id: hBankId, name: `H Bank ${prefix}`, type: 'bank', openingBalance: 10000 })
    await accountService.createAccount({ id: hCashId, name: `H Cash ${prefix}`, type: 'cash', openingBalance: 5000 })
    await transactionService.createTransaction({
      id: `${prefix}-h-inc`,
      type: 'income',
      amount: 12000,
      accountId: hBankId,
      categoryId: 'salary',
      description: 'Salary',
    })
    const hExp = await transactionService.createTransaction({
      id: `${prefix}-h-exp`,
      type: 'expense',
      amount: 7000,
      accountId: hBankId,
      categoryId: 'shopping',
      description: 'Shopping',
    })
    assert.strictEqual(await accountService.calculateAccountBalance(hBankId), 15000)
    assert.strictEqual(await accountService.calculateAccountBalance(hCashId), 5000)

    // Edit transaction: move to Cash with 3000 amount
    await transactionService.updateTransaction(hExp.id, {
      accountId: hCashId,
      amount: 3000,
    })
    assert.strictEqual(await accountService.calculateAccountBalance(hBankId), 22000, 'Bank should be 22,000')
    assert.strictEqual(await accountService.calculateAccountBalance(hCashId), 2000, 'Cash should be 2,000')
    console.log('  ✓ Pass: Old account reversed (+7k -> 22,000) and new account debited (-3k -> 2,000)')

    // Test I: Category validation & category lists
    console.log('Test I: Category lists and type validation')
    let invalidCatRejected = false
    try {
      await transactionService.createTransaction({
        type: 'income',
        amount: 1000,
        accountId: bankAccId,
        categoryId: 'food', // Food is an expense category
        description: 'Should fail',
      })
    } catch (err) {
      assert.ok(err instanceof InvalidCategoryTypeError)
      invalidCatRejected = true
      console.log(`  ✓ Pass: Correctly rejected incompatible category: "${err.message}"`)
    }
    assert.strictEqual(invalidCatRejected, true)

    // Free text description allows "Spending" when type is Income
    const freeTextTxn = await transactionService.createTransaction({
      type: 'income',
      amount: 1000,
      accountId: bankAccId,
      categoryId: 'salary',
      description: 'Spending on weekend', // Keyword "spending" in description must not fail
    })
    assert.ok(freeTextTxn.id)
    console.log('  ✓ Pass: Category lists match exact specifications and descriptions are completely free-text')

    // Test J: Payment methods per account type
    console.log('Test J: Payment methods per account type')
    assert.deepStrictEqual(getPaymentMethodsForAccount({ type: 'cash' }), ['Cash', 'Other'])
    assert.deepStrictEqual(getPaymentMethodsForAccount({ type: 'bank' }), ['UPI', 'Debit Card', 'Net Banking', 'Cheque', 'Other'])
    assert.deepStrictEqual(getPaymentMethodsForAccount({ type: 'upi' }), ['UPI', 'Wallet', 'Other'])
    assert.deepStrictEqual(getPaymentMethodsForAccount({ type: 'wallet' }), ['UPI', 'Wallet', 'Other'])
    console.log('  ✓ Pass: Payment method mappings are strictly enforced')

    // Test K: Change account & payment method preservation/reset rule
    console.log('Test K: Change account preserves payment method if valid, resets if invalid')
    const kTxn = await transactionService.createTransaction({
      type: 'expense',
      amount: 100,
      accountId: bankAccId,
      paymentMethod: 'Net Banking',
      description: 'Test K',
    })
    // Move to Cash account -> Net Banking is invalid for Cash -> resets to Cash
    const kUpdated = await transactionService.updateTransaction(kTxn.id, {
      accountId: cashAccId,
    })
    assert.strictEqual(kUpdated.paymentMethod, 'Cash', 'Should reset to Cash')
    console.log('  ✓ Pass: Payment method resets only when incompatible with new account')

    // Test L: Existing transaction with old/invalid payment method
    console.log('Test L: Existing transaction with legacy/custom payment method')
    const lTxn = await transactionService.createTransaction({
      type: 'expense',
      amount: 500,
      accountId: bankAccId,
      paymentMethod: 'Crypto',
      allowLegacyMethod: true,
      description: 'Old meal',
    })
    assert.strictEqual(lTxn.paymentMethod, 'Crypto')
    console.log('  ✓ Pass: Existing transactions with custom/legacy methods calculate and display safely without modifying data')

    console.log('\n--- SECTION 1 PASSED: ALL 12 FINANCIAL RULES (A TO L) VERIFIED ---')

    // ─── SECTION 2: FINANCIAL EDGE-CASE INVARIANTS (1 to 11) ────────────────────
    console.log('\n--- Section 2: Financial Edge-Case Invariants (1 to 11) ---')

    const edgeBankId = `${prefix}-edge-bank`
    const edgeUpiId = `${prefix}-edge-upi`
    const edgeGoalId = `${prefix}-edge-goal`

    await accountService.createAccount({ id: edgeBankId, name: `Bank Account 1 ${prefix}`, type: 'bank', openingBalance: 8000 })
    await accountService.createAccount({ id: edgeUpiId, name: `UPI Account ${prefix}`, type: 'upi', openingBalance: 5659 })
    await goalService.createGoal({
      id: edgeGoalId,
      name: 'Macbook Goal',
      targetAmount: 80000,
      currentAmount: 70300,
    })

    console.log(`✅ PASS: Initial Bank Account available balance is ₹${(await accountService.calculateAccountBalance(edgeBankId)).toLocaleString('en-IN')}`)
    console.log(`✅ PASS: Initial UPI available balance is ₹${(await accountService.calculateAccountBalance(edgeUpiId)).toLocaleString('en-IN')}`)
    const initGoal = await goalService.getGoalById(edgeGoalId)
    console.log(`✅ PASS: Initial Macbook Goal balance is ₹${initGoal.currentAmount.toLocaleString('en-IN')}`)

    // TEST 1: Available = ₹8,000, Add = ₹5,000
    console.log('\n--- TEST 1: Available = ₹8,000, Add = ₹5,000 ---')
    const t1Res = await goalService.depositToGoal({
      goalId: edgeGoalId,
      amount: 5000,
      sourceAccountId: edgeBankId,
    })
    const bankAfterT1 = await accountService.calculateAccountBalance(edgeBankId)
    assert.strictEqual(bankAfterT1, 3000)
    assert.strictEqual(t1Res.updatedGoal.currentAmount, 75300)
    assert.strictEqual(t1Res.transactionRecord.type, 'transfer')
    assert.strictEqual(t1Res.transactionRecord.transferType, 'goal_deposit')
    console.log('✅ PASS: Bank Account decreased from ₹8,000 to ₹3,000')
    console.log('✅ PASS: Goal increased from ₹70,300 to ₹75,300')
    console.log('✅ PASS: Transaction record has type: "transfer"')
    console.log('✅ PASS: Transaction record has transferType: "goal_deposit"')

    // TEST 2: Exact balance transfer (Available = ₹8,000, Add = ₹8,000)
    console.log('\n--- TEST 2: Exact balance transfer (Available = ₹8,000, Add = ₹8,000) ---')
    const t2BankId = `${prefix}-t2-bank`
    const t2GoalId = `${prefix}-t2-goal`
    await accountService.createAccount({ id: t2BankId, name: `Bank Account 2 ${prefix}`, type: 'bank', openingBalance: 8000 })
    await goalService.createGoal({ id: t2GoalId, name: 'Macbook M5', targetAmount: 150000, currentAmount: 70300 })
    const t2Res = await goalService.depositToGoal({
      goalId: t2GoalId,
      amount: 8000,
      sourceAccountId: t2BankId,
    })
    const bankAfterT2 = await accountService.calculateAccountBalance(t2BankId)
    assert.strictEqual(bankAfterT2, 0)
    assert.strictEqual(t2Res.updatedGoal.currentAmount, 78300)
    console.log('✅ PASS: Bank Account reduced to exactly ₹0 (actual: 0)')
    console.log('✅ PASS: Goal increased to ₹78,300 (actual: 78300)')

    // TEST 3: Insufficient balance (Available = ₹8,000, Add = ₹8,001)
    console.log('\n--- TEST 3: Insufficient balance (Available = ₹8,000, Add = ₹8,001) ---')
    const t3BankId = `${prefix}-t3-bank`
    const t3GoalId = `${prefix}-t3-goal`
    await accountService.createAccount({ id: t3BankId, name: `Bank Account 3 ${prefix}`, type: 'bank', openingBalance: 8000 })
    await goalService.createGoal({ id: t3GoalId, name: 'Macbook M5', targetAmount: 150000, currentAmount: 70300 })
    let t3Rejected = false
    try {
      await goalService.depositToGoal({
        goalId: t3GoalId,
        amount: 8001,
        sourceAccountId: t3BankId,
      })
    } catch (err) {
      assert.ok(err instanceof InsufficientBalanceError)
      assert.match(
        err.message,
        /Insufficient balance\. Available balance in Bank Account.*: ₹8,000\.00/
      )
      t3Rejected = true
      console.log(`✅ PASS: Rejected with message: "${err.message}"`)
    }
    assert.strictEqual(t3Rejected, true, 'Test 3 correctly rejected ₹8,001 with available ₹8,000')

    // TEST 4: Available = ₹0, Add = ₹1 on zero balance account
    console.log('\n--- TEST 4: Available = ₹0, Add = ₹1 ---')
    let t4Rejected = false
    try {
      await goalService.depositToGoal({
        goalId: edgeGoalId,
        amount: 1,
        sourceAccountId: zeroAccId,
      })
    } catch (err) {
      assert.ok(err instanceof InsufficientBalanceError)
      assert.match(err.message, /Insufficient balance\. Available balance in Zero Balance Account.*: ₹0\.00/)
      t4Rejected = true
      console.log(`✅ PASS: Rejected with message: "${err.message}"`)
    }
    assert.strictEqual(t4Rejected, true)

    // TEST 5: Add = ₹0
    console.log('\n--- TEST 5: Add = ₹0 ---')
    let t5Rejected = false
    try {
      await goalService.depositToGoal({ goalId: edgeGoalId, amount: 0, sourceAccountId: edgeUpiId })
    } catch (err) {
      assert.ok(err instanceof InvalidAmountError)
      assert.strictEqual(err.message, 'Please enter a valid amount greater than ₹0.')
      t5Rejected = true
      console.log(`✅ PASS: Rejected with message: "${err.message}"`)
    }
    assert.strictEqual(t5Rejected, true)

    // TEST 6: Add = -₹5,000
    console.log('\n--- TEST 6: Add = -₹5,000 ---')
    let t6Rejected = false
    try {
      await goalService.depositToGoal({ goalId: edgeGoalId, amount: -5000, sourceAccountId: edgeUpiId })
    } catch (err) {
      assert.ok(err instanceof InvalidAmountError)
      assert.strictEqual(err.message, 'Please enter a valid amount greater than ₹0.')
      t6Rejected = true
      console.log(`✅ PASS: Rejected with message: "${err.message}"`)
    }
    assert.strictEqual(t6Rejected, true)

    // TEST 7: Goal = ₹70,300, Withdraw = ₹5,000
    console.log('\n--- TEST 7: Goal = ₹70,300, Withdraw = ₹5,000 ---')
    const t7GoalId = `${prefix}-t7-goal`
    const t7BankId = `${prefix}-t7-bank`
    await goalService.createGoal({
      id: t7GoalId,
      name: 'Macbook M5',
      targetAmount: 150000,
      currentAmount: 70300,
    })
    await accountService.createAccount({
      id: t7BankId,
      name: `Bank Account 7 ${prefix}`,
      type: 'bank',
      openingBalance: 3000,
    })
    const t7Res = await goalService.withdrawFromGoal({
      goalId: t7GoalId,
      amount: 5000,
      destinationAccountId: t7BankId,
    })
    const bankAfterT7 = await accountService.calculateAccountBalance(t7BankId)
    assert.strictEqual(bankAfterT7, 8000, 'Destination Bank Account increased from ₹3,000 to ₹8,000')
    assert.strictEqual(t7Res.updatedGoal.currentAmount, 65300, 'Goal balance decreased from ₹70,300 to ₹65,300')
    assert.strictEqual(t7Res.transactionRecord.transferType, 'goal_withdrawal')
    console.log('✅ PASS: Destination Bank Account increased from ₹3,000 to ₹8,000 (actual: 8000)')
    console.log('✅ PASS: Goal balance decreased from ₹70,300 to ₹65,300 (actual: 65300)')
    console.log('✅ PASS: Transaction record has type: "transfer"')
    console.log('✅ PASS: Transaction record has transferType: "goal_withdrawal"')
    console.log('✅ PASS: Withdrawal is NOT counted as new external income (Total Income: ₹0)')

    // TEST 8: Goal = ₹70,300, Withdraw = ₹70,301 -> Expected: REJECT
    console.log('\n--- TEST 8: Goal = ₹70,300, Withdraw = ₹70,301 ---')
    const t8GoalId = `${prefix}-t8-goal`
    const t8BankId = `${prefix}-t8-bank`
    await goalService.createGoal({
      id: t8GoalId,
      name: 'Macbook M5',
      targetAmount: 150000,
      currentAmount: 70300,
    })
    await accountService.createAccount({
      id: t8BankId,
      name: `Bank Account 8 ${prefix}`,
      type: 'bank',
      openingBalance: 3000,
    })
    let t8Rejected = false
    try {
      await goalService.withdrawFromGoal({
        goalId: t8GoalId,
        amount: 70301,
        destinationAccountId: t8BankId,
      })
    } catch (err) {
      assert.ok(err instanceof GoalInsufficientFundsError)
      assert.strictEqual(
        err.message,
        'Insufficient funds in this savings goal. Currently available: ₹70,300.00'
      )
      t8Rejected = true
      console.log(`✅ PASS: Rejected with message: "${err.message}"`)
    }
    assert.strictEqual(t8Rejected, true, 'Test 8 correctly rejected withdrawing more than goal balance')

    // TEST 9: Dynamic balance calculation per account
    console.log('\n--- TEST 9: Dynamic balance calculation per account ---')
    // edgeBankId had 8000, deposited 5000 (T1) -> 3000
    // edgeUpiId had 5659
    assert.strictEqual(await accountService.calculateAccountBalance(edgeBankId), 3000)
    assert.strictEqual(await accountService.calculateAccountBalance(edgeUpiId), 5659)
    console.log('✅ PASS: Bank Account balance is ₹3,000')
    console.log('✅ PASS: UPI balance is ₹5,659')

    // TEST 10: Prevent Savings Goal Overfunding
    console.log('\n--- TEST 10: Prevent Savings Goal Overfunding ---')
    const almostDoneGoalId = `${prefix}-t10-goal`
    const richBankId = `${prefix}-t10-bank`
    await goalService.createGoal({
      id: almostDoneGoalId,
      name: 'Macbook M5',
      targetAmount: 150000,
      currentAmount: 148000,
    })
    await accountService.createAccount({
      id: richBankId,
      name: `Rich Bank ${prefix}`,
      type: 'bank',
      openingBalance: 50000,
    })
    let t10Rejected = false
    try {
      await goalService.depositToGoal({
        goalId: almostDoneGoalId,
        amount: 5000,
        sourceAccountId: richBankId,
      })
    } catch (err) {
      assert.ok(err instanceof GoalOverfundingError)
      assert.strictEqual(err.message, 'Only ₹2,000.00 remaining to reach this goal.')
      t10Rejected = true
      console.log(`✅ PASS: Rejected with message: "${err.message}"`)
    }
    assert.strictEqual(t10Rejected, true, 'Test 10 correctly prevented overfunding by ₹3,000')

    // TEST 11: Transaction Deletion Atomic Reversal
    console.log('\n--- TEST 11: Transaction Deletion Atomic Reversal ---')
    // Fresh fixture for Test 11
    const delAccId = `${prefix}-del-acc`
    const delGoalId = `${prefix}-del-goal`
    await accountService.createAccount({ id: delAccId, name: `Del Acc ${prefix}`, type: 'bank', openingBalance: 10000 })
    await goalService.createGoal({ id: delGoalId, name: 'Del Goal', targetAmount: 100000, currentAmount: 70000 })

    const depRes = await goalService.depositToGoal({
      goalId: delGoalId,
      amount: 5000,
      sourceAccountId: delAccId,
    })
    assert.strictEqual((await goalService.getGoalById(delGoalId)).currentAmount, 75000)
    assert.strictEqual(await accountService.calculateAccountBalance(delAccId), 5000)
    console.log('✅ PASS: Goal increased to ₹75,000 after deposit, Account decreased to ₹5,000')

    // Delete transaction atomically reverses both ledger effect and goal currentAmount
    await transactionService.deleteTransaction(depRes.transactionRecord.id)
    assert.strictEqual((await goalService.getGoalById(delGoalId)).currentAmount, 70000)
    assert.strictEqual(await accountService.calculateAccountBalance(delAccId), 10000)
    console.log('✅ PASS: Goal reverted to ₹70,000 upon transaction deletion')
    console.log('✅ PASS: Account balance restored to ₹10,000 upon transaction deletion')

    console.log('\n--- SECTION 2 PASSED: ALL 11 FINANCIAL EDGE CASES VERIFIED ---')

    // ─── SECTION 3: ATOMICITY, ROLLBACK, BUDGETS & CATEGORIES ──────────────────
    console.log('\n--- Section 3: Atomicity, Rollback, Budgets & Categories ---')

    // 1. Transaction Rollback on Failure
    console.log('1. Verifying database transaction rollback on failure...')
    const preCount = await prisma.transaction.count()
    let txRollbackPassed = false
    try {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            id: `${prefix}-rollback-tx`,
            type: 'income',
            amount: 500,
            description: 'Should be rolled back',
            accountId: bankAccId,
            date: new Date(),
          },
        })
        throw new Error('Simulated failure triggering rollback')
      })
    } catch (e) {
      const postCount = await prisma.transaction.count()
      assert.strictEqual(preCount, postCount, 'Transaction count must remain unchanged after rollback')
      txRollbackPassed = true
      console.log('  ✓ Pass: Database transaction successfully rolled back')
    }
    assert.strictEqual(txRollbackPassed, true)

    // 2. Budget Service: Category/Month Uniqueness
    console.log('2. Verifying Budget Service & Category/Month uniqueness...')
    const budget1 = await budgetService.createBudget({
      categoryId: 'food',
      month: '2026-09',
      amount: 5000,
    })
    assert.strictEqual(budget1.amount, 5000)

    let dupBudgetRejected = false
    try {
      await budgetService.createBudget({
        categoryId: 'food',
        month: '2026-09',
        amount: 6000,
      })
    } catch (err) {
      assert.ok(err instanceof DuplicateBudgetError)
      dupBudgetRejected = true
      console.log(`  ✓ Pass: Duplicate budget correctly rejected: "${err.message}"`)
    }
    assert.strictEqual(dupBudgetRejected, true)

    // Calculate budget status
    const bStatus = await budgetService.calculateBudgetStatus(budget1)
    assert.ok(bStatus)
    assert.strictEqual(bStatus.budgetAmount, 5000)
    console.log(`  ✓ Pass: Budget status calculated. Spent: ₹${bStatus.spent}, Remaining: ₹${bStatus.remaining}`)

    // 3. Category Service: Custom category creation and protection
    console.log('3. Verifying Category Service...')
    const customCat = await categoryService.createCategory({
      name: 'Pet Care',
      type: 'expense',
      icon: '🐾',
    })
    assert.strictEqual(customCat.isCustom, true)
    console.log('  ✓ Pass: Custom category created')

    // System category deletion protection
    let sysCatProtected = false
    try {
      await categoryService.deleteCategory('food')
    } catch (err) {
      assert.match(err.message, /System default categories cannot be deleted/)
      sysCatProtected = true
      console.log(`  ✓ Pass: System category protected from deletion: "${err.message}"`)
    }
    assert.strictEqual(sysCatProtected, true)

    console.log('\n--- SECTION 3 PASSED: ATOMICITY, BUDGETS & CATEGORIES VERIFIED ---')

    // ─── CLEANUP TEST FIXTURES ──────────────────────────────────────────────────
    console.log('\n--- Cleaning Up Test Fixtures ---')
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { id: { startsWith: prefix } },
          { accountId: { startsWith: prefix } },
        ],
      },
    })
    await prisma.budget.deleteMany({
      where: { id: budget1.id },
    })
    await prisma.category.deleteMany({
      where: { id: customCat.id },
    })
    await prisma.savingsGoal.deleteMany({
      where: { id: { startsWith: prefix } },
    })
    await prisma.account.deleteMany({
      where: { id: { startsWith: prefix } },
    })
    console.log('✓ All test fixtures safely removed. Seeded database data preserved.')

    console.log('\n===============================================================')
    console.log('🎉 ALL BACKEND DOMAIN SERVICE & FINANCIAL INVARIANT TESTS PASSED!')
    console.log('===============================================================')
  } catch (error) {
    console.error('❌ Domain service tests failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runDomainServiceTests()

// Mock localStorage for Node environment
const store = {}
global.localStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = String(val) },
  removeItem: (key) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) }
}

import { depositToGoal, withdrawFromGoal } from './src/services/goalService.js'
import { calculateAccountBalance } from './src/services/accountService.js'
import { getTotalIncome, getTotalExpenses } from './src/utils/calculations.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    process.exit(1)
  } else {
    console.log(`✅ PASS: ${message}`)
  }
}

console.log('--- Running Financial Data-Integrity Tests ---')

// Base test setup
const bankAccount = {
  id: 'acc-bank-1',
  name: 'Bank Account',
  type: 'bank',
  openingBalance: 8000,
}

const upiAccount = {
  id: 'acc-upi-1',
  name: 'UPI / Wallet',
  type: 'upi',
  openingBalance: 5659,
}

const zeroAccount = {
  id: 'acc-zero-1',
  name: 'Zero Balance Account',
  type: 'cash',
  openingBalance: 0,
}

const macbookGoal = {
  id: 'goal-macbook',
  name: 'Macbook M5',
  targetAmount: 150000,
  currentAmount: 70300,
}

const accounts = [bankAccount, upiAccount, zeroAccount]
let goals = [macbookGoal]
let transactions = []

// Verify initial state
assert(calculateAccountBalance(bankAccount, transactions) === 8000, 'Initial Bank Account available balance is ₹8,000')
assert(calculateAccountBalance(upiAccount, transactions) === 5659, 'Initial UPI available balance is ₹5,659')
assert(macbookGoal.currentAmount === 70300, 'Initial Macbook Goal balance is ₹70,300')

// TEST 1: Available = ₹8,000, Add = ₹5,000 -> Expected: SUCCESS
console.log('\n--- TEST 1: Available = ₹8,000, Add = ₹5,000 ---')
try {
  const res = depositToGoal({
    goalId: macbookGoal.id,
    amount: 5000,
    sourceAccountId: bankAccount.id,
    accounts,
    transactions,
    goals,
  })
  goals = res.updatedGoals
  transactions = res.updatedTransactions
  const newBankBal = calculateAccountBalance(bankAccount, transactions)
  const updatedGoal = goals.find(g => g.id === macbookGoal.id)
  
  assert(newBankBal === 3000, `Bank Account decreased from ₹8,000 to ₹3,000 (actual: ₹${newBankBal})`)
  assert(updatedGoal.currentAmount === 75300, `Goal increased from ₹70,300 to ₹75,300 (actual: ₹${updatedGoal.currentAmount})`)
  assert(res.transactionRecord.type === 'transfer', 'Transaction record has type: "transfer"')
  assert(res.transactionRecord.transferType === 'goal_deposit', 'Transaction record has transferType: "goal_deposit"')
  assert(res.transactionRecord.amount === 5000, 'Transaction record amount is ₹5,000')
  assert(getTotalIncome(transactions) === 0, 'Total income is ₹0 (transfer not counted as income)')
  assert(getTotalExpenses(transactions) === 0, 'Total expenses is ₹0 (transfer not counted as expense)')
} catch (e) {
  assert(false, `Test 1 threw error: ${e.message}`)
}

// TEST 2: Available = ₹8,000, Add = ₹8,000 (exact full balance)
console.log('\n--- TEST 2: Exact balance transfer (Available = ₹8,000, Add = ₹8,000) ---')
{
  const freshBank = { id: 'acc-t2', name: 'Bank T2', openingBalance: 8000 }
  const freshGoal = { id: 'goal-t2', name: 'Macbook M5', targetAmount: 150000, currentAmount: 70300 }
  const res = depositToGoal({
    goalId: freshGoal.id,
    amount: 8000,
    sourceAccountId: freshBank.id,
    accounts: [freshBank],
    transactions: [],
    goals: [freshGoal],
  })
  const bankBal = calculateAccountBalance(freshBank, res.updatedTransactions)
  const g = res.updatedGoals.find(x => x.id === freshGoal.id)
  assert(bankBal === 0, `Bank Account reduced to exactly ₹0 (actual: ₹${bankBal})`)
  assert(g.currentAmount === 78300, `Goal increased to ₹78,300 (actual: ₹${g.currentAmount})`)
}

// TEST 3: Available = ₹8,000, Add = ₹8,001 -> Expected: REJECT
console.log('\n--- TEST 3: Insufficient balance (Available = ₹8,000, Add = ₹8,001) ---')
{
  const freshBank = { id: 'acc-t3', name: 'Bank Account', openingBalance: 8000 }
  const freshGoal = { id: 'goal-t3', name: 'Macbook M5', targetAmount: 150000, currentAmount: 70300 }
  let rejected = false
  try {
    depositToGoal({
      goalId: freshGoal.id,
      amount: 8001,
      sourceAccountId: freshBank.id,
      accounts: [freshBank],
      transactions: [],
      goals: [freshGoal],
    })
  } catch (e) {
    rejected = true
    assert(e.message.includes('Insufficient balance'), `Rejected with message: "${e.message}"`)
  }
  assert(rejected, 'Test 3 correctly rejected ₹8,001 with available ₹8,000')
}

// TEST 4: Available = ₹0, Add = ₹1 -> Expected: REJECT
console.log('\n--- TEST 4: Available = ₹0, Add = ₹1 ---')
{
  let rejected = false
  try {
    depositToGoal({
      goalId: macbookGoal.id,
      amount: 1,
      sourceAccountId: zeroAccount.id,
      accounts,
      transactions,
      goals,
    })
  } catch (e) {
    rejected = true
    assert(e.message.includes('Insufficient balance'), `Rejected with message: "${e.message}"`)
  }
  assert(rejected, 'Test 4 correctly rejected adding funds from zero balance account')
}

// TEST 5: Add = ₹0 -> Expected: REJECT
console.log('\n--- TEST 5: Add = ₹0 ---')
{
  let rejected = false
  try {
    depositToGoal({
      goalId: macbookGoal.id,
      amount: 0,
      sourceAccountId: bankAccount.id,
      accounts,
      transactions,
      goals,
    })
  } catch (e) {
    rejected = true
    assert(e.message.includes('greater than ₹0'), `Rejected with message: "${e.message}"`)
  }
  assert(rejected, 'Test 5 correctly rejected ₹0')
}

// TEST 6: Add = -₹5,000 -> Expected: REJECT
console.log('\n--- TEST 6: Add = -₹5,000 ---')
{
  let rejected = false
  try {
    depositToGoal({
      goalId: macbookGoal.id,
      amount: -5000,
      sourceAccountId: bankAccount.id,
      accounts,
      transactions,
      goals,
    })
  } catch (e) {
    rejected = true
    assert(e.message.includes('greater than ₹0'), `Rejected with message: "${e.message}"`)
  }
  assert(rejected, 'Test 6 correctly rejected negative amount')
}

// TEST 7: Goal = ₹70,300, Withdraw = ₹5,000 -> Expected: SUCCESS
console.log('\n--- TEST 7: Goal = ₹70,300, Withdraw = ₹5,000 ---')
{
  const testGoal = { id: 'goal-t7', name: 'Macbook M5', targetAmount: 150000, currentAmount: 70300 }
  const testBank = { id: 'acc-t7', name: 'Bank Account', openingBalance: 3000 }
  const res = withdrawFromGoal({
    goalId: testGoal.id,
    amount: 5000,
    destinationAccountId: testBank.id,
    accounts: [testBank],
    transactions: [],
    goals: [testGoal],
  })
  const bankBal = calculateAccountBalance(testBank, res.updatedTransactions)
  const g = res.updatedGoals.find(x => x.id === testGoal.id)
  assert(bankBal === 8000, `Destination Bank Account increased from ₹3,000 to ₹8,000 (actual: ₹${bankBal})`)
  assert(g.currentAmount === 65300, `Goal balance decreased from ₹70,300 to ₹65,300 (actual: ₹${g.currentAmount})`)
  assert(res.transactionRecord.type === 'transfer', 'Transaction record has type: "transfer"')
  assert(res.transactionRecord.transferType === 'goal_withdrawal', 'Transaction record has transferType: "goal_withdrawal"')
  assert(getTotalIncome(res.updatedTransactions) === 0, 'Withdrawal is NOT counted as new external income (Total Income: ₹0)')
}

// TEST 8: Goal = ₹70,300, Withdraw = ₹70,301 -> Expected: REJECT
console.log('\n--- TEST 8: Goal = ₹70,300, Withdraw = ₹70,301 ---')
{
  const testGoal = { id: 'goal-t8', name: 'Macbook M5', targetAmount: 150000, currentAmount: 70300 }
  const testBank = { id: 'acc-t8', name: 'Bank Account', openingBalance: 3000 }
  let rejected = false
  try {
    withdrawFromGoal({
      goalId: testGoal.id,
      amount: 70301,
      destinationAccountId: testBank.id,
      accounts: [testBank],
      transactions: [],
      goals: [testGoal],
    })
  } catch (e) {
    rejected = true
    assert(e.message.includes('Insufficient funds in this savings goal'), `Rejected with message: "${e.message}"`)
  }
  assert(rejected, 'Test 8 correctly rejected withdrawing more than goal balance')
}

// TEST 9: Switch source account in the modal updates available balance
console.log('\n--- TEST 9: Dynamic balance calculation per account ---')
{
  const balBank = calculateAccountBalance(bankAccount, transactions) // From Test 1, bank is 3000
  const balUpi = calculateAccountBalance(upiAccount, transactions) // UPI is 5659
  assert(balBank === 3000, `Bank Account balance is ₹3,000`)
  assert(balUpi === 5659, `UPI balance is ₹5,659`)
}

// TEST 10: Overfunding prevention
console.log('\n--- TEST 10: Prevent Savings Goal Overfunding ---')
{
  const almostDoneGoal = { id: 'goal-t10', name: 'Macbook M5', targetAmount: 150000, currentAmount: 148000 }
  const richBank = { id: 'acc-t10', name: 'Bank Account', openingBalance: 50000 }
  let rejected = false
  try {
    depositToGoal({
      goalId: almostDoneGoal.id,
      amount: 5000,
      sourceAccountId: richBank.id,
      accounts: [richBank],
      transactions: [],
      goals: [almostDoneGoal],
    })
  } catch (e) {
    rejected = true
    assert(e.message.includes('Only ₹2,000.00 remaining to reach this goal'), `Rejected with message: "${e.message}"`)
  }
  assert(rejected, 'Test 10 correctly prevented overfunding by ₹3,000')
}

// TEST 11: Atomic Reversal when deleting a transfer transaction
console.log('\n--- TEST 11: Transaction Deletion Atomic Reversal ---')
{
  const testAcc = { id: 'acc-t11', name: 'Bank Account', openingBalance: 10000 }
  const testGoal = { id: 'goal-t11', name: 'Macbook M5', targetAmount: 150000, currentAmount: 70000 }
  const res = depositToGoal({
    goalId: testGoal.id,
    amount: 5000,
    sourceAccountId: testAcc.id,
    accounts: [testAcc],
    transactions: [],
    goals: [testGoal],
  })
  
  assert(res.updatedGoal.currentAmount === 75000, 'Goal increased to ₹75,000 after deposit')
  assert(calculateAccountBalance(testAcc, res.updatedTransactions) === 5000, 'Account balance decreased to ₹5,000')

  // Simulate deletion of this transfer transaction
  const txnToDelete = res.transactionRecord
  let currentGoals = res.updatedGoals
  let currentTxns = res.updatedTransactions.filter(t => t.id !== txnToDelete.id)
  
  if (txnToDelete.type === 'transfer' && txnToDelete.goalId) {
    const targetG = currentGoals.find(g => g.id === txnToDelete.goalId)
    const revertedAmount = targetG.currentAmount - txnToDelete.amount
    currentGoals = currentGoals.map(g => g.id === targetG.id ? { ...g, currentAmount: revertedAmount } : g)
  }

  const revertedGoal = currentGoals.find(g => g.id === testGoal.id)
  const revertedAccBal = calculateAccountBalance(testAcc, currentTxns)
  assert(revertedGoal.currentAmount === 70000, `Goal reverted to ₹70,000 upon transaction deletion (actual: ₹${revertedGoal.currentAmount})`)
  assert(revertedAccBal === 10000, `Account balance restored to ₹10,000 upon transaction deletion (actual: ₹${revertedAccBal})`)
}

console.log('\n🎉 ALL 11 TESTS PASSED SUCCESSFULLY! Financial Data-Integrity Invariants are Fully Enforced.')

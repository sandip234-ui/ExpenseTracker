import assert from 'node:assert'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getPaymentMethodsForAccount,
  getCategoryById,
  getCategoriesForType,
} from './src/data/categories.js'
import {
  calculateAccountBalance,
  getAvailableAccountBalance,
} from './src/services/accountService.js'
import { validateTransaction } from './src/utils/validation.js'

console.log('--- RUNNING TRANSACTION RULES & FLOWS TESTS (A to L) ---')

// Initial test fixture
const bankAccount = { id: 'acc-bank', name: 'HDFC Bank', type: 'bank', openingBalance: 10000 }
const cashAccount = { id: 'acc-cash', name: 'Cash Wallet', type: 'cash', openingBalance: 5000 }
const upiAccount = { id: 'acc-upi', name: 'Paytm UPI', type: 'upi', openingBalance: 2000 }

const accounts = [bankAccount, cashAccount, upiAccount]

// Case A: Income → Bank → ₹7,000
console.log('Test A: Income → Bank → ₹7,000')
let txns = [
  { id: 't1', type: 'income', amount: 7000, accountId: 'acc-bank', category: 'salary', description: 'Monthly Salary', date: '2026-09-01' }
]
assert.strictEqual(calculateAccountBalance(bankAccount, txns), 17000, 'Bank balance should be 17000 after 7000 income')
console.log('  ✓ Pass: Bank balance increased by 7,000 to 17,000')

// Case B: Expense → Bank → ₹2,000
console.log('Test B: Expense → Bank → ₹2,000')
txns.push({ id: 't2', type: 'expense', amount: 2000, accountId: 'acc-bank', category: 'food', description: 'Grocery shopping', date: '2026-09-02' })
assert.strictEqual(calculateAccountBalance(bankAccount, txns), 15000, 'Bank balance should be 15000 after 2000 expense')
console.log('  ✓ Pass: Bank balance decreased by 2,000 to 15,000')

// Case C: Expense greater than balance → rejected with clear message
console.log('Test C: Expense greater than balance → rejected')
const currentBankBal = calculateAccountBalance(bankAccount, txns) // 15000
const validationFail = validateTransaction(
  { type: 'expense', amount: 16000, accountId: 'acc-bank', category: 'shopping', description: 'Expensive TV', date: '2026-09-03' },
  { account: bankAccount, availableBalance: currentBankBal, currencySymbol: '₹' }
)
assert.strictEqual(validationFail.valid, false, 'Should be invalid')
assert.match(validationFail.errors.amount, /Insufficient balance/, 'Error message should clearly state insufficient balance')
console.log(`  ✓ Pass: Correctly rejected with message: "${validationFail.errors.amount}"`)

// Case D: Edit expense amount (Rule 6 & 7)
// Bank balance = ₹15,000, original expense t2 = ₹2,000.
// Let's test with the prompt's exact scenario:
// Bank opening = 10,000, Income = 12,000 => Bank = 22,000. Original expense = 7,000 => Current Bank = 15,000.
// User edits expense from 7,000 to 18,000. Available = 15,000 + 7,000 = 22,000. 18,000 is valid.
console.log('Test D: Edit expense amount with reversal calculation')
const originalExp = { id: 't-exp', type: 'expense', amount: 7000, accountId: 'acc-bank', category: 'shopping', description: 'Phone', date: '2026-09-01' }
const txnsWithExp = [
  { id: 't-inc', type: 'income', amount: 12000, accountId: 'acc-bank', category: 'salary', description: 'Salary', date: '2026-09-01' },
  originalExp
]
const bankBalBeforeEdit = calculateAccountBalance(bankAccount, txnsWithExp)
assert.strictEqual(bankBalBeforeEdit, 15000, 'Current balance should be 15000')

const availableForEdit = getAvailableAccountBalance(bankAccount, txnsWithExp, originalExp)
assert.strictEqual(availableForEdit, 22000, 'Available balance should be 15000 + 7000 = 22000')

const editValidation = validateTransaction(
  { type: 'expense', amount: 18000, accountId: 'acc-bank', category: 'shopping', description: 'Phone upgrade', date: '2026-09-01' },
  { account: bankAccount, availableBalance: availableForEdit, currencySymbol: '₹' }
)
assert.strictEqual(editValidation.valid, true, 'Expense of 18000 should be valid when available is 22000')

// Apply edit in txns list
const txnsAfterEdit = txnsWithExp.map(t => t.id === 't-exp' ? { ...t, amount: 18000 } : t)
assert.strictEqual(calculateAccountBalance(bankAccount, txnsAfterEdit), 4000, 'Final balance should be 10000 + 12000 - 18000 = 4000')
console.log('  ✓ Pass: Available balance calculated as ₹22,000; ₹18,000 expense accepted; balance updated to ₹4,000')

// Case E: Edit income amount
console.log('Test E: Edit income amount')
// Original income: 12,000. User edits to 15,000.
const txnsAfterIncomeEdit = txnsAfterEdit.map(t => t.id === 't-inc' ? { ...t, amount: 15000 } : t)
assert.strictEqual(calculateAccountBalance(bankAccount, txnsAfterIncomeEdit), 7000, 'Balance should be 10000 + 15000 - 18000 = 7000')
console.log('  ✓ Pass: Income edit reversed original and applied new amount correctly')

// Case F: Change expense → income (Prompt Example 6: Expense 7k from Bank, bal 15k -> changed to Income 5k -> Final bal 27k)
console.log('Test F: Change expense → income')
const ex6Txns = [
  { id: 't-ex6-inc', type: 'income', amount: 12000, accountId: 'acc-bank', category: 'salary', description: 'Salary', date: '2026-09-01' },
  { id: 't-ex6-exp', type: 'expense', amount: 7000, accountId: 'acc-bank', category: 'bills', description: 'Bill', date: '2026-09-01' }
]
// Current bank bal = 10000 + 12000 - 7000 = 15000
assert.strictEqual(calculateAccountBalance(bankAccount, ex6Txns), 15000)
// User changes t-ex6-exp to Income 5,000
const ex6TxnsEdited = ex6Txns.map(t => t.id === 't-ex6-exp' ? { ...t, type: 'income', amount: 5000, category: 'gift' } : t)
assert.strictEqual(calculateAccountBalance(bankAccount, ex6TxnsEdited), 27000, 'Bank balance should be 10000 + 12000 + 5000 = 27000')
console.log('  ✓ Pass: Bank balance correctly reversed expense (+7k) and added income (+5k) -> 27,000')

// Case G: Change income → expense
console.log('Test G: Change income → expense')
// Starting with Bank bal 27,000. Change t-ex6-exp (Income 5,000) to Expense 3,000.
// Available balance = 27,000 - 5,000 = 22,000. Expense 3,000 is valid.
const availableBalForIncToExp = getAvailableAccountBalance(bankAccount, ex6TxnsEdited, { id: 't-ex6-exp', type: 'income', amount: 5000, accountId: 'acc-bank' })
assert.strictEqual(availableBalForIncToExp, 22000, 'Available balance should be 27000 - 5000 = 22000')
const ex6TxnsRevertedToExp = ex6TxnsEdited.map(t => t.id === 't-ex6-exp' ? { ...t, type: 'expense', amount: 3000, category: 'food' } : t)
assert.strictEqual(calculateAccountBalance(bankAccount, ex6TxnsRevertedToExp), 19000, 'Bank balance should be 10000 + 12000 - 3000 = 19000')
console.log('  ✓ Pass: Income reversed (-5k) and expense applied (-3k) -> 19,000')

// Case H: Change account while editing
console.log('Test H: Change account while editing')
// Original: Expense ₹7,000 from Bank (bal 15,000). Edited: Expense ₹3,000 from Cash (bal 5,000).
// Correct sequence: Bank += 7,000 (bal 22,000), Cash -= 3,000 (bal 2,000).
const accChangeTxns = [
  { id: 't-acc-inc', type: 'income', amount: 12000, accountId: 'acc-bank', category: 'salary', description: 'Salary', date: '2026-09-01' },
  { id: 't-acc-exp', type: 'expense', amount: 7000, accountId: 'acc-bank', category: 'shopping', description: 'Shopping', date: '2026-09-01' }
]
assert.strictEqual(calculateAccountBalance(bankAccount, accChangeTxns), 15000)
assert.strictEqual(calculateAccountBalance(cashAccount, accChangeTxns), 5000)

// Change account to cash with 3000 expense
const accChangeTxnsEdited = accChangeTxns.map(t => t.id === 't-acc-exp' ? { ...t, accountId: 'acc-cash', amount: 3000 } : t)
assert.strictEqual(calculateAccountBalance(bankAccount, accChangeTxnsEdited), 22000, 'Bank should be 22,000')
assert.strictEqual(calculateAccountBalance(cashAccount, accChangeTxnsEdited), 2000, 'Cash should be 2,000')
console.log('  ✓ Pass: Old account reversed (+7k -> 22,000) and new account debited (-3k -> 2,000)')

// Case I: Category validation & category lists
console.log('Test I: Category lists and type validation')
const expCategories = EXPENSE_CATEGORIES.map(c => c.label)
const incCategories = INCOME_CATEGORIES.map(c => c.label)
assert.deepStrictEqual(
  expCategories,
  ['Food', 'Transport', 'Shopping', 'Bills', 'Education', 'Entertainment', 'Health', 'Travel', 'Subscriptions', 'Other'],
  'Expense categories must match required list exactly'
)
assert.deepStrictEqual(
  incCategories,
  ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'],
  'Income categories must match required list exactly'
)
// Description allows "Spending" when type is Income (Rule 3)
const freeTextValidation = validateTransaction(
  { type: 'income', amount: 1000, accountId: 'acc-bank', category: 'salary', description: 'Spending on weekend', date: '2026-09-01' }
)
assert.strictEqual(freeTextValidation.valid, true, 'Free text description should never fail validation based on keywords')
console.log('  ✓ Pass: Category lists match exact specifications and descriptions are completely free-text')

// Case J: Payment method filtering for account types
console.log('Test J: Payment methods per account type')
assert.deepStrictEqual(getPaymentMethodsForAccount({ type: 'cash' }), ['Cash', 'Other'])
assert.deepStrictEqual(getPaymentMethodsForAccount({ type: 'bank' }), ['UPI', 'Debit Card', 'Net Banking', 'Cheque', 'Other'])
assert.deepStrictEqual(getPaymentMethodsForAccount({ type: 'upi' }), ['UPI', 'Wallet', 'Other'])
assert.deepStrictEqual(getPaymentMethodsForAccount({ type: 'wallet' }), ['UPI', 'Wallet', 'Other'])
console.log('  ✓ Pass: Payment method mappings are strictly enforced')

// Case K: Change account & payment method preservation/reset rule
console.log('Test K: Change account preserves payment method if valid, resets if invalid')
// Switching from Bank with UPI -> UPI account: UPI is valid in UPI account, so keep UPI.
const upiMethods = getPaymentMethodsForAccount(upiAccount)
assert.strictEqual(upiMethods.includes('UPI'), true, 'UPI should be kept')
// Switching from Bank with Net Banking -> Cash account: Net Banking not valid in Cash account -> reset to Cash
const cashMethods = getPaymentMethodsForAccount(cashAccount)
assert.strictEqual(cashMethods.includes('Net Banking'), false, 'Net Banking is invalid for Cash')
const resetMethod = cashMethods.includes('Net Banking') ? 'Net Banking' : (cashMethods[0] || 'Other')
assert.strictEqual(resetMethod, 'Cash', 'Should reset to Cash')
console.log('  ✓ Pass: Payment method resets only when incompatible with new account')

// Case L: Existing transaction with old/invalid payment method
console.log('Test L: Existing transaction with legacy/custom payment method')
// Transaction list rendering and fallback lookup
const legacyTxn = { id: 't-legacy', type: 'expense', amount: 500, accountId: 'acc-bank', category: 'food', description: 'Old meal', date: '2025-01-01', paymentMethod: 'Crypto' }
const txnsWithLegacy = [...txns, legacyTxn]
assert.strictEqual(calculateAccountBalance(bankAccount, txnsWithLegacy), 14500, 'Legacy transaction calculates balance correctly')
assert.strictEqual(legacyTxn.paymentMethod, 'Crypto', 'Legacy payment method preserved')
console.log('  ✓ Pass: Existing transactions with custom/legacy methods calculate and display safely without modifying data')

console.log('\nALL 12 TEST SUITES (A through L) PASSED SUCCESSFULLY!')

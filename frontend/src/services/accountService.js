import { STORAGE_KEYS, safeRead, safeWrite, DEFAULT_ACCOUNTS } from './storageService.js'

export function getAccounts() {
  const accounts = safeRead(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS)
  if (!Array.isArray(accounts) || accounts.length === 0) return DEFAULT_ACCOUNTS
  return accounts
}

export function saveAccounts(accounts) {
  safeWrite(STORAGE_KEYS.ACCOUNTS, accounts)
  return accounts
}

export function addAccount(account) {
  const accounts = getAccounts()
  const updated = [...accounts, account]
  safeWrite(STORAGE_KEYS.ACCOUNTS, updated)
  return updated
}

export function updateAccount(id, updatedFields) {
  const accounts = getAccounts()
  const updated = accounts.map((a) => (a.id === id ? { ...a, ...updatedFields, id } : a))
  safeWrite(STORAGE_KEYS.ACCOUNTS, updated)
  return updated
}

export function deleteAccount(id) {
  const accounts = getAccounts()
  const updated = accounts.filter((a) => a.id !== id)
  safeWrite(STORAGE_KEYS.ACCOUNTS, updated)
  return updated
}

/**
 * Calculates current balance for an account dynamically:
 * opening balance + (income & goal withdrawals assigned to account) - (expenses & goal deposits assigned to account)
 */
export function calculateAccountBalance(account, transactions = []) {
  if (!account) return 0
  const opening = Number(account.openingBalance) || 0
  
  const accountTxns = transactions.filter((t) => t.accountId === account.id)
  const income = accountTxns
    .filter((t) => t.type === 'income' || t.transferType === 'goal_withdrawal')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const expenses = accountTxns
    .filter((t) => t.type === 'expense' || t.transferType === 'goal_deposit')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  return opening + income - expenses
}

/**
 * Returns total net worth across all accounts based on derived balances.
 */
export function getTotalNetWorth(accounts = [], transactions = []) {
  return accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc, transactions), 0)
}

/**
 * Calculates the available balance of an account when creating or editing a transaction.
 * If editing an existing transaction assigned to this account, the original transaction's
 * effect is reversed first so that the user can allocate those funds to the new amount.
 */
export function getAvailableAccountBalance(account, transactions = [], originalTxn = null) {
  if (!account) return 0
  const currentBalance = calculateAccountBalance(account, transactions)

  if (!originalTxn) {
    return currentBalance
  }

  // If editing an existing transaction assigned to this account
  if (originalTxn.accountId === account.id) {
    if (originalTxn.type === 'expense' || originalTxn.transferType === 'goal_deposit') {
      // Reversing the original expense adds back the funds
      return currentBalance + Number(originalTxn.amount || 0)
    }
    if (originalTxn.type === 'income' || originalTxn.transferType === 'goal_withdrawal') {
      // Reversing the original income subtracts the funds
      return currentBalance - Number(originalTxn.amount || 0)
    }
  }

  return currentBalance
}

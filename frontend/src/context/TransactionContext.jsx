import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  migrateStorage,
  getSettings,
  saveSettings as storageSaveSettings,
  clearAllData as storageClearAll,
  importBackupData,
  exportFullBackup,
  exportTransactionsToCSV,
} from '../services/storage'
import {
  getTransactions,
  addTransaction as storageAddTxn,
  updateTransaction as storageUpdateTxn,
  deleteTransaction as storageDeleteTxn,
} from '../services/storage'
import {
  getAccounts,
  addAccount as storageAddAccount,
  updateAccount as storageUpdateAccount,
  deleteAccount as storageDeleteAccount,
  calculateAccountBalance,
  getAvailableAccountBalance,
} from '../services/accountService'
import {
  getCustomCategories,
  addCategory as storageAddCategory,
  updateCategory as storageUpdateCategory,
  deleteCategory as storageDeleteCategory,
} from '../services/categoryService'
import {
  getBudgets,
  addBudget as storageAddBudget,
  updateBudget as storageUpdateBudget,
  deleteBudget as storageDeleteBudget,
} from '../services/budgetService'
import {
  getGoals,
  addGoal as storageAddGoal,
  updateGoal as storageUpdateGoal,
  deleteGoal as storageDeleteGoal,
  contributeToGoal as storageContributeGoal,
  depositToGoal as storageDepositGoal,
  withdrawFromGoal as storageWithdrawGoal,
} from '../services/goalService'
import {
  getRecurringTransactions,
  addRecurringTransaction as storageAddRec,
  updateRecurringTransaction as storageUpdateRec,
  deleteRecurringTransaction as storageDeleteRec,
  checkAndGenerateRecurringTransactions,
  saveRecurringTransactions,
} from '../services/recurringService'
import { generateSmartWarnings } from '../services/insightService'

// ─── Context ──────────────────────────────────────────────────────────────────

const TransactionContext = createContext(null)

// ─── Initial State & Reducer ──────────────────────────────────────────────────

const initialState = {
  transactions: [],
  accounts: [],
  customCategories: [],
  budgets: [],
  goals: [],
  recurring: [],
  settings: { currency: 'INR', currencySymbol: '₹', theme: 'light' },
  toast: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT_ALL_DATA':
      return {
        ...state,
        transactions: action.payload.transactions,
        accounts: action.payload.accounts,
        customCategories: action.payload.customCategories,
        budgets: action.payload.budgets,
        goals: action.payload.goals,
        recurring: action.payload.recurring,
        settings: action.payload.settings,
      }
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload }
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload }
    case 'SET_CATEGORIES':
      return { ...state, customCategories: action.payload }
    case 'SET_BUDGETS':
      return { ...state, budgets: action.payload }
    case 'SET_GOALS':
      return { ...state, goals: action.payload }
    case 'SET_RECURRING':
      return { ...state, recurring: action.payload }
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload }
    case 'SET_TOAST':
      return { ...state, toast: action.payload }
    case 'CLEAR_TOAST':
      return { ...state, toast: null }
    default:
      return state
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TransactionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const showToast = useCallback((message, variant = 'success') => {
    dispatch({ type: 'SET_TOAST', payload: { message, variant } })
  }, [])

  const clearToast = useCallback(() => {
    dispatch({ type: 'CLEAR_TOAST' })
  }, [])

  // ── Initial load & Migration & Recurring Processing ────────────────────────

  const reloadAll = useCallback(() => {
    migrateStorage()
    const txns = getTransactions()
    const accs = getAccounts()
    const cats = getCustomCategories()
    const bdgs = getBudgets()
    const gls = getGoals()
    const recs = getRecurringTransactions()
    const stgs = getSettings()

    // Process recurring transactions
    const { generatedTransactions, updatedRules, rulesChanged } = checkAndGenerateRecurringTransactions(
      recs,
      txns
    )

    let finalTxns = txns
    let finalRecs = recs

    if (generatedTransactions.length > 0) {
      generatedTransactions.forEach((t) => {
        finalTxns = [t, ...finalTxns]
      })
      storageSaveSettings(stgs)
      finalRecs = updatedRules
      saveRecurringTransactions(finalRecs)
      localStorage.setItem('fintrack_transactions', JSON.stringify(finalTxns))
      showToast(`Generated ${generatedTransactions.length} recurring transaction(s).`, 'info')
    } else if (rulesChanged) {
      finalRecs = updatedRules
      saveRecurringTransactions(finalRecs)
    }

    dispatch({
      type: 'INIT_ALL_DATA',
      payload: {
        transactions: finalTxns,
        accounts: accs,
        customCategories: cats,
        budgets: bdgs,
        goals: gls,
        recurring: finalRecs,
        settings: stgs,
      },
    })
  }, [showToast])

  useEffect(() => {
    reloadAll()
  }, [reloadAll])

  // ── Apply theme to document ────────────────────────────────────────────────

  useEffect(() => {
    const theme = state.settings?.theme || 'light'
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
        root.setAttribute('data-theme', 'dark')
      } else {
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
  }, [state.settings?.theme])

  // ── Transaction actions ────────────────────────────────────────────────────

  const addTransaction = useCallback((data) => {
    const defaultAccountId = state.accounts[0]?.id || 'account-cash'
    const accountId = data.accountId || defaultAccountId
    const account = state.accounts.find((a) => a.id === accountId)
    const amount = Number(data.amount)

    if (data.type === 'expense') {
      const available = calculateAccountBalance(account, state.transactions)
      if (amount > available) {
        const symbol = state.settings?.currencySymbol || '₹'
        const msg = `Insufficient balance. Available in ${account?.name || 'account'}: ${symbol}${Math.max(0, available).toFixed(2)}`
        showToast(msg, 'error')
        throw new Error(msg)
      }
    }

    const transaction = {
      id: uuidv4(),
      type: data.type,
      amount: Number(data.amount),
      description: String(data.description).trim(),
      category: data.category,
      accountId,
      date: data.date,
      paymentMethod: data.paymentMethod || 'Other',
      notes: data.notes ? String(data.notes).trim() : '',
      createdAt: new Date().toISOString(),
    }
    const updated = storageAddTxn(transaction)
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
    showToast('Transaction added successfully!', 'success')
    return transaction
  }, [state.accounts, state.transactions, state.settings?.currencySymbol, showToast])

  const updateTransaction = useCallback((id, data) => {
    const originalTxn = state.transactions.find((t) => t.id === id)
    if (!originalTxn) {
      showToast('Transaction not found.', 'error')
      throw new Error('Transaction not found')
    }

    const targetAccountId = data.accountId || originalTxn.accountId || state.accounts[0]?.id
    const targetAccount = state.accounts.find((a) => a.id === targetAccountId)
    const newAmount = Number(data.amount)
    const newType = data.type || originalTxn.type

    // If new transaction is an expense, validate against available balance after reversing original transaction
    if (newType === 'expense') {
      const available = getAvailableAccountBalance(targetAccount, state.transactions, originalTxn)
      if (newAmount > available) {
        const symbol = state.settings?.currencySymbol || '₹'
        const msg = `Insufficient balance. Available in ${targetAccount?.name || 'account'}: ${symbol}${Math.max(0, available).toFixed(2)}`
        showToast(msg, 'error')
        throw new Error(msg)
      }
    }

    const updatedTxnData = {
      ...originalTxn,
      ...data,
      id,
      amount: newAmount,
      type: newType,
      accountId: targetAccountId,
      description: String(data.description).trim(),
      category: data.category,
      paymentMethod: data.paymentMethod || 'Other',
      notes: data.notes ? String(data.notes).trim() : '',
    }

    const updated = storageUpdateTxn(id, updatedTxnData)
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
    showToast('Transaction updated successfully!', 'success')
    return updatedTxnData
  }, [state.transactions, state.accounts, state.settings?.currencySymbol, showToast])

  const deleteTransaction = useCallback((id) => {
    const txn = state.transactions.find((t) => t.id === id)
    if (txn && txn.type === 'transfer' && txn.goalId) {
      const currentGoals = getGoals()
      const targetGoal = currentGoals.find((g) => g.id === txn.goalId)
      if (targetGoal) {
        let newAmount = Number(targetGoal.currentAmount) || 0
        if (txn.transferType === 'goal_deposit') {
          newAmount = Math.max(0, newAmount - Number(txn.amount || 0))
        } else if (txn.transferType === 'goal_withdrawal') {
          newAmount = newAmount + Number(txn.amount || 0)
        }
        const updatedGoals = storageUpdateGoal(targetGoal.id, {
          name: targetGoal.name,
          targetAmount: targetGoal.targetAmount,
          currentAmount: newAmount,
        })
        dispatch({ type: 'SET_GOALS', payload: updatedGoals })
      }
    }
    const updated = storageDeleteTxn(id)
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
    showToast('Transaction deleted.', 'info')
  }, [state.transactions, showToast])

  const duplicateTransaction = useCallback((originalTxn) => {
    return {
      type: originalTxn.type,
      amount: originalTxn.amount,
      description: originalTxn.description,
      category: originalTxn.category,
      accountId: originalTxn.accountId,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: originalTxn.paymentMethod || 'Other',
      notes: originalTxn.notes || '',
    }
  }, [])

  const clearAllTransactions = useCallback(() => {
    storageClearAll()
    reloadAll()
    showToast('All application data cleared.', 'info')
  }, [reloadAll, showToast])

  // ── Account actions ────────────────────────────────────────────────────────

  const addAccount = useCallback((data) => {
    const account = {
      id: `acc-${uuidv4().slice(0, 8)}`,
      name: String(data.name).trim(),
      type: data.type || 'bank',
      openingBalance: Number(data.openingBalance) || 0,
      currency: data.currency || 'INR',
      icon: data.icon || '🏦',
      color: data.color || '#3B82F6',
      createdAt: new Date().toISOString(),
    }
    const updated = storageAddAccount(account)
    dispatch({ type: 'SET_ACCOUNTS', payload: updated })
    showToast('Account added successfully!', 'success')
    return account
  }, [showToast])

  const updateAccount = useCallback((id, data) => {
    const updated = storageUpdateAccount(id, {
      ...data,
      name: String(data.name).trim(),
      openingBalance: Number(data.openingBalance) || 0,
    })
    dispatch({ type: 'SET_ACCOUNTS', payload: updated })
    showToast('Account updated successfully!', 'success')
  }, [showToast])

  const deleteAccount = useCallback((id) => {
    if (state.accounts.length <= 1) {
      showToast('You must have at least one active account.', 'error')
      return
    }
    const updated = storageDeleteAccount(id)
    dispatch({ type: 'SET_ACCOUNTS', payload: updated })
    showToast('Account deleted.', 'info')
  }, [state.accounts, showToast])

  // ── Category actions ───────────────────────────────────────────────────────

  const addCategory = useCallback((data) => {
    const category = {
      id: `cat-${uuidv4().slice(0, 8)}`,
      label: String(data.label).trim(),
      icon: data.icon || '🏷️',
      color: data.color || '#6366F1',
      type: data.type || 'expense', // 'expense' | 'income' | 'both'
      isCustom: true,
      createdAt: new Date().toISOString(),
    }
    const updated = storageAddCategory(category)
    dispatch({ type: 'SET_CATEGORIES', payload: updated })
    showToast('Category created!', 'success')
    return category
  }, [showToast])

  const updateCategory = useCallback((id, data) => {
    const updated = storageUpdateCategory(id, {
      ...data,
      label: String(data.label).trim(),
    })
    dispatch({ type: 'SET_CATEGORIES', payload: updated })
    showToast('Category updated!', 'success')
  }, [showToast])

  const deleteCategory = useCallback((id, reassignTo = 'other') => {
    // Reassign affected transactions to replacement category
    const affectedTxns = state.transactions.filter((t) => t.category === id)
    if (affectedTxns.length > 0) {
      affectedTxns.forEach((t) => {
        storageUpdateTxn(t.id, { category: reassignTo })
      })
      dispatch({ type: 'SET_TRANSACTIONS', payload: getTransactions() })
    }

    const updated = storageDeleteCategory(id)
    dispatch({ type: 'SET_CATEGORIES', payload: updated })
    showToast(`Category removed. ${affectedTxns.length} transaction(s) moved to "${reassignTo}".`, 'info')
  }, [state.transactions, showToast])

  // ── Budget actions ─────────────────────────────────────────────────────────

  const addBudget = useCallback((data) => {
    const budget = {
      id: `budget-${uuidv4().slice(0, 8)}`,
      categoryId: data.categoryId,
      amount: Number(data.amount),
      month: data.month, // 'YYYY-MM'
      createdAt: new Date().toISOString(),
    }
    const updated = storageAddBudget(budget)
    dispatch({ type: 'SET_BUDGETS', payload: updated })
    showToast('Budget saved!', 'success')
    return budget
  }, [showToast])

  const updateBudget = useCallback((id, data) => {
    const updated = storageUpdateBudget(id, {
      ...data,
      amount: Number(data.amount),
    })
    dispatch({ type: 'SET_BUDGETS', payload: updated })
    showToast('Budget updated!', 'success')
  }, [showToast])

  const deleteBudget = useCallback((id) => {
    const updated = storageDeleteBudget(id)
    dispatch({ type: 'SET_BUDGETS', payload: updated })
    showToast('Budget removed.', 'info')
  }, [showToast])

  // ── Savings Goal actions ───────────────────────────────────────────────────

  const addGoal = useCallback((data) => {
    const goal = {
      id: `goal-${uuidv4().slice(0, 8)}`,
      name: String(data.name).trim(),
      targetAmount: Number(data.targetAmount),
      currentAmount: Number(data.currentAmount) || 0,
      targetDate: data.targetDate || '',
      icon: data.icon || '🎯',
      color: data.color || '#6366F1',
      createdAt: new Date().toISOString(),
    }
    const updated = storageAddGoal(goal)
    dispatch({ type: 'SET_GOALS', payload: updated })
    showToast('Savings goal created!', 'success')
    return goal
  }, [showToast])

  const updateGoal = useCallback((id, data) => {
    const updated = storageUpdateGoal(id, {
      ...data,
      name: String(data.name).trim(),
      targetAmount: Number(data.targetAmount),
      currentAmount: Number(data.currentAmount),
    })
    dispatch({ type: 'SET_GOALS', payload: updated })
    showToast('Goal updated!', 'success')
  }, [showToast])

  const deleteGoal = useCallback((id) => {
    const updated = storageDeleteGoal(id)
    dispatch({ type: 'SET_GOALS', payload: updated })
    showToast('Savings goal removed.', 'info')
  }, [showToast])

  const depositToGoal = useCallback(
    ({ goalId, amount, sourceAccountId, notes }) => {
      try {
        const result = storageDepositGoal({
          goalId,
          amount,
          sourceAccountId,
          accounts: state.accounts,
          transactions: state.transactions,
          goals: state.goals,
        })
        dispatch({ type: 'SET_GOALS', payload: result.updatedGoals })
        dispatch({ type: 'SET_TRANSACTIONS', payload: result.updatedTransactions })
        showToast(
          `Added ₹${Number(amount).toLocaleString('en-IN')} to "${result.updatedGoal.name}" from ${result.sourceAccount.name}!`,
          'success'
        )
        return result
      } catch (err) {
        showToast(err.message, 'error')
        throw err
      }
    },
    [state.accounts, state.transactions, state.goals, showToast]
  )

  const withdrawFromGoal = useCallback(
    ({ goalId, amount, destinationAccountId, notes }) => {
      try {
        const result = storageWithdrawGoal({
          goalId,
          amount,
          destinationAccountId,
          accounts: state.accounts,
          transactions: state.transactions,
          goals: state.goals,
        })
        dispatch({ type: 'SET_GOALS', payload: result.updatedGoals })
        dispatch({ type: 'SET_TRANSACTIONS', payload: result.updatedTransactions })
        showToast(
          `Withdrew ₹${Number(amount).toLocaleString('en-IN')} from "${result.updatedGoal.name}" to ${result.destinationAccount.name}.`,
          'success'
        )
        return result
      } catch (err) {
        showToast(err.message, 'error')
        throw err
      }
    },
    [state.accounts, state.transactions, state.goals, showToast]
  )

  const contributeGoal = useCallback(
    (id, deltaAmount, accountId = null) => {
      const numDelta = Number(deltaAmount)
      if (numDelta > 0) {
        const sourceAcc = accountId || state.accounts[0]?.id
        return depositToGoal({ goalId: id, amount: numDelta, sourceAccountId: sourceAcc })
      } else if (numDelta < 0) {
        const destAcc = accountId || state.accounts[0]?.id
        return withdrawFromGoal({ goalId: id, amount: Math.abs(numDelta), destinationAccountId: destAcc })
      }
    },
    [state.accounts, depositToGoal, withdrawFromGoal]
  )

  // ── Recurring actions ──────────────────────────────────────────────────────

  const addRecurring = useCallback((data) => {
    const defaultAccountId = state.accounts[0]?.id || 'account-cash'
    const rule = {
      id: `rec-${uuidv4().slice(0, 8)}`,
      type: data.type || 'expense',
      description: String(data.description).trim(),
      amount: Number(data.amount),
      categoryId: data.categoryId || 'other',
      accountId: data.accountId || defaultAccountId,
      frequency: data.frequency || 'monthly',
      startDate: data.startDate,
      nextOccurrence: data.nextOccurrence || data.startDate,
      endDate: data.endDate || null,
      active: data.active !== undefined ? data.active : true,
      lastGeneratedDate: null,
      createdAt: new Date().toISOString(),
    }
    const updated = storageAddRec(rule)
    dispatch({ type: 'SET_RECURRING', payload: updated })
    showToast('Recurring transaction schedule saved!', 'success')
    return rule
  }, [state.accounts, showToast])

  const updateRecurring = useCallback((id, data) => {
    const updated = storageUpdateRec(id, {
      ...data,
      amount: Number(data.amount),
      description: String(data.description).trim(),
    })
    dispatch({ type: 'SET_RECURRING', payload: updated })
    showToast('Recurring schedule updated!', 'success')
  }, [showToast])

  const deleteRecurring = useCallback((id) => {
    const updated = storageDeleteRec(id)
    dispatch({ type: 'SET_RECURRING', payload: updated })
    showToast('Recurring schedule deleted.', 'info')
  }, [showToast])

  // ── Settings actions ───────────────────────────────────────────────────────

  const updateSettings = useCallback((newSettings) => {
    const saved = storageSaveSettings(newSettings)
    dispatch({ type: 'SET_SETTINGS', payload: saved })
    showToast('Settings saved.', 'success')
    return saved
  }, [showToast])

  // ── Import / Export ────────────────────────────────────────────────────────

  const importData = useCallback((jsonString) => {
    const result = importBackupData(jsonString)
    if (result.success) {
      reloadAll()
      showToast(`Imported ${result.importedTxnsCount} new transaction(s) & settings.`, 'success')
    } else {
      showToast(result.error, 'error')
    }
    return result
  }, [reloadAll, showToast])

  const exportCSV = useCallback((filteredTransactions = null) => {
    const list = filteredTransactions || state.transactions
    const csv = exportTransactionsToCSV(list, state.accounts, state.customCategories)
    const date = new Date().toISOString().split('T')[0]
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fintrack-transactions-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${list.length} transactions as CSV.`, 'success')
  }, [state.transactions, state.accounts, state.customCategories, showToast])

  const exportJSON = useCallback(() => {
    const json = exportFullBackup()
    const date = new Date().toISOString().split('T')[0]
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fintrack-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Complete backup exported as JSON.', 'success')
  }, [showToast])

  // ── Smart Warnings (derived dynamically) ───────────────────────────────────

  const warnings = generateSmartWarnings({
    transactions: state.transactions,
    budgets: state.budgets,
    accounts: state.accounts,
    recurring: state.recurring,
    goals: state.goals,
    customCategories: state.customCategories,
  })

  // ── Context value ──────────────────────────────────────────────────────────

  const value = {
    // Entities
    transactions: state.transactions,
    accounts: state.accounts,
    customCategories: state.customCategories,
    budgets: state.budgets,
    goals: state.goals,
    recurring: state.recurring,
    settings: state.settings,
    warnings,
    toast: state.toast,

    // Transaction Actions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    duplicateTransaction,
    clearAllTransactions,

    // Account Actions
    addAccount,
    updateAccount,
    deleteAccount,

    // Category Actions
    addCategory,
    updateCategory,
    deleteCategory,

    // Budget Actions
    addBudget,
    updateBudget,
    deleteBudget,

    // Goal Actions
    addGoal,
    updateGoal,
    deleteGoal,
    contributeGoal,
    depositToGoal,
    withdrawFromGoal,

    // Recurring Actions
    addRecurring,
    updateRecurring,
    deleteRecurring,

    // Settings Actions
    updateSettings,

    // Export / Import
    importData,
    exportCSV,
    exportJSON,

    // Toast
    showToast,
    clearToast,
    reloadAll,
  }

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTransactions() {
  const ctx = useContext(TransactionContext)
  if (!ctx) throw new Error('useTransactions must be used inside <TransactionProvider>')
  return ctx
}

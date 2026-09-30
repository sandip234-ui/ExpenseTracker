import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { exportTransactionsToCSV, getSettings } from '../services/storage'
import {
  calculateAccountBalance,
  getAvailableAccountBalance,
} from '../services/accountService'
import { generateSmartWarnings } from '../services/insightService'
import { dataProvider, isApiMode, DATA_SOURCE, localProvider } from '../services/dataProvider'
import { useAuth } from './AuthContext'

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
  settings: getSettings(),
  toast: null,
  isLoading: false,
  error: null,
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
        isLoading: false,
        error: null,
      }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
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
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const showToast = useCallback((message, variant = 'success') => {
    dispatch({ type: 'SET_TOAST', payload: { message, variant } })
  }, [])

  const clearToast = useCallback(() => {
    dispatch({ type: 'CLEAR_TOAST' })
  }, [])

  // ── Initial load & Migration & Data Provider Integration ───────────────────

  const reloadAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    if (!isApiMode()) {
      // Local Mode: Fallback provider for isolated offline testing
      try {
        localProvider.migrateStorage()
        const [accs, txns, cats, bdgs, gls, recs] = await Promise.all([
          localProvider.getAccounts(),
          localProvider.getTransactions(),
          localProvider.getCategories(),
          localProvider.getBudgets(),
          localProvider.getGoals(),
          localProvider.getRecurring(),
        ])
        const stgs = await localProvider.getSettings()
        const customCats = cats.filter((c) => c.isCustom)

        dispatch({
          type: 'INIT_ALL_DATA',
          payload: {
            transactions: txns,
            accounts: accs,
            customCategories: customCats,
            budgets: bdgs,
            goals: gls,
            recurring: recs,
            settings: stgs,
          },
        })
      } catch (err) {
        console.error('[TransactionContext] Error in local mode:', err)
        dispatch({ type: 'SET_ERROR', payload: err.message })
      }
    } else {
      // API Mode: Fetch authoritative state from REST API
      try {
        const [accs, txns, cats, bdgs, gls, recs] = await Promise.all([
          dataProvider.getAccounts(),
          dataProvider.getTransactions(),
          dataProvider.getCategories(),
          dataProvider.getBudgets(),
          dataProvider.getGoals(),
          dataProvider.getRecurring(),
        ])
        const stgs = await dataProvider.getSettings()
        const customCats = cats.filter((c) => c.isCustom)

        dispatch({
          type: 'INIT_ALL_DATA',
          payload: {
            transactions: txns,
            accounts: accs,
            customCategories: customCats,
            budgets: bdgs,
            goals: gls,
            recurring: recs,
            settings: stgs,
          },
        })
      } catch (err) {
        console.error('[TransactionContext] Error loading data from FinTrack API:', err)
        dispatch({ type: 'SET_ERROR', payload: err.message })
        showToast(err.message || 'Failed to connect to backend server.', 'error')
      }
    }
  }, [showToast])

  useEffect(() => {
    if (authLoading) return
    if (!isApiMode() || isAuthenticated) {
      reloadAll()
    } else {
      dispatch({
        type: 'INIT_ALL_DATA',
        payload: {
          transactions: [],
          accounts: [],
          customCategories: [],
          budgets: [],
          goals: [],
          recurring: [],
          settings: getSettings(),
        },
      })
    }
  }, [authLoading, isAuthenticated, reloadAll])

  // ── Apply theme to document ────────────────────────────────────────────────

  useEffect(() => {
    const theme = state.settings?.theme || 'light'
    const root = document.documentElement

    const applyTheme = () => {
      let isDark = false
      if (theme === 'dark') {
        isDark = true
      } else if (theme === 'system') {
        isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      } else {
        isDark = false
      }

      if (isDark) {
        root.classList.add('dark')
        root.setAttribute('data-theme', 'dark')
      } else {
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
    }

    applyTheme()

    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme()
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handler)
        return () => mediaQuery.removeListener(handler)
      }
    }
  }, [state.settings?.theme])

  // ── Transaction actions ────────────────────────────────────────────────────

  const addTransaction = useCallback(
    async (data) => {
      const defaultAccountId = state.accounts[0]?.id || 'account-cash'
      const accountId = data.accountId || defaultAccountId
      const account = state.accounts.find((a) => a.id === accountId)
      const amount = Number(data.amount)

      // UI-level client check
      if (data.type === 'expense' && !isApiMode()) {
        const available = calculateAccountBalance(account, state.transactions)
        if (amount > available) {
          const symbol = state.settings?.currencySymbol || '₹'
          const msg = `Insufficient balance. Available in ${account?.name || 'account'}: ${symbol}${Math.max(0, available).toFixed(2)}`
          showToast(msg, 'error')
          throw new Error(msg)
        }
      }

      if (!isApiMode()) {
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
        const updated = await localProvider.createTransaction(transaction)
        dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
        showToast('Transaction added successfully!', 'success')
        return transaction
      } else {
        // API Mode
        try {
          const created = await dataProvider.createTransaction({
            ...data,
            accountId,
          })
          const updatedTxns = [created, ...state.transactions]
          dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTxns })

          // Refresh accounts to sync authoritative backend balances
          const freshAccounts = await dataProvider.getAccounts()
          dispatch({ type: 'SET_ACCOUNTS', payload: freshAccounts })

          showToast('Transaction added successfully!', 'success')
          return created
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.accounts, state.transactions, state.settings?.currencySymbol, showToast]
  )

  const updateTransaction = useCallback(
    async (id, data) => {
      const originalTxn = state.transactions.find((t) => t.id === id)
      if (!originalTxn && !isApiMode()) {
        showToast('Transaction not found.', 'error')
        throw new Error('Transaction not found')
      }

      const targetAccountId = data.accountId || originalTxn?.accountId || state.accounts[0]?.id
      const targetAccount = state.accounts.find((a) => a.id === targetAccountId)
      const newAmount = Number(data.amount)
      const newType = data.type || originalTxn?.type

      if (!isApiMode()) {
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

        const updated = await localProvider.updateTransaction(id, updatedTxnData)
        dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
        showToast('Transaction updated successfully!', 'success')
        return updatedTxnData
      } else {
        // API Mode: Backend executes atomic reversal logic
        try {
          const updated = await dataProvider.updateTransaction(id, {
            ...data,
            accountId: targetAccountId,
          })
          const updatedTxns = state.transactions.map((t) => (t.id === id ? updated : t))
          dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTxns })

          // Refresh accounts to reflect updated balance
          const freshAccounts = await dataProvider.getAccounts()
          dispatch({ type: 'SET_ACCOUNTS', payload: freshAccounts })

          showToast('Transaction updated successfully!', 'success')
          return updated
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.transactions, state.accounts, state.settings?.currencySymbol, showToast]
  )

  const deleteTransaction = useCallback(
    async (id) => {
      if (!isApiMode()) {
        const txn = state.transactions.find((t) => t.id === id)
        if (txn && txn.type === 'transfer' && txn.goalId) {
          const currentGoals = await localProvider.getGoals()
          const targetGoal = currentGoals.find((g) => g.id === txn.goalId)
          if (targetGoal) {
            let newAmount = Number(targetGoal.currentAmount) || 0
            if (txn.transferType === 'goal_deposit') {
              newAmount = Math.max(0, newAmount - Number(txn.amount || 0))
            } else if (txn.transferType === 'goal_withdrawal') {
              newAmount = newAmount + Number(txn.amount || 0)
            }
            const updatedGoals = await localProvider.updateGoal(targetGoal.id, {
              name: targetGoal.name,
              targetAmount: targetGoal.targetAmount,
              currentAmount: newAmount,
            })
            dispatch({ type: 'SET_GOALS', payload: updatedGoals })
          }
        }
        const updated = await localProvider.deleteTransaction(id)
        dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
        showToast('Transaction deleted.', 'info')
      } else {
        // API Mode: Backend handles atomic reversal of transactions and goal effects
        try {
          await dataProvider.deleteTransaction(id)
          const updatedTxns = state.transactions.filter((t) => t.id !== id)
          dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTxns })

          // Sync refreshed accounts and goals
          const [freshAccounts, freshGoals] = await Promise.all([
            dataProvider.getAccounts(),
            dataProvider.getGoals(),
          ])
          dispatch({ type: 'SET_ACCOUNTS', payload: freshAccounts })
          dispatch({ type: 'SET_GOALS', payload: freshGoals })

          showToast('Transaction deleted.', 'info')
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.transactions, showToast]
  )

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
    if (!isApiMode()) {
      localProvider.clearAllData()
      reloadAll()
      showToast('All application data cleared.', 'info')
    } else {
      showToast('Clearing all data is disabled in API mode.', 'warning')
    }
  }, [reloadAll, showToast])

  // ── Account actions ────────────────────────────────────────────────────────

  const addAccount = useCallback(
    async (data) => {
      if (!isApiMode()) {
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
        const updated = await localProvider.createAccount(account)
        dispatch({ type: 'SET_ACCOUNTS', payload: updated })
        showToast('Account added successfully!', 'success')
        return account
      } else {
        try {
          const created = await dataProvider.createAccount(data)
          dispatch({ type: 'SET_ACCOUNTS', payload: [...state.accounts, created] })
          showToast('Account added successfully!', 'success')
          return created
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.accounts, showToast]
  )

  const updateAccount = useCallback(
    async (id, data) => {
      if (!isApiMode()) {
        const updated = await localProvider.updateAccount(id, {
          ...data,
          name: String(data.name).trim(),
          openingBalance: Number(data.openingBalance) || 0,
        })
        dispatch({ type: 'SET_ACCOUNTS', payload: updated })
        showToast('Account updated successfully!', 'success')
      } else {
        try {
          const updated = await dataProvider.updateAccount(id, data)
          dispatch({
            type: 'SET_ACCOUNTS',
            payload: state.accounts.map((a) => (a.id === id ? updated : a)),
          })
          showToast('Account updated successfully!', 'success')
          return updated
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.accounts, showToast]
  )

  const deleteAccount = useCallback(
    async (id) => {
      if (state.accounts.length <= 1) {
        showToast('You must have at least one active account.', 'error')
        return
      }
      if (!isApiMode()) {
        const updated = await localProvider.deleteAccount(id)
        dispatch({ type: 'SET_ACCOUNTS', payload: updated })
        showToast('Account deleted.', 'info')
      } else {
        try {
          await dataProvider.deleteAccount(id)
          dispatch({
            type: 'SET_ACCOUNTS',
            payload: state.accounts.filter((a) => a.id !== id),
          })
          showToast('Account deleted.', 'info')
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.accounts, showToast]
  )

  // ── Category actions ───────────────────────────────────────────────────────

  const addCategory = useCallback(
    async (data) => {
      if (!isApiMode()) {
        const category = {
          id: `cat-${uuidv4().slice(0, 8)}`,
          label: String(data.label).trim(),
          icon: data.icon || '🏷️',
          color: data.color || '#6366F1',
          type: data.type || 'expense',
          isCustom: true,
          createdAt: new Date().toISOString(),
        }
        const updated = await localProvider.createCategory(category)
        dispatch({ type: 'SET_CATEGORIES', payload: updated })
        showToast('Category created!', 'success')
        return category
      } else {
        try {
          const created = await dataProvider.createCategory(data)
          dispatch({
            type: 'SET_CATEGORIES',
            payload: [...state.customCategories, created],
          })
          showToast('Category created!', 'success')
          return created
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.customCategories, showToast]
  )

  const updateCategory = useCallback(
    async (id, data) => {
      if (!isApiMode()) {
        const updated = await localProvider.updateCategory(id, {
          ...data,
          label: String(data.label).trim(),
        })
        dispatch({ type: 'SET_CATEGORIES', payload: updated })
        showToast('Category updated!', 'success')
      } else {
        try {
          const updated = await dataProvider.updateCategory(id, data)
          dispatch({
            type: 'SET_CATEGORIES',
            payload: state.customCategories.map((c) => (c.id === id ? updated : c)),
          })
          showToast('Category updated!', 'success')
          return updated
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.customCategories, showToast]
  )

  const deleteCategory = useCallback(
    async (id, reassignTo = 'other') => {
      if (!isApiMode()) {
        const affectedTxns = state.transactions.filter((t) => t.category === id)
        if (affectedTxns.length > 0) {
          for (const t of affectedTxns) {
            await localProvider.updateTransaction(t.id, { category: reassignTo })
          }
          const freshTxns = await localProvider.getTransactions()
          dispatch({ type: 'SET_TRANSACTIONS', payload: freshTxns })
        }
        const updated = await localProvider.deleteCategory(id)
        dispatch({ type: 'SET_CATEGORIES', payload: updated })
        showToast(`Category removed. ${affectedTxns.length} transaction(s) moved to "${reassignTo}".`, 'info')
      } else {
        try {
          await dataProvider.deleteCategory(id, reassignTo)
          dispatch({
            type: 'SET_CATEGORIES',
            payload: state.customCategories.filter((c) => c.id !== id),
          })
          showToast('Category removed.', 'info')
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.transactions, state.customCategories, showToast]
  )

  // ── Budget actions ─────────────────────────────────────────────────────────

  const addBudget = useCallback(
    async (data) => {
      if (!isApiMode()) {
        const budget = {
          id: `budget-${uuidv4().slice(0, 8)}`,
          categoryId: data.categoryId,
          amount: Number(data.amount),
          month: data.month,
          createdAt: new Date().toISOString(),
        }
        const updated = await localProvider.createBudget(budget)
        dispatch({ type: 'SET_BUDGETS', payload: updated })
        showToast('Budget saved!', 'success')
        return budget
      } else {
        try {
          const created = await dataProvider.createBudget(data)
          const updated = state.budgets.filter((b) => b.id !== created.id).concat(created)
          dispatch({ type: 'SET_BUDGETS', payload: updated })
          showToast('Budget saved!', 'success')
          return created
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.budgets, showToast]
  )

  const updateBudget = useCallback(
    async (id, data) => {
      if (!isApiMode()) {
        const updated = await localProvider.updateBudget(id, {
          ...data,
          amount: Number(data.amount),
        })
        dispatch({ type: 'SET_BUDGETS', payload: updated })
        showToast('Budget updated!', 'success')
      } else {
        try {
          const updated = await dataProvider.updateBudget(id, data)
          dispatch({
            type: 'SET_BUDGETS',
            payload: state.budgets.map((b) => (b.id === id ? updated : b)),
          })
          showToast('Budget updated!', 'success')
          return updated
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.budgets, showToast]
  )

  const deleteBudget = useCallback(
    async (id) => {
      if (!isApiMode()) {
        const updated = await localProvider.deleteBudget(id)
        dispatch({ type: 'SET_BUDGETS', payload: updated })
        showToast('Budget removed.', 'info')
      } else {
        try {
          await dataProvider.deleteBudget(id)
          dispatch({
            type: 'SET_BUDGETS',
            payload: state.budgets.filter((b) => b.id !== id),
          })
          showToast('Budget removed.', 'info')
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.budgets, showToast]
  )

  // ── Savings Goal actions ───────────────────────────────────────────────────

  const addGoal = useCallback(
    async (data) => {
      if (!isApiMode()) {
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
        const updated = await localProvider.createGoal(goal)
        dispatch({ type: 'SET_GOALS', payload: updated })
        showToast('Savings goal created!', 'success')
        return goal
      } else {
        try {
          const created = await dataProvider.createGoal(data)
          dispatch({ type: 'SET_GOALS', payload: [...state.goals, created] })
          showToast('Savings goal created!', 'success')
          return created
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.goals, showToast]
  )

  const updateGoal = useCallback(
    async (id, data) => {
      if (!isApiMode()) {
        const updated = await localProvider.updateGoal(id, {
          ...data,
          name: String(data.name).trim(),
          targetAmount: Number(data.targetAmount),
          currentAmount: Number(data.currentAmount),
        })
        dispatch({ type: 'SET_GOALS', payload: updated })
        showToast('Goal updated!', 'success')
      } else {
        try {
          const updated = await dataProvider.updateGoal(id, data)
          dispatch({
            type: 'SET_GOALS',
            payload: state.goals.map((g) => (g.id === id ? updated : g)),
          })
          showToast('Goal updated!', 'success')
          return updated
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.goals, showToast]
  )

  const deleteGoal = useCallback(
    async (id) => {
      if (!isApiMode()) {
        const updated = await localProvider.deleteGoal(id)
        dispatch({ type: 'SET_GOALS', payload: updated })
        showToast('Savings goal removed.', 'info')
      } else {
        try {
          await dataProvider.deleteGoal(id)
          dispatch({
            type: 'SET_GOALS',
            payload: state.goals.filter((g) => g.id !== id),
          })
          showToast('Savings goal removed.', 'info')
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.goals, showToast]
  )

  const depositToGoal = useCallback(
    async ({ goalId, amount, sourceAccountId, notes }) => {
      if (!isApiMode()) {
        try {
          const result = await localProvider.depositToGoal({
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
      } else {
        // API Mode: Backend validates overfunding, account balance, updates ledger atomically
        try {
          const result = await dataProvider.depositToGoal({
            goalId,
            amount,
            sourceAccountId,
            notes,
          })
          const updatedGoals = state.goals.map((g) => (g.id === goalId ? result.goal : g))
          const updatedTxns = [result.transaction, ...state.transactions]
          dispatch({ type: 'SET_GOALS', payload: updatedGoals })
          dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTxns })

          const freshAccounts = await dataProvider.getAccounts()
          dispatch({ type: 'SET_ACCOUNTS', payload: freshAccounts })

          showToast(
            `Added ₹${Number(amount).toLocaleString('en-IN')} to "${result.goal.name}"!`,
            'success'
          )
          return result
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.accounts, state.transactions, state.goals, showToast]
  )

  const withdrawFromGoal = useCallback(
    async ({ goalId, amount, destinationAccountId, notes }) => {
      if (!isApiMode()) {
        try {
          const result = await localProvider.withdrawFromGoal({
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
      } else {
        // API Mode: Backend validates goal balance, updates ledger atomically
        try {
          const result = await dataProvider.withdrawFromGoal({
            goalId,
            amount,
            destinationAccountId,
            notes,
          })
          const updatedGoals = state.goals.map((g) => (g.id === goalId ? result.goal : g))
          const updatedTxns = [result.transaction, ...state.transactions]
          dispatch({ type: 'SET_GOALS', payload: updatedGoals })
          dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTxns })

          const freshAccounts = await dataProvider.getAccounts()
          dispatch({ type: 'SET_ACCOUNTS', payload: freshAccounts })

          showToast(
            `Withdrew ₹${Number(amount).toLocaleString('en-IN')} from "${result.goal.name}"!`,
            'success'
          )
          return result
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.accounts, state.transactions, state.goals, showToast]
  )

  const contributeGoal = useCallback(
    async (id, deltaAmount, accountId = null) => {
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

  const addRecurring = useCallback(
    async (data) => {
      const defaultAccountId = state.accounts[0]?.id || 'account-cash'
      if (!isApiMode()) {
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
        const updated = await localProvider.createRecurring(rule)
        dispatch({ type: 'SET_RECURRING', payload: updated })
        showToast('Recurring transaction schedule saved!', 'success')
        return rule
      } else {
        try {
          const created = await dataProvider.createRecurring({
            ...data,
            accountId: data.accountId || defaultAccountId,
            categoryId: data.categoryId || data.category || 'other',
          })
          dispatch({ type: 'SET_RECURRING', payload: [...state.recurring, created] })
          showToast('Recurring transaction schedule saved!', 'success')
          return created
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.accounts, state.recurring, showToast]
  )

  const updateRecurring = useCallback(
    async (id, data) => {
      if (!isApiMode()) {
        const updated = await localProvider.updateRecurring(id, {
          ...data,
          amount: Number(data.amount),
          description: String(data.description).trim(),
        })
        dispatch({ type: 'SET_RECURRING', payload: updated })
        showToast('Recurring schedule updated!', 'success')
      } else {
        try {
          const updated = await dataProvider.updateRecurring(id, data)
          dispatch({
            type: 'SET_RECURRING',
            payload: state.recurring.map((r) => (r.id === id ? updated : r)),
          })
          showToast('Recurring schedule updated!', 'success')
          return updated
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.recurring, showToast]
  )

  const deleteRecurring = useCallback(
    async (id) => {
      if (!isApiMode()) {
        const updated = await localProvider.deleteRecurring(id)
        dispatch({ type: 'SET_RECURRING', payload: updated })
        showToast('Recurring schedule deleted.', 'info')
      } else {
        try {
          await dataProvider.deleteRecurring(id)
          dispatch({
            type: 'SET_RECURRING',
            payload: state.recurring.filter((r) => r.id !== id),
          })
          showToast('Recurring schedule deleted.', 'info')
        } catch (err) {
          showToast(err.message, 'error')
          throw err
        }
      }
    },
    [state.recurring, showToast]
  )

  // ── Settings actions ───────────────────────────────────────────────────────

  const updateSettings = useCallback(
    async (newSettings) => {
      const saved = await dataProvider.updateSettings(newSettings)
      dispatch({ type: 'SET_SETTINGS', payload: saved })
      showToast('Settings saved.', 'success')
      return saved
    },
    [showToast]
  )

  // ── Import / Export ────────────────────────────────────────────────────────

  const importData = useCallback(
    (jsonString) => {
      if (isApiMode()) {
        showToast('Direct LocalStorage import is disabled in API mode. Please use migration tooling scripts.', 'warning')
        return { success: false, error: 'Importing directly into client is disabled in API mode. Use migration scripts.' }
      }
      const result = localProvider.importBackupData(jsonString)
      if (result.success) {
        reloadAll()
        showToast(`Imported ${result.importedTxnsCount} new transaction(s) & settings.`, 'success')
      } else {
        showToast(result.error, 'error')
      }
      return result
    },
    [reloadAll, showToast]
  )

  const exportCSV = useCallback(
    (filteredTransactions = null) => {
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
    },
    [state.transactions, state.accounts, state.customCategories, showToast]
  )

  const exportJSON = useCallback(() => {
    let json
    if (isApiMode()) {
      json = JSON.stringify(
        {
          version: 2,
          source: 'fintrack-api',
          exportedAt: new Date().toISOString(),
          transactions: state.transactions,
          categories: state.customCategories,
          budgets: state.budgets,
          accounts: state.accounts,
          goals: state.goals,
          recurringTransactions: state.recurring,
          settings: state.settings,
        },
        null,
        2
      )
    } else {
      json = localProvider.exportFullBackup()
    }
    const date = new Date().toISOString().split('T')[0]
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fintrack-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Complete backup exported as JSON.', 'success')
  }, [
    state.transactions,
    state.accounts,
    state.customCategories,
    state.budgets,
    state.goals,
    state.recurring,
    state.settings,
    showToast,
  ])

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
    isLoading: state.isLoading,
    error: state.error,
    dataSource: DATA_SOURCE,
    isApiMode: isApiMode(),

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

    // Toast & Refresh
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

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  getTransactions,
  addTransaction as storageAdd,
  updateTransaction as storageUpdate,
  deleteTransaction as storageDelete,
  clearTransactions as storageClear,
  importTransactions as storageImport,
  getSettings,
  saveSettings as storageSaveSettings,
} from '../services/storage'

// ─── Context ──────────────────────────────────────────────────────────────────

const TransactionContext = createContext(null)

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload }
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
  const [state, dispatch] = useReducer(reducer, {
    transactions: [],
    settings: getSettings(),
    toast: null,
  })

  // Load transactions from storage on mount
  useEffect(() => {
    dispatch({ type: 'SET_TRANSACTIONS', payload: getTransactions() })
  }, [])

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const showToast = useCallback((message, variant = 'success') => {
    dispatch({ type: 'SET_TOAST', payload: { message, variant } })
  }, [])

  const clearToast = useCallback(() => {
    dispatch({ type: 'CLEAR_TOAST' })
  }, [])

  // ── Transaction actions ────────────────────────────────────────────────────

  const addTransaction = useCallback((data) => {
    const transaction = {
      id: uuidv4(),
      type: data.type,
      amount: Number(data.amount),
      description: String(data.description).trim(),
      category: data.category,
      date: data.date,
      paymentMethod: data.paymentMethod || 'Other',
      notes: data.notes ? String(data.notes).trim() : '',
      createdAt: new Date().toISOString(),
    }
    const updated = storageAdd(transaction)
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
    showToast('Transaction added successfully!', 'success')
    return transaction
  }, [showToast])

  const updateTransaction = useCallback((id, data) => {
    const updated = storageUpdate(id, {
      ...data,
      amount: Number(data.amount),
      description: String(data.description).trim(),
      notes: data.notes ? String(data.notes).trim() : '',
    })
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
    showToast('Transaction updated successfully!', 'success')
  }, [showToast])

  const deleteTransaction = useCallback((id) => {
    const updated = storageDelete(id)
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
    showToast('Transaction deleted.', 'info')
  }, [showToast])

  const clearAllTransactions = useCallback(() => {
    const updated = storageClear()
    dispatch({ type: 'SET_TRANSACTIONS', payload: updated })
    showToast('All transactions cleared.', 'info')
  }, [showToast])

  const importData = useCallback((jsonString) => {
    const result = storageImport(jsonString)
    if (result.success) {
      dispatch({ type: 'SET_TRANSACTIONS', payload: result.transactions })
      showToast(`Imported ${result.imported} new transaction(s).`, 'success')
    } else {
      showToast(result.error, 'error')
    }
    return result
  }, [showToast])

  // ── Settings actions ───────────────────────────────────────────────────────

  const updateSettings = useCallback((newSettings) => {
    const saved = storageSaveSettings(newSettings)
    dispatch({ type: 'SET_SETTINGS', payload: saved })
    showToast('Settings saved.', 'success')
    return saved
  }, [showToast])

  // ── Context value ──────────────────────────────────────────────────────────

  const value = {
    transactions: state.transactions,
    settings: state.settings,
    toast: state.toast,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearAllTransactions,
    importData,
    updateSettings,
    showToast,
    clearToast,
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

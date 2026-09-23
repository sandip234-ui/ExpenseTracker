import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../../context/TransactionContext'
import { getAllCategories } from '../../services/categoryService'
import { calculateAccountBalance, getAvailableAccountBalance } from '../../services/accountService'
import { getPaymentMethodsForAccount } from '../../data/categories'
import { validateTransaction } from '../../utils/validation'
import { todayISO, formatCurrency } from '../../utils/formatters'
import Button from '../common/Button'

const INITIAL_STATE = {
  type: 'expense',
  amount: '',
  description: '',
  category: '',
  accountId: '',
  date: todayISO(),
  paymentMethod: 'UPI',
  notes: '',
}

const inputStyle = {
  background: 'var(--card-bg, #F8FAFC)',
  border: '1px solid var(--border-color, #E5E7EB)',
  color: 'var(--text-primary, #0F172A)',
  borderRadius: '0.5rem',
  width: '100%',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '500',
  color: 'var(--text-secondary, #374151)',
  marginBottom: '0.375rem',
}

const errorStyle = { color: '#DC2626', fontSize: '0.75rem', marginTop: '0.25rem' }

export default function TransactionForm({ initialData = null, onSubmit, submitLabel = 'Save Transaction' }) {
  const navigate = useNavigate()
  const { accounts, customCategories, transactions, settings } = useTransactions()
  const currencySymbol = settings?.currencySymbol || '₹'

  const defaultAccId = accounts[0]?.id || 'account-cash'
  
  const [form, setForm] = useState(() => {
    if (initialData) {
      const accId = initialData.accountId || defaultAccId
      const acc = accounts.find((a) => a.id === accId) || accounts[0]
      const validMethods = getPaymentMethodsForAccount(acc)
      const pm = initialData.paymentMethod || validMethods[0] || 'Other'
      return {
        ...INITIAL_STATE,
        ...initialData,
        accountId: accId,
        paymentMethod: pm,
      }
    }
    const firstAcc = accounts[0]
    const validMethods = getPaymentMethodsForAccount(firstAcc)
    return {
      ...INITIAL_STATE,
      accountId: defaultAccId,
      paymentMethod: validMethods[0] || 'Other',
    }
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // When type changes, clear category if current category does not belong to new type
  useEffect(() => {
    const validCats = getAllCategories(form.type, customCategories).map((c) => c.id)
    if (form.category && !validCats.includes(form.category)) {
      setForm((f) => ({ ...f, category: '' }))
    }
  }, [form.type, customCategories]) // eslint-disable-line

  const categories = getAllCategories(form.type, customCategories)
  const selectedAccount = accounts.find((a) => a.id === (form.accountId || defaultAccId)) || accounts[0]
  const availableMethods = getPaymentMethodsForAccount(selectedAccount)
  const availableBalance = getAvailableAccountBalance(selectedAccount, transactions, initialData)

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const n = { ...prev }
        delete n[field]
        return n
      })
    }
  }

  const handleAccountChange = (e) => {
    const newAccId = e.target.value
    const newAccount = accounts.find((a) => a.id === newAccId) || accounts[0]
    const validMethods = getPaymentMethodsForAccount(newAccount)

    setForm((prev) => {
      // Only reset payment method if the current method is no longer valid for the new account
      const keepExisting = validMethods.includes(prev.paymentMethod)
      const newPaymentMethod = keepExisting ? prev.paymentMethod : (validMethods[0] || 'Other')

      return {
        ...prev,
        accountId: newAccId,
        paymentMethod: newPaymentMethod,
      }
    })

    if (errors.accountId || errors.amount) {
      setErrors((prev) => {
        const n = { ...prev }
        delete n.accountId
        delete n.amount
        return n
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { valid, errors: validationErrors } = validateTransaction(form, {
      account: selectedAccount,
      availableBalance,
      currencySymbol,
    })

    if (!valid) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
        accountId: form.accountId || defaultAccId,
      })
    } catch (err) {
      setErrors((prev) => ({ ...prev, amount: err.message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Type selector */}
      <div>
        <label style={labelStyle}>Transaction Type</label>
        <div className="grid grid-cols-2 gap-2">
          {['expense', 'income'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('type')(t)}
              className="py-2.5 px-4 rounded-xl text-sm font-semibold border capitalize transition-all"
              style={
                form.type === t
                  ? t === 'income'
                    ? { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-income, #059669)', border: '1.5px solid var(--color-income, #10B981)' }
                    : { background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-expense, #DC2626)', border: '1.5px solid var(--color-expense, #EF4444)' }
                  : { background: 'var(--card-bg, #FFFFFF)', color: 'var(--text-secondary, #64748B)', border: '1px solid var(--border-color, #E5E7EB)' }
              }
            >
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
        </div>
        {errors.type && <p style={errorStyle}>{errors.type}</p>}
      </div>

      {/* Amount & Account */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Amount *</label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
              style={{ color: '#94A3B8' }}
            >
              {currencySymbol}
            </span>
            <input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={set('amount')}
              min="0.01"
              step="0.01"
              style={{ ...inputStyle, paddingLeft: '2rem' }}
            />
          </div>
          {errors.amount && <p style={errorStyle}>{errors.amount}</p>}
        </div>

        <div>
          <label style={labelStyle}>Account / Wallet *</label>
          <select
            value={form.accountId || defaultAccId}
            onChange={handleAccountChange}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {accounts.map((acc) => {
              const bal = getAvailableAccountBalance(acc, transactions, initialData)
              return (
                <option key={acc.id} value={acc.id}>
                  {acc.icon || '🏦'} {acc.name} ({formatCurrency(bal, currencySymbol)})
                </option>
              )
            })}
          </select>
          {errors.accountId && <p style={errorStyle}>{errors.accountId}</p>}
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description *</label>
        <input
          type="text"
          placeholder="What was this for?"
          value={form.description}
          onChange={set('description')}
          maxLength={200}
          style={inputStyle}
        />
        {errors.description && <p style={errorStyle}>{errors.description}</p>}
      </div>

      {/* Category */}
      <div>
        <label style={labelStyle}>Category *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border rounded-lg" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => set('category')(cat.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left truncate"
              style={
                form.category === cat.id
                  ? { background: `${cat.color || '#6366F1'}15`, color: cat.color || '#6366F1', border: `1.5px solid ${cat.color || '#6366F1'}40` }
                  : { background: 'var(--card-bg, #F8FAFC)', color: 'var(--text-secondary, #64748B)', border: '1px solid var(--border-color, #E5E7EB)' }
              }
            >
              <span>{cat.icon || '🏷️'}</span>
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>
        {errors.category && <p style={errorStyle}>{errors.category}</p>}
      </div>

      {/* Date and Payment Method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Date *</label>
          <input type="date" value={form.date} onChange={set('date')} style={inputStyle} />
          {errors.date && <p style={errorStyle}>{errors.date}</p>}
        </div>
        <div>
          <label style={labelStyle}>Payment Method</label>
          <select
            value={form.paymentMethod || availableMethods[0] || 'Other'}
            onChange={set('paymentMethod')}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {/* If the current transaction has a legacy method not in availableMethods, preserve it */}
            {form.paymentMethod && !availableMethods.includes(form.paymentMethod) && (
              <option value={form.paymentMethod}>{form.paymentMethod} (Legacy)</option>
            )}
            {availableMethods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>
          Notes <span style={{ color: 'var(--text-muted, #94A3B8)' }}>(optional)</span>
        </label>
        <textarea
          placeholder="Additional notes..."
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

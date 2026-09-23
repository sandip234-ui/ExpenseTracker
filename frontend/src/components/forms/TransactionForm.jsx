import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategoriesForType, PAYMENT_METHODS } from '../../data/categories'
import { validateTransaction } from '../../utils/validation'
import { todayISO } from '../../utils/formatters'
import Button from '../common/Button'

const INITIAL_STATE = {
  type: 'expense',
  amount: '',
  description: '',
  category: '',
  date: todayISO(),
  paymentMethod: 'UPI',
  notes: '',
}

const INPUT_STYLE = {
  background: '#13151f',
  border: '1px solid #2a2d3e',
  color: '#f1f5f9',
  borderRadius: '0.5rem',
  width: '100%',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  outline: 'none',
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '500',
  color: '#94a3b8',
  marginBottom: '0.375rem',
}

export default function TransactionForm({ initialData = null, onSubmit, submitLabel = 'Save Transaction' }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialData ? { ...INITIAL_STATE, ...initialData } : INITIAL_STATE)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Reset category when type changes
  useEffect(() => {
    if (!initialData) {
      setForm((f) => ({ ...f, category: '' }))
    }
  }, [form.type]) // eslint-disable-line

  const categories = getCategoriesForType(form.type)

  const set = (field) => (e) => {
    const value = e.target ? e.target.value : e
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { valid, errors: validationErrors } = validateTransaction(form)
    if (!valid) {
      setErrors(validationErrors)
      return
    }
    setLoading(true)
    try {
      await onSubmit({ ...form, amount: Number(form.amount) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {/* Type selector */}
      <div>
        <label style={LABEL_STYLE}>Transaction Type</label>
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
                    ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)' }
                    : { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }
                  : { background: '#13151f', color: '#64748b', border: '1px solid #2a2d3e' }
              }
            >
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
        </div>
        {errors.type && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{errors.type}</p>}
      </div>

      {/* Amount */}
      <div>
        <label style={LABEL_STYLE}>Amount *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#64748b' }}>₹</span>
          <input
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={set('amount')}
            min="0.01"
            step="0.01"
            style={{ ...INPUT_STYLE, paddingLeft: '1.75rem' }}
          />
        </div>
        {errors.amount && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{errors.amount}</p>}
      </div>

      {/* Description */}
      <div>
        <label style={LABEL_STYLE}>Description *</label>
        <input
          type="text"
          placeholder="What was this for?"
          value={form.description}
          onChange={set('description')}
          maxLength={200}
          style={INPUT_STYLE}
        />
        {errors.description && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{errors.description}</p>}
      </div>

      {/* Category */}
      <div>
        <label style={LABEL_STYLE}>Category *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => set('category')(cat.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left"
              style={
                form.category === cat.id
                  ? { background: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}40` }
                  : { background: '#13151f', color: '#94a3b8', border: '1px solid #2a2d3e' }
              }
            >
              <span>{cat.icon}</span>
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>
        {errors.category && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{errors.category}</p>}
      </div>

      {/* Date and Payment Method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={LABEL_STYLE}>Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={set('date')}
            style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
          />
          {errors.date && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{errors.date}</p>}
        </div>
        <div>
          <label style={LABEL_STYLE}>Payment Method</label>
          <select value={form.paymentMethod} onChange={set('paymentMethod')}
            style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m} style={{ background: '#13151f' }}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={LABEL_STYLE}>Notes <span style={{ color: '#475569' }}>(optional)</span></label>
        <textarea
          placeholder="Additional notes..."
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: '80px' }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
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

import React, { useState, useMemo } from 'react'
import { useTransactions } from '../context/TransactionContext'
import { getAllCategories, findCategory } from '../services/categoryService'
import { formatCurrency, formatDate } from '../utils/formatters'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'
import AnimatedGradientBorder from '../components/common/AnimatedGradientBorder'
import {
  Repeat, Plus, Edit3, Trash2, CheckCircle2, XCircle,
  Calendar, ArrowUpCircle, ArrowDownCircle, RefreshCw
} from 'lucide-react'

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

const inputStyle = {
  background: 'var(--card-bg, #F8FAFC)',
  border: '1px solid var(--border-color, #E5E7EB)',
  color: 'var(--text-primary, #0F172A)',
  borderRadius: '0.5rem',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '500',
  color: 'var(--text-secondary, #374151)',
  marginBottom: '0.375rem',
}

export default function Recurring() {
  const {
    recurring,
    accounts,
    customCategories,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    reloadAll,
    settings,
  } = useTransactions()

  const currencySymbol = settings?.currencySymbol || '₹'

  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const todayStr = new Date().toISOString().split('T')[0]
  const defaultAccId = accounts[0]?.id || 'account-cash'

  const [formData, setFormData] = useState({
    type: 'expense',
    description: '',
    amount: '',
    categoryId: 'subscriptions',
    accountId: defaultAccId,
    frequency: 'monthly',
    startDate: todayStr,
    endDate: '',
    active: true,
  })

  const categories = useMemo(
    () => getAllCategories(formData.type, customCategories),
    [formData.type, customCategories]
  )

  const openAddModal = () => {
    setEditingRule(null)
    setFormData({
      type: 'expense',
      description: '',
      amount: '',
      categoryId: 'subscriptions',
      accountId: defaultAccId,
      frequency: 'monthly',
      startDate: todayStr,
      endDate: '',
      active: true,
    })
    setShowModal(true)
  }

  const openEditModal = (rule) => {
    setEditingRule(rule)
    setFormData({
      type: rule.type || 'expense',
      description: rule.description,
      amount: String(rule.amount),
      categoryId: rule.categoryId || 'other',
      accountId: rule.accountId || defaultAccId,
      frequency: rule.frequency || 'monthly',
      startDate: rule.startDate,
      endDate: rule.endDate || '',
      active: rule.active !== undefined ? rule.active : true,
    })
    setShowModal(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!formData.description.trim() || !formData.amount) return

    if (editingRule) {
      updateRecurring(editingRule.id, {
        type: formData.type,
        description: formData.description,
        amount: Number(formData.amount),
        categoryId: formData.categoryId,
        accountId: formData.accountId,
        frequency: formData.frequency,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        active: formData.active,
      })
    } else {
      addRecurring({
        type: formData.type,
        description: formData.description,
        amount: Number(formData.amount),
        categoryId: formData.categoryId,
        accountId: formData.accountId,
        frequency: formData.frequency,
        startDate: formData.startDate,
        nextOccurrence: formData.startDate,
        endDate: formData.endDate || null,
        active: formData.active,
      })
    }
    setShowModal(false)
  }

  const toggleActiveStatus = (rule) => {
    updateRecurring(rule.id, { active: !rule.active })
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteRecurring(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Banner with Stats & Actions */}
      <AnimatedGradientBorder className="rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl border border-transparent">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Recurring Transactions</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, #64748B)' }}>
              Automate routine income and expenses. Transactions are generated automatically on due dates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={reloadAll} title="Check and generate due transactions now">
              <RefreshCw size={14} /> Run Check
            </Button>
            <Button onClick={openAddModal}>
              <Plus size={16} /> Add Recurring
            </Button>
          </div>
        </div>
      </AnimatedGradientBorder>

      {/* Recurring List */}
      {recurring.length === 0 ? (
        <Card>
          <EmptyState
            icon={Repeat}
            title="No recurring transactions"
            description="Add recurring income or expenses like salary, subscriptions, or rent to automate repetitive entries."
            actionLabel="+ Add Recurring Transaction"
            actionOnClick={openAddModal}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurring.map((rule) => {
            const cat = findCategory(rule.categoryId, rule.type, customCategories)
            const acc = accounts.find((a) => a.id === rule.accountId) || { name: 'Default Account', icon: '🏦' }

            return (
              <AnimatedGradientBorder key={rule.id} className="rounded-xl h-full">
                <div
                  className={`bg-white dark:bg-slate-800 rounded-xl border border-transparent p-5 transition-all flex flex-col justify-between h-full ${
                    !rule.active ? 'opacity-60 bg-gray-50 dark:bg-slate-900/40' : 'hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                          style={{ background: `${cat.color || '#6366F1'}15`, color: cat.color }}
                        >
                          {cat.icon || '🏷️'}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary, #0F172A)' }}>
                            {rule.description}
                          </h3>
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary, #64748B)' }}>{cat.label}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="p-1.5 rounded-lg hover:text-indigo-600 transition-colors"
                          style={{ color: 'var(--text-muted, #94A3B8)' }}
                          title="Edit"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rule)}
                          className="p-1.5 rounded-lg hover:text-red-500 transition-colors"
                          style={{ color: 'var(--text-muted, #94A3B8)' }}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Amount & Frequency */}
                    <div className="mt-4 flex items-baseline justify-between">
                      <div className="flex items-center gap-1.5">
                        {rule.type === 'income' ? (
                          <ArrowUpCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ArrowDownCircle size={15} className="text-rose-600 dark:text-rose-400" />
                        )}
                        <span
                          className="text-lg font-bold"
                          style={{ color: rule.type === 'income' ? 'var(--color-income, #059669)' : 'var(--color-expense, #DC2626)' }}
                        >
                          {formatCurrency(rule.amount, currencySymbol)}
                        </span>
                      </div>

                      <span className="text-xs px-2.5 py-0.5 rounded-full capitalize font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {rule.frequency}
                      </span>
                    </div>

                    {/* Account & Details */}
                    <div className="mt-3 pt-3 border-t text-xs space-y-1" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
                      <div className="flex justify-between" style={{ color: 'var(--text-secondary, #64748B)' }}>
                        <span>Account</span>
                        <span className="font-medium" style={{ color: 'var(--text-primary, #0F172A)' }}>{acc.icon} {acc.name}</span>
                      </div>
                      <div className="flex justify-between" style={{ color: 'var(--text-secondary, #64748B)' }}>
                        <span>Next Due</span>
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {rule.nextOccurrence ? formatDate(rule.nextOccurrence) : '—'}
                        </span>
                      </div>
                      {rule.lastGeneratedDate && (
                        <div className="flex justify-between text-[11px]" style={{ color: 'var(--text-muted, #94A3B8)' }}>
                          <span>Last Generated</span>
                          <span>{formatDate(rule.lastGeneratedDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Toggle */}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
                    <button
                      type="button"
                      onClick={() => toggleActiveStatus(rule)}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                        rule.active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {rule.active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {rule.active ? 'Active' : 'Paused'}
                    </button>

                    <span className="text-[11px]" style={{ color: 'var(--text-muted, #94A3B8)' }}>
                      Started {formatDate(rule.startDate)}
                    </span>
                  </div>
                </div>
              </AnimatedGradientBorder>
            )
          })}
        </div>
      )}

      {/* Add / Edit Recurring Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary, #0F172A)' }}>
              {editingRule ? 'Edit Recurring Rule' : 'Add Recurring Transaction'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Type */}
              <div className="grid grid-cols-2 gap-2">
                {['expense', 'income'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t })}
                    className="py-2 px-3 rounded-lg text-xs font-semibold border capitalize"
                    style={
                      formData.type === t
                        ? t === 'income'
                          ? { background: '#ECFDF5', color: '#059669', border: '1.5px solid #A7F3D0' }
                          : { background: '#FEF2F2', color: '#DC2626', border: '1.5px solid #FECACA' }
                        : { background: '#FFFFFF', color: '#64748B', border: '1px solid #E5E7EB' }
                    }
                  >
                    {t === 'income' ? '↑ Income' : '↓ Expense'}
                  </button>
                ))}
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Monthly Rent, Salary"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>

              {/* Amount & Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Amount *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="649"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    style={inputStyle}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    style={inputStyle}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Account</label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    style={inputStyle}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Start / Next Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>End Date (optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingRule ? 'Save Schedule' : 'Create Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          title="Delete Recurring Schedule"
          description={`Are you sure you want to stop and delete the recurring rule for "${deleteTarget.description}"? Previously generated transactions will remain in your history.`}
          confirmLabel="Delete Rule"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

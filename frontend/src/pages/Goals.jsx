import React, { useState } from 'react'
import { useTransactions } from '../context/TransactionContext'
import { calculateGoalMetrics } from '../services/goalService'
import { calculateAccountBalance } from '../services/accountService'
import { formatCurrency, formatDate } from '../utils/formatters'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'
import AnimatedGradientBorder from '../components/common/AnimatedGradientBorder'
import {
  Target, Plus, Edit3, Trash2, PlusCircle, MinusCircle,
  TrendingUp, Calendar, CheckCircle2, Clock, AlertTriangle, AlertCircle, ArrowRightLeft
} from 'lucide-react'

const COLOR_OPTIONS = [
  '#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6', '#64748B'
]

const EMOJI_OPTIONS = ['💻', '🚗', '🏠', '✈️', '💍', '🎓', '🏖️', '📱', '🚲', '💰', '🛡️', '🎯']

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

export default function Goals() {
  const {
    goals,
    accounts,
    transactions,
    addGoal,
    updateGoal,
    deleteGoal,
    depositToGoal,
    withdrawFromGoal,
    settings
  } = useTransactions()
  const currencySymbol = settings?.currencySymbol || '₹'

  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Contribution / Transfer Modal state
  const [contributeTarget, setContributeTarget] = useState(null)
  const [contribType, setContribType] = useState('add') // 'add' | 'withdraw'
  const [contribAmount, setContribAmount] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [contribError, setContribError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '0',
    targetDate: '',
    icon: '🎯',
    color: '#6366F1',
  })

  const openAddModal = () => {
    setEditingGoal(null)
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '0',
      targetDate: '',
      icon: '🎯',
      color: '#6366F1',
    })
    setShowModal(true)
  }

  const openEditModal = (goal) => {
    setEditingGoal(goal)
    setFormData({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount || 0),
      targetDate: goal.targetDate || '',
      icon: goal.icon || '🎯',
      color: goal.color || '#6366F1',
    })
    setShowModal(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.targetAmount) return

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        name: formData.name,
        targetAmount: Number(formData.targetAmount),
        currentAmount: Number(formData.currentAmount) || 0,
        targetDate: formData.targetDate,
        icon: formData.icon,
        color: formData.color,
      })
    } else {
      addGoal({
        name: formData.name,
        targetAmount: Number(formData.targetAmount),
        currentAmount: Number(formData.currentAmount) || 0,
        targetDate: formData.targetDate,
        icon: formData.icon,
        color: formData.color,
      })
    }
    setShowModal(false)
  }

  const openContributeModal = (goal, type) => {
    setContributeTarget(goal)
    setContribType(type)
    setContribAmount('')
    setSelectedAccountId(accounts[0]?.id || '')
    setContribError('')
  }

  // Active account and dynamic balances for contribution modal
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0]
  const availableAccountBalance = selectedAccount ? calculateAccountBalance(selectedAccount, transactions) : 0
  const goalCurrent = Number(contributeTarget?.currentAmount) || 0
  const goalTarget = Number(contributeTarget?.targetAmount) || 0
  const goalRemaining = Math.max(0, goalTarget - goalCurrent)

  // Real-time validation
  const numContribAmount = Number(contribAmount)
  let dynamicValidationError = ''
  if (contribAmount !== '') {
    if (isNaN(numContribAmount) || numContribAmount <= 0) {
      dynamicValidationError = 'Please enter a valid amount greater than ₹0.'
    } else if (contribType === 'add') {
      if (numContribAmount > availableAccountBalance) {
        dynamicValidationError = `Insufficient balance. Available balance in ${selectedAccount?.name || 'account'}: ${formatCurrency(availableAccountBalance, currencySymbol)}`
      } else if (goalTarget > 0 && numContribAmount > goalRemaining) {
        dynamicValidationError = `Only ${formatCurrency(goalRemaining, currencySymbol)} remaining to reach this goal.`
      }
    } else if (contribType === 'withdraw') {
      if (numContribAmount > goalCurrent) {
        dynamicValidationError = `Insufficient funds in this savings goal. Currently available: ${formatCurrency(goalCurrent, currencySymbol)}`
      }
    }
  }

  const displayError = contribError || dynamicValidationError
  const isSubmitDisabled =
    !contribAmount ||
    isNaN(numContribAmount) ||
    numContribAmount <= 0 ||
    Boolean(dynamicValidationError)

  const handleSaveContribution = async (e) => {
    e.preventDefault()
    if (isSubmitDisabled || !contributeTarget || !selectedAccount) return

    try {
      if (contribType === 'add') {
        await depositToGoal({
          goalId: contributeTarget.id,
          amount: numContribAmount,
          sourceAccountId: selectedAccount.id,
        })
      } else {
        await withdrawFromGoal({
          goalId: contributeTarget.id,
          amount: numContribAmount,
          destinationAccountId: selectedAccount.id,
        })
      }
      setContributeTarget(null)
      setContribAmount('')
      setContribError('')
    } catch (err) {
      setContribError(err.message)
    }
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteGoal(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Banner with Stats & Actions */}
      <AnimatedGradientBorder className="rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl border border-transparent">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Savings Goals</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, #64748B)' }}>
              Set targets for major purchases, emergency funds, or vacations, and track monthly progress.
            </p>
          </div>
          <div>
            <Button onClick={openAddModal}>
              <Plus size={16} /> Create Goal
            </Button>
          </div>
        </div>
      </AnimatedGradientBorder>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No savings goals yet"
            description="Create your first savings goal and track your monthly savings progress towards it."
            actionLabel="+ Create Goal"
            actionOnClick={openAddModal}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const metrics = calculateGoalMetrics(goal)
            const isFinished = metrics.isCompleted

            return (
              <AnimatedGradientBorder key={goal.id} className="rounded-xl h-full">
                <div
                  className="bg-white dark:bg-slate-800 rounded-xl border border-transparent p-5 transition-all hover:shadow-sm flex flex-col justify-between h-full"
                >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: `${goal.color || '#6366F1'}18`, color: goal.color }}
                      >
                        {goal.icon || '🎯'}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>{goal.name}</h3>
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border mt-0.5 ${
                            isFinished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50'
                          }`}
                        >
                          {isFinished ? 'Completed 🎉' : `${metrics.percentage.toFixed(0)}% Saved`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(goal)}
                        className="p-1.5 rounded-lg hover:text-indigo-600 transition-colors"
                        style={{ color: 'var(--text-muted, #94A3B8)' }}
                        title="Edit"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(goal)}
                        className="p-1.5 rounded-lg hover:text-red-500 transition-colors"
                        style={{ color: 'var(--text-muted, #94A3B8)' }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Saved vs Target Amount */}
                  <div className="mt-4 flex items-baseline justify-between text-xs">
                    <span className="text-base font-bold" style={{ color: 'var(--text-primary, #0F172A)' }}>
                      {formatCurrency(metrics.currentAmount, currencySymbol)}
                    </span>
                    <span style={{ color: 'var(--text-secondary, #64748B)' }}>
                      of {formatCurrency(metrics.targetAmount, currencySymbol)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        background: goal.color || '#6366F1',
                        width: `${Math.min(100, metrics.percentage)}%`,
                      }}
                    />
                  </div>

                  {/* Monthly Recommendation & Remaining */}
                  <div className="mt-4 pt-3 border-t text-xs space-y-1.5" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
                    <div className="flex justify-between" style={{ color: 'var(--text-secondary, #64748B)' }}>
                      <span>Remaining</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>
                        {formatCurrency(metrics.remaining, currencySymbol)}
                      </span>
                    </div>

                    {goal.targetDate && (
                      <div className="flex justify-between" style={{ color: 'var(--text-secondary, #64748B)' }}>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} style={{ color: 'var(--text-muted, #94A3B8)' }} /> Target
                        </span>
                        <span className="font-medium" style={{ color: 'var(--text-primary, #0F172A)' }}>
                          {formatDate(goal.targetDate)} ({metrics.monthsRemaining} mo)
                        </span>
                      </div>
                    )}

                    {!isFinished && metrics.suggestedMonthlySaving > 0 && (
                      <div className="p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 mt-2">
                        <span className="text-[11px] font-medium block" style={{ color: 'var(--text-primary, #1E1B4B)' }}>
                          Suggested monthly saving:
                        </span>
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          {formatCurrency(Math.round(metrics.suggestedMonthlySaving), currencySymbol)} / month
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contribution Action Buttons */}
                <div className="mt-4 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
                  <button
                    type="button"
                    onClick={() => openContributeModal(goal, 'add')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 transition-colors"
                  >
                    <PlusCircle size={13} /> Add Funds
                  </button>
                  <button
                    type="button"
                    onClick={() => openContributeModal(goal, 'withdraw')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 transition-colors"
                  >
                    <MinusCircle size={13} /> Withdraw
                  </button>
                </div>
              </div>
            </AnimatedGradientBorder>
          )
          })}
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary, #0F172A)' }}>
              {editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label style={labelStyle}>Goal Name *</label>
                <input
                  type="text"
                  placeholder="e.g. MacBook Pro, Emergency Fund, Bali Vacation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Target Amount *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="120000"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Current Saved Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Target Date (optional)</label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Icon Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`w-8 h-8 rounded-lg border text-base flex items-center justify-center transition-all ${
                        formData.icon === emoji ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                      style={{
                        background: formData.icon === emoji ? undefined : 'var(--card-bg, #FFFFFF)',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Color Tag</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: col })}
                      className="w-6 h-6 rounded-full transition-transform"
                      style={{
                        background: col,
                        outline: formData.color === col ? '2.5px solid var(--text-primary, #0F172A)' : 'none',
                        outlineOffset: '2px',
                        transform: formData.color === col ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingGoal ? 'Save Goal' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Withdraw Funds Modal */}
      {contributeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div
            className="rounded-2xl w-full max-w-md p-6 shadow-2xl border bg-white dark:bg-slate-800"
            style={{ borderColor: 'var(--border-color, #E5E7EB)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>
                {contribType === 'add' ? 'Add Money to Goal' : 'Withdraw Money from Goal'}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818CF8' }}>
                {contribType === 'add' ? 'Transfer to Goal' : 'Transfer to Account'}
              </span>
            </div>

            {/* Goal Info Banner */}
            <div className="p-3.5 rounded-xl mb-4 bg-gray-50/70 dark:bg-slate-900/60 border" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary, #0F172A)' }}>
                  {contributeTarget.icon} {contributeTarget.name}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary, #64748B)' }}>
                  Current: <strong style={{ color: 'var(--text-primary, #0F172A)' }}>{formatCurrency(goalCurrent, currencySymbol)}</strong>
                </span>
              </div>
              {goalTarget > 0 && (
                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t text-xs" style={{ borderColor: 'var(--border-color, #E2E8F0)', color: 'var(--text-secondary, #64748B)' }}>
                  <span>Target: {formatCurrency(goalTarget, currencySymbol)}</span>
                  <span>
                    Remaining:{' '}
                    <strong style={{ color: goalRemaining === 0 ? 'var(--color-income, #10B981)' : 'var(--color-accent, #6366F1)' }}>
                      {formatCurrency(goalRemaining, currencySymbol)}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveContribution} className="space-y-4">
              {/* Amount input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label style={labelStyle}>Amount *</label>
                  {contribType === 'add' && goalRemaining > 0 && goalRemaining <= availableAccountBalance && (
                    <button
                      type="button"
                      onClick={() => {
                        setContribAmount(String(goalRemaining))
                        setContribError('')
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Fill remaining ({formatCurrency(goalRemaining, currencySymbol)})
                    </button>
                  )}
                  {contribType === 'withdraw' && goalCurrent > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setContribAmount(String(goalCurrent))
                        setContribError('')
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Withdraw full ({formatCurrency(goalCurrent, currencySymbol)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--text-muted, #94A3B8)' }}>
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder={contribType === 'add' ? '5000' : '2000'}
                    value={contribAmount}
                    onChange={(e) => {
                      setContribAmount(e.target.value)
                      setContribError('')
                    }}
                    required
                    autoFocus
                    style={{ ...inputStyle, paddingLeft: '2rem' }}
                  />
                </div>
              </div>

              {/* Source / Destination Account */}
              <div>
                <label style={labelStyle}>
                  {contribType === 'add' ? 'Source Account *' : 'Destination Account *'}
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value)
                    setContribError('')
                  }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {accounts.map((acc) => {
                    const bal = calculateAccountBalance(acc, transactions)
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.icon || '🏦'} {acc.name} ({formatCurrency(bal, currencySymbol)})
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Available Balance Banner */}
              <div
                className="p-3 rounded-xl border flex items-center justify-between text-xs bg-gray-50/70 dark:bg-slate-900/40"
                style={{ borderColor: 'var(--border-color, #F1F5F9)' }}
              >
                <span style={{ color: 'var(--text-secondary, #64748B)' }}>
                  {contribType === 'add'
                    ? `Available in ${selectedAccount?.name || 'Account'}:`
                    : 'Available in Savings Goal:'}
                </span>
                <span
                  className="font-bold text-sm"
                  style={{
                    color:
                      (contribType === 'add' ? availableAccountBalance : goalCurrent) <= 0
                        ? '#DC2626'
                        : 'var(--text-primary, #0F172A)',
                  }}
                >
                  {formatCurrency(
                    contribType === 'add' ? availableAccountBalance : goalCurrent,
                    currencySymbol
                  )}
                </span>
              </div>

              {/* Inline Error/Validation message */}
              {displayError && (
                <div className="p-3 rounded-xl border text-xs flex items-start gap-2 bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 animate-fadeIn">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span className="font-medium leading-relaxed">{displayError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setContributeTarget(null)
                    setContribError('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitDisabled}
                  variant={contribType === 'add' ? 'primary' : 'secondary'}
                >
                  {contribType === 'add' ? 'Add Funds' : 'Withdraw'}
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
          title="Delete Savings Goal"
          description={`Are you sure you want to delete the "${deleteTarget.name}" goal?`}
          confirmLabel="Delete Goal"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

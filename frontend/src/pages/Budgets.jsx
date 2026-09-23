import React, { useState, useMemo } from 'react'
import { useTransactions } from '../context/TransactionContext'
import { getAllCategories, findCategory } from '../services/categoryService'
import {
  getBudgetsForMonth,
  calculateBudgetStatus,
  calculateOverallBudget,
} from '../services/budgetService'
import { formatCurrency } from '../utils/formatters'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'
import AnimatedGradientBorder from '../components/common/AnimatedGradientBorder'
import {
  PiggyBank, Plus, Edit3, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, TrendingDown, Layers
} from 'lucide-react'

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

export default function Budgets() {
  const { budgets, transactions, customCategories, addBudget, updateBudget, deleteBudget, settings } = useTransactions()
  const currencySymbol = settings?.currencySymbol || '₹'

  // Current selected month: 'YYYY-MM'
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  )

  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [formData, setFormData] = useState({
    categoryId: 'food',
    amount: '',
    month: selectedMonth,
  })

  const expenseCategories = useMemo(
    () => getAllCategories('expense', customCategories),
    [customCategories]
  )

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const prev = new Date(y, m - 2, 1)
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const next = new Date(y, m, 1)
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleThisMonth = () => {
    const now = new Date()
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  }

  const formattedMonthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [selectedMonth])

  // Active budgets for selected month
  const monthBudgets = useMemo(
    () => getBudgetsForMonth(budgets, selectedMonth),
    [budgets, selectedMonth]
  )

  const overall = useMemo(
    () => calculateOverallBudget(monthBudgets, transactions, selectedMonth),
    [monthBudgets, transactions, selectedMonth]
  )

  const openAddModal = () => {
    setEditingBudget(null)
    setFormData({
      categoryId: expenseCategories[0]?.id || 'food',
      amount: '',
      month: selectedMonth,
    })
    setShowModal(true)
  }

  const openEditModal = (budget) => {
    setEditingBudget(budget)
    setFormData({
      categoryId: budget.categoryId,
      amount: String(budget.amount),
      month: budget.month,
    })
    setShowModal(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!formData.amount || Number(formData.amount) <= 0) return

    if (editingBudget) {
      updateBudget(editingBudget.id, {
        categoryId: formData.categoryId,
        amount: Number(formData.amount),
        month: formData.month,
      })
    } else {
      addBudget({
        categoryId: formData.categoryId,
        amount: Number(formData.amount),
        month: formData.month,
      })
    }
    setShowModal(false)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteBudget(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Bar: Month Navigator & Add Budget Button */}
      <AnimatedGradientBorder className="rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-transparent">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              style={{ borderColor: 'var(--border-color, #E5E7EB)', color: 'var(--text-secondary, #64748B)' }}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-base font-semibold px-2 min-w-[150px] text-center" style={{ color: 'var(--text-primary, #0F172A)' }}>
              {formattedMonthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              style={{ borderColor: 'var(--border-color, #E5E7EB)', color: 'var(--text-secondary, #64748B)' }}
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={handleThisMonth}
              className="ml-2 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors dark:hover:bg-slate-700"
              style={{ borderColor: 'var(--border-color, #E5E7EB)', color: 'var(--text-secondary, #374151)' }}
            >
              Current Month
            </button>
          </div>

          <div>
            <Button onClick={openAddModal}>
              <Plus size={16} /> Create Budget
            </Button>
          </div>
        </div>
      </AnimatedGradientBorder>

      {/* Exceeded alert banner if any */}
      {overall.exceededCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/50 dark:text-rose-200">
          <AlertTriangle size={18} className="flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-xs">
            <span className="font-semibold">Budget Warning: </span>
            {overall.exceededCount} {overall.exceededCount === 1 ? 'category has' : 'categories have'} exceeded their monthly spending limit in {formattedMonthLabel}.
          </div>
        </div>
      )}

      {/* Overall Budget Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatedGradientBorder className="rounded-xl h-full">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-transparent h-full flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #64748B)' }}>Total Monthly Budget</span>
              <div className="text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                {formatCurrency(overall.totalBudget, currencySymbol)}
              </div>
            </div>
            <span className="text-[11px] mt-0.5 block" style={{ color: 'var(--text-muted, #94A3B8)' }}>{monthBudgets.length} categories budgeted</span>
          </div>
        </AnimatedGradientBorder>

        <AnimatedGradientBorder className="rounded-xl h-full">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-transparent h-full flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #64748B)' }}>Total Spent</span>
              <div className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary, #0F172A)' }}>
                {formatCurrency(overall.totalSpent, currencySymbol)}
              </div>
            </div>
            <span className="text-[11px] mt-0.5 block" style={{ color: 'var(--text-muted, #94A3B8)' }}>in budgeted categories</span>
          </div>
        </AnimatedGradientBorder>

        <AnimatedGradientBorder className="rounded-xl h-full">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-transparent h-full flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #64748B)' }}>Remaining Budget</span>
              <div className={`text-xl font-bold mt-1 ${overall.remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {overall.remaining < 0 ? '-' : ''}{formatCurrency(Math.abs(overall.remaining), currencySymbol)}
              </div>
            </div>
            <span className="text-[11px] mt-0.5 block" style={{ color: 'var(--text-muted, #94A3B8)' }}>
              {overall.remaining >= 0 ? 'Available to spend' : 'Over budget'}
            </span>
          </div>
        </AnimatedGradientBorder>

        <AnimatedGradientBorder className="rounded-xl h-full">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-transparent h-full flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #64748B)' }}>Overall Utilization</span>
              <div className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary, #0F172A)' }}>
                {overall.percentage.toFixed(1)}%
              </div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  overall.percentage >= 100 ? 'bg-rose-500' : overall.percentage >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, overall.percentage)}%` }}
              />
            </div>
          </div>
        </AnimatedGradientBorder>
      </div>

      {/* Category Budgets Grid */}
      {monthBudgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title="No budgets yet"
            description={`Create a monthly budget for ${formattedMonthLabel} to start tracking your spending limits.`}
            actionLabel="+ Create Budget"
            actionOnClick={openAddModal}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monthBudgets.map((b) => {
            const status = calculateBudgetStatus(b, transactions)
            const cat = findCategory(b.categoryId, 'expense', customCategories)

            let statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
            let barBg = 'bg-emerald-500'
            if (status.state === 'critical') {
              statusBg = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
              barBg = 'bg-rose-500'
            } else if (status.state === 'warning') {
              statusBg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
              barBg = 'bg-amber-500'
            }

            return (
              <AnimatedGradientBorder key={b.id} className="rounded-xl h-full">
                <div
                  className="bg-white dark:bg-slate-800 rounded-xl border border-transparent p-5 transition-all hover:shadow-sm flex flex-col justify-between h-full"
                >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                        style={{ background: `${cat.color || '#6366F1'}15`, color: cat.color }}
                      >
                        {cat.icon || '🏷️'}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>{cat.label}</h3>
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border mt-0.5 ${statusBg}`}>
                          {status.percentage.toFixed(0)}% used
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(b)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        style={{ color: 'var(--text-muted, #94A3B8)' }}
                        title="Edit Budget"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(b)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        style={{ color: 'var(--text-muted, #94A3B8)' }}
                        title="Delete Budget"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Spent vs Budget */}
                  <div className="mt-4 flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary, #0F172A)' }}>
                      {formatCurrency(status.spent, currencySymbol)}
                    </span>
                    <span style={{ color: 'var(--text-secondary, #64748B)' }}>
                      of {formatCurrency(status.budgetAmount, currencySymbol)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barBg}`}
                      style={{ width: `${Math.min(100, status.percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Footer status text */}
                <div className="mt-4 pt-3 border-t text-xs flex items-center justify-between" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
                  {status.isOver ? (
                    <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                      <AlertTriangle size={12} /> Over by {formatCurrency(status.overAmount, currencySymbol)}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> {formatCurrency(status.remaining, currencySymbol)} remaining
                    </span>
                  )}
                  <span className="text-[11px]" style={{ color: 'var(--text-muted, #94A3B8)' }}>{selectedMonth}</span>
                </div>
              </div>
            </AnimatedGradientBorder>
          )
          })}
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary, #0F172A)' }}>
              {editingBudget ? 'Edit Monthly Budget' : 'Create Monthly Budget'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label style={labelStyle}>Target Month</label>
                <input
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Expense Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  style={inputStyle}
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Monthly Limit Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--text-muted, #94A3B8)' }}>
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    style={{ ...inputStyle, paddingLeft: '2rem' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingBudget ? 'Save Budget' : 'Set Budget'}
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
          title="Delete Budget"
          description="Are you sure you want to remove this budget limit? Spending data will not be deleted."
          confirmLabel="Delete Budget"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

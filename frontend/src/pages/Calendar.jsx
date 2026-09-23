import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../context/TransactionContext'
import { findCategory } from '../services/categoryService'
import { formatCurrency, formatDate, todayISO } from '../utils/formatters'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import AnimatedGradientBorder from '../components/common/AnimatedGradientBorder'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, Plus, Edit3, Trash2
} from 'lucide-react'

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Calendar() {
  const { transactions, customCategories, deleteTransaction, settings } = useTransactions()
  const navigate = useNavigate()
  const currencySymbol = settings?.currencySymbol || '₹'

  // Current calendar view year & month (0-indexed)
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
    setSelectedDate(todayISO())
  }

  const monthLabel = useMemo(() => {
    const d = new Date(currentYear, currentMonth, 1)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [currentYear, currentMonth])

  // Compute calendar grid days (Monday-first)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    
    // Day of week: 0 = Sun, 1 = Mon ... We want 0 = Mon, 6 = Sun
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    const daysInMonth = lastDay.getDate()
    const days = []

    // Previous month trailing days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i
      const prevM = currentMonth === 0 ? 12 : currentMonth
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
      })
    }

    // Next month trailing days to complete full grid (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const nextM = currentMonth === 11 ? 1 : currentMonth + 2
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
      })
    }

    return days
  }, [currentYear, currentMonth])

  // Group transactions by date
  const txnsByDate = useMemo(() => {
    const map = new Map()
    transactions.forEach((t) => {
      if (!t.date) return
      if (!map.has(t.date)) {
        map.set(t.date, { income: 0, expense: 0, items: [] })
      }
      const entry = map.get(t.date)
      if (t.type === 'income') entry.income += Number(t.amount || 0)
      if (t.type === 'expense') entry.expense += Number(t.amount || 0)
      entry.items.push(t)
    })
    return map
  }, [transactions])

  // Selected date transactions
  const selectedDayData = useMemo(() => {
    const data = txnsByDate.get(selectedDate) || { income: 0, expense: 0, items: [] }
    return {
      ...data,
      net: data.income - data.expense,
    }
  }, [selectedDate, txnsByDate])

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteTransaction(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Header & Month Switcher */}
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
            <span className="text-base font-semibold px-2 min-w-[160px] text-center" style={{ color: 'var(--text-primary, #0F172A)' }}>
              {monthLabel}
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
              onClick={handleToday}
              className="ml-2 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors dark:hover:bg-slate-700"
              style={{ borderColor: 'var(--border-color, #E5E7EB)', color: 'var(--text-secondary, #374151)' }}
            >
              Today
            </button>
          </div>

          <Button onClick={() => navigate('/transactions/new')}>
            <Plus size={15} /> Add Transaction
          </Button>
        </div>
      </AnimatedGradientBorder>

      {/* Main Layout: Calendar Grid + Selected Date Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Calendar Grid (2 cols on lg) */}
        <AnimatedGradientBorder className="lg:col-span-2 rounded-xl h-full">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-transparent overflow-hidden p-4 h-full">
            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary, #64748B)' }}>
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((cell) => {
              const dateInfo = txnsByDate.get(cell.dateStr)
              const isSelected = selectedDate === cell.dateStr
              const isToday = todayISO() === cell.dateStr

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[72px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none ${
                    !cell.isCurrentMonth ? 'opacity-35 bg-gray-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-800/40'
                  } ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                  style={{ borderColor: isSelected ? undefined : 'var(--border-color, #F1F5F9)' }}
                >
                  {/* Date Number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-indigo-600 text-white' : ''
                      }`}
                      style={{ color: isToday ? '#FFFFFF' : 'var(--text-primary, #374151)' }}
                    >
                      {cell.dayNum}
                    </span>
                    {dateInfo?.items?.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </div>

                  {/* Income / Expense Daily Badges */}
                  <div className="space-y-0.5 mt-1">
                    {dateInfo?.income > 0 && (
                      <div className="text-[10px] truncate font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1 py-0.2 rounded">
                        +{formatCurrency(dateInfo.income, currencySymbol)}
                      </div>
                    )}
                    {dateInfo?.expense > 0 && (
                      <div className="text-[10px] truncate font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.2 rounded">
                        -{formatCurrency(dateInfo.expense, currencySymbol)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </AnimatedGradientBorder>

      {/* Selected Date Details Panel (1 col on lg) */}
      <AnimatedGradientBorder className="rounded-xl h-full">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-transparent p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted, #94A3B8)' }}>Selected Date</span>
                <h3 className="text-base font-bold mt-0.5" style={{ color: 'var(--text-primary, #0F172A)' }}>
                  {formatDate(selectedDate)}
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-medium">
                {selectedDayData.items.length} {selectedDayData.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Daily Net Summary */}
            <div className="grid grid-cols-3 gap-2 py-3 border-b text-xs text-center" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
              <div>
                <span className="block" style={{ color: 'var(--text-muted, #94A3B8)' }}>Income</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedDayData.income, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="block" style={{ color: 'var(--text-muted, #94A3B8)' }}>Expense</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {formatCurrency(selectedDayData.expense, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="block" style={{ color: 'var(--text-muted, #94A3B8)' }}>Net</span>
                <span
                  className="font-semibold"
                  style={{ color: selectedDayData.net < 0 ? '#F87171' : 'var(--text-primary, #0F172A)' }}
                >
                  {formatCurrency(selectedDayData.net, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Day Transactions List */}
            <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {selectedDayData.items.length === 0 ? (
                <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted, #94A3B8)' }}>
                  <CalendarIcon size={24} className="mx-auto mb-2 opacity-50" />
                  No transactions on this date.
                </div>
              ) : (
                selectedDayData.items.map((t) => {
                  const cat = findCategory(t.category, t.type, customCategories)
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-gray-50/50 dark:bg-slate-800/40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      style={{ borderColor: 'var(--border-color, #F1F5F9)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                          style={{
                            background: t.type === 'transfer' ? 'rgba(99, 102, 241, 0.15)' : `${cat.color || '#6366F1'}15`,
                            color: t.type === 'transfer' ? '#818CF8' : cat.color,
                          }}
                        >
                          {t.type === 'transfer' ? '🎯' : cat.icon || '🏷️'}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary, #0F172A)' }}>
                            {t.description}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary, #64748B)' }}>
                            {t.type === 'transfer' ? 'Savings Goal' : cat.label} · {t.paymentMethod || 'Other'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-xs font-bold"
                          style={{
                            color:
                              t.type === 'income' || t.transferType === 'goal_withdrawal'
                                ? 'var(--color-income, #059669)'
                                : t.type === 'transfer'
                                ? '#818CF8'
                                : 'var(--color-expense, #DC2626)',
                          }}
                        >
                          {t.type === 'income' || t.transferType === 'goal_withdrawal' ? '+' : '-'}
                          {formatCurrency(t.amount, currencySymbol)}
                        </span>
                        <button
                          onClick={() => {
                            if (t.type === 'transfer') {
                              navigate('/goals')
                            } else {
                              navigate(`/transactions/${t.id}/edit`)
                            }
                          }}
                          className="p-1 hover:text-indigo-600 transition-colors"
                          style={{ color: 'var(--text-muted, #94A3B8)' }}
                          title={t.type === 'transfer' ? 'View Goal' : 'Edit'}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1 hover:text-red-500 transition-colors"
                          style={{ color: 'var(--text-muted, #94A3B8)' }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Footer Quick Add */}
          <div className="pt-3 border-t mt-4" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
            <button
              onClick={() => navigate('/transactions/new')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Plus size={13} /> Add Transaction on this Day
            </button>
          </div>
        </div>
      </AnimatedGradientBorder>
    </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          title="Delete Transaction"
          description={`Delete "${deleteTarget.description}" (${formatCurrency(deleteTarget.amount, currencySymbol)})?`}
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

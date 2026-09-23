import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, TrendingUp, TrendingDown, Calendar, Plus,
  PiggyBank, ArrowRight, AlertTriangle, Sparkles, CheckCircle2,
  ChevronRight, Info
} from 'lucide-react'
import { useTransactions } from '../context/TransactionContext'
import {
  getTotalIncome, getTotalExpenses, getBalance,
  getMonthlyData, getCategoryData, getRecentTransactions,
} from '../utils/calculations'
import { getBudgetsForMonth, calculateOverallBudget } from '../services/budgetService'
import { getTotalNetWorth } from '../services/accountService'
import { generateSpendingInsights } from '../services/insightService'
import { findCategory } from '../services/categoryService'
import { formatCurrency } from '../utils/formatters'
import SummaryCard from '../components/dashboard/SummaryCard'
import MonthlyChart from '../components/dashboard/MonthlyChart'
import CategoryChart from '../components/dashboard/CategoryChart'
import RecentTransactions from '../components/dashboard/RecentTransactions'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

export default function Dashboard() {
  const { transactions, accounts, budgets, customCategories, warnings, settings } = useTransactions()
  const navigate = useNavigate()
  const symbol = settings?.currencySymbol || '₹'

  // Summary Timeframe: 'this_month' | 'last_month' | 'this_year' | 'all_time'
  const [timeframe, setTimeframe] = useState('this_month')

  // Filter transactions based on selected timeframe
  const scopedTransactions = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    switch (timeframe) {
      case 'this_month':
        return transactions.filter((t) => {
          const d = new Date(t.date)
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth
        })
      case 'last_month': {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
        const lmYear = lastMonthDate.getFullYear()
        const lmMonth = lastMonthDate.getMonth()
        return transactions.filter((t) => {
          const d = new Date(t.date)
          return d.getFullYear() === lmYear && d.getMonth() === lmMonth
        })
      }
      case 'this_year':
        return transactions.filter((t) => {
          const d = new Date(t.date)
          return d.getFullYear() === currentYear
        })
      case 'all_time':
      default:
        return transactions
    }
  }, [transactions, timeframe])

  // Summary Metrics
  const stats = useMemo(() => {
    const inc = getTotalIncome(scopedTransactions)
    const exp = getTotalExpenses(scopedTransactions)
    const net = inc - exp
    const rate = inc > 0 ? ((net / inc) * 100).toFixed(1) : null
    const ratio = inc > 0 ? ((exp / inc) * 100).toFixed(1) : null
    const allBalance = getTotalNetWorth(accounts, transactions)

    return {
      income: inc,
      expenses: exp,
      net,
      savingsRate: rate,
      expenseRatio: ratio,
      totalBalance: allBalance,
    }
  }, [scopedTransactions, transactions, accounts])

  // Current Month Budget Overview
  const currentMonthStr = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const monthBudgets = useMemo(
    () => getBudgetsForMonth(budgets, currentMonthStr),
    [budgets, currentMonthStr]
  )

  const overallBudget = useMemo(
    () => calculateOverallBudget(monthBudgets, transactions, currentMonthStr),
    [monthBudgets, transactions, currentMonthStr]
  )

  // Insights
  const insights = useMemo(
    () => generateSpendingInsights(transactions, customCategories),
    [transactions, customCategories]
  )

  const monthlyData  = useMemo(() => getMonthlyData(transactions, 6), [transactions])
  const categoryData = useMemo(() => getCategoryData(scopedTransactions.length > 0 ? scopedTransactions : transactions, 'expense'), [scopedTransactions, transactions])
  const recent       = useMemo(() => getRecentTransactions(transactions, 5), [transactions])

  const timeframeLabels = {
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    all_time: 'All Time',
  }

  return (
    <div className="space-y-4">
      {/* Timeframe Selector & Overall Balance */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border"
        style={{ borderColor: 'var(--border-color, #E5E7EB)' }}
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted, #64748B)' }}>
            Total Net Balance
          </span>
          <div className="text-2xl font-bold mt-0.5" style={{ color: 'var(--text-primary, #0F172A)' }}>
            {formatCurrency(stats.totalBalance, symbol)}
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900/60 p-1 rounded-xl border text-xs font-medium self-start sm:self-auto overflow-x-auto max-w-full" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
          {Object.entries(timeframeLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTimeframe(key)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                timeframe === key
                  ? 'bg-white dark:bg-slate-700 font-semibold shadow-sm'
                  : 'hover:opacity-80'
              }`}
              style={{
                background: timeframe === key ? 'var(--bg-card, #FFFFFF)' : 'transparent',
                color: timeframe === key ? 'var(--color-accent, #4338CA)' : 'var(--text-secondary, #64748B)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          title={`Income (${timeframeLabels[timeframe]})`}
          value={formatCurrency(stats.income, symbol)}
          subtitle={timeframe === 'this_month' ? 'Current month inflow' : 'Period earnings'}
          icon={TrendingUp}
          color="#10B981"
        />
        <SummaryCard
          title={`Expenses (${timeframeLabels[timeframe]})`}
          value={formatCurrency(stats.expenses, symbol)}
          subtitle={stats.expenseRatio ? `${stats.expenseRatio}% of income` : 'Period spending'}
          icon={TrendingDown}
          color="#EF4444"
        />
        <SummaryCard
          title="Net Savings"
          value={formatCurrency(stats.net, symbol)}
          subtitle={stats.savingsRate !== null ? `Savings Rate: ${stats.savingsRate}%` : 'Savings: N/A'}
          icon={Wallet}
          color="#6366F1"
        />
        <SummaryCard
          title="Monthly Budget Usage"
          value={overallBudget.totalBudget > 0 ? `${overallBudget.percentage.toFixed(0)}%` : 'No Budget'}
          subtitle={
            overallBudget.totalBudget > 0
              ? `${formatCurrency(overallBudget.remaining, symbol)} remaining`
              : 'Set a monthly budget'
          }
          icon={PiggyBank}
          color="#F59E0B"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" padding={false}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Income vs Expenses</h2>
              <span className="text-xs" style={{ color: 'var(--text-secondary, #94A3B8)' }}>Last 6 months trend</span>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs font-semibold hover:underline flex items-center gap-0.5"
              style={{ color: 'var(--color-accent, #6366F1)' }}
            >
              Analytics <ChevronRight size={13} />
            </button>
          </div>
          <div className="px-2 pb-4">
            <MonthlyChart data={monthlyData} currencySymbol={symbol} />
          </div>
        </Card>

        <Card padding={false}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Spending by Category</h2>
            <span className="text-xs" style={{ color: 'var(--text-secondary, #94A3B8)' }}>{timeframeLabels[timeframe]}</span>
          </div>
          <div className="px-2 pb-4">
            <CategoryChart data={categoryData} currencySymbol={symbol} />
          </div>
        </Card>
      </div>

      {/* Budget Overview & Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Budget Overview Card */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle, #F1F5F9)' }}>
            <div className="flex items-center gap-2">
              <PiggyBank size={17} color="#6366F1" />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Budget Status (Current Month)</h3>
            </div>
            <button
              onClick={() => navigate('/budgets')}
              className="text-xs font-semibold hover:underline flex items-center gap-1"
              style={{ color: 'var(--color-accent, #6366F1)' }}
            >
              Manage <ArrowRight size={12} />
            </button>
          </div>

          {overallBudget.totalBudget === 0 ? (
            <div className="py-6 text-center text-xs" style={{ color: 'var(--text-secondary, #94A3B8)' }}>
              <p>No monthly budget limits configured for this month.</p>
              <button
                onClick={() => navigate('/budgets')}
                className="mt-2 text-xs font-semibold hover:underline"
                style={{ color: 'var(--color-accent, #6366F1)' }}
              >
                + Set Budget Limits
              </button>
            </div>
          ) : (
            <div className="pt-3 space-y-3">
              <div className="flex items-baseline justify-between text-xs">
                <span style={{ color: 'var(--text-secondary, #64748B)' }}>
                  {formatCurrency(overallBudget.totalSpent, symbol)} spent of {formatCurrency(overallBudget.totalBudget, symbol)}
                </span>
                <span className={`font-bold ${overallBudget.percentage >= 100 ? 'text-rose-500' : ''}`} style={overallBudget.percentage < 100 ? { color: 'var(--text-primary, #0F172A)' } : {}}>
                  {overallBudget.percentage.toFixed(1)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden" style={{ background: 'var(--border-subtle, #F1F5F9)' }}>
                <div
                  className={`h-full rounded-full transition-all ${
                    overallBudget.percentage >= 100
                      ? 'bg-rose-500'
                      : overallBudget.percentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, overallBudget.percentage)}%` }}
                />
              </div>

              {/* Top budgeted categories mini-list */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {overallBudget.items.slice(0, 4).map((b) => {
                  const cat = findCategory(b.categoryId, 'expense', customCategories)
                  return (
                    <div key={b.id} className="p-2 rounded-lg border text-xs" style={{ background: 'var(--bg-page, #F8FAFC)', borderColor: 'var(--border-color, #E5E7EB)' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate" style={{ color: 'var(--text-primary, #0F172A)' }}>{cat.icon} {cat.label}</span>
                        <span className={`font-bold ${b.isOver ? 'text-rose-500' : ''}`} style={!b.isOver ? { color: 'var(--text-secondary, #475569)' } : {}}>
                          {b.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary, #94A3B8)' }}>
                        {formatCurrency(b.spent, symbol)} / {formatCurrency(b.budgetAmount, symbol)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Financial Insights Card */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle, #F1F5F9)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-amber-500" />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Financial Insights</h3>
            </div>
            {warnings.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold border bg-rose-500/10 text-rose-500 border-rose-500/20">
                {warnings.length} alert{warnings.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="pt-3 space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {insights.map((ins, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-xl border text-xs"
                style={{ background: 'var(--bg-page, #F8FAFC)', borderColor: 'var(--border-color, #E5E7EB)' }}
              >
                <span className="text-base mt-0.5">{ins.icon}</span>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>{ins.title}</p>
                  <p className="mt-0.5 leading-snug" style={{ color: 'var(--text-secondary, #475569)' }}>{ins.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border-subtle, #F1F5F9)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Recent Transactions</h2>
          <Button size="sm" onClick={() => navigate('/transactions/new')}>
            <Plus size={13} /> Add
          </Button>
        </div>
        <div className="px-4 py-2">
          <RecentTransactions transactions={recent} currencySymbol={symbol} />
        </div>
      </Card>
    </div>
  )
}

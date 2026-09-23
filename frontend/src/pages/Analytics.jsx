import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts'
import { useTransactions } from '../context/TransactionContext'
import {
  getMonthlyData, getCategoryData,
  getTotalIncome, getTotalExpenses, getBalance,
} from '../utils/calculations'
import { calculateAccountBalance } from '../services/accountService'
import { findCategory } from '../services/categoryService'
import { formatCurrency, formatShortCurrency } from '../utils/formatters'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import {
  BarChart3, TrendingUp, TrendingDown, Wallet, Calendar,
  PieChart as PieIcon, Award, Activity
} from 'lucide-react'

const CustomTooltip = ({ active, payload, label, currencySymbol }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-3 py-2.5 shadow-lg bg-white dark:bg-slate-900" style={{ borderColor: 'var(--border-color, #E5E7EB)', minWidth: 140 }}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary, #64748B)' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-xs">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>
            {formatShortCurrency(p.value, currencySymbol)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { transactions, accounts, customCategories, settings } = useTransactions()
  const currencySymbol = settings?.currencySymbol || '₹'

  // Time range state for trend: 3, 6, 12 months
  const [timeRange, setTimeRange] = useState(6)

  const totalIncome   = useMemo(() => getTotalIncome(transactions), [transactions])
  const totalExpenses = useMemo(() => getTotalExpenses(transactions), [transactions])
  const netSavings    = totalIncome - totalExpenses
  const savingsRate   = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : null
  const expenseRatio  = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : null

  // Trend data based on selected timeRange (3, 6, 12 months)
  const trendData = useMemo(() => getMonthlyData(transactions, timeRange), [transactions, timeRange])

  // Category analysis with count and average
  const categoryDeepDive = useMemo(() => {
    const expenseTxns = transactions.filter((t) => t.type === 'expense')
    const totalExp = expenseTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const map = new Map()
    expenseTxns.forEach((t) => {
      if (!map.has(t.category)) {
        map.set(t.category, { total: 0, count: 0 })
      }
      const entry = map.get(t.category)
      entry.total += Number(t.amount || 0)
      entry.count += 1
    })

    return Array.from(map.entries()).map(([catId, { total, count }]) => {
      const catObj = findCategory(catId, 'expense', customCategories)
      const percentage = totalExp > 0 ? ((total / totalExp) * 100).toFixed(1) : '0'
      const avg = count > 0 ? Math.round(total / count) : 0
      return {
        id: catId,
        label: catObj.label,
        icon: catObj.icon,
        color: catObj.color,
        amount: total,
        count,
        avg,
        percentage,
      }
    }).sort((a, b) => b.amount - a.amount)
  }, [transactions, customCategories])

  // Highest spending category
  const topCategory = categoryDeepDive[0] || null

  // Daily spending (last 14 days)
  const { dailyData, avgDailySpend } = useMemo(() => {
    const days = []
    const now = new Date()
    let sum14 = 0

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

      const daySpend = transactions
        .filter((t) => t.type === 'expense' && t.date === dateStr)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      sum14 += daySpend
      days.push({ date: label, spent: daySpend })
    }

    const avg = Math.round(sum14 / 14)
    return { dailyData: days, avgDailySpend: avg }
  }, [transactions])

  // Income sources distribution
  const incomeSources = useMemo(() => {
    const incTxns = transactions.filter((t) => t.type === 'income')
    const totalInc = incTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const map = new Map()
    incTxns.forEach((t) => {
      if (!map.has(t.category)) {
        map.set(t.category, 0)
      }
      map.set(t.category, map.get(t.category) + Number(t.amount || 0))
    })

    return Array.from(map.entries()).map(([catId, amount]) => {
      const cat = findCategory(catId, 'income', customCategories)
      return {
        name: cat.label,
        amount,
        color: cat.color || '#10B981',
        percentage: totalInc > 0 ? ((amount / totalInc) * 100).toFixed(1) : '0',
      }
    }).sort((a, b) => b.amount - a.amount)
  }, [transactions, customCategories])

  // Account balance distribution
  const accountDistribution = useMemo(() => {
    return accounts.map((acc) => {
      const bal = calculateAccountBalance(acc, transactions)
      return {
        name: acc.name,
        balance: Math.max(0, bal),
        color: acc.color || '#3B82F6',
        icon: acc.icon || '🏦',
      }
    }).filter((a) => a.balance > 0)
  }, [accounts, transactions])

  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description="Add transactions to see spending trends, category breakdowns, and monthly comparisons."
          actionLabel="+ Add Transaction"
          actionTo="/transactions/new"
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Financial Summary Top Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #64748B)' }}>Total Income</span>
          <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalIncome, currencySymbol)}
          </div>
          <span className="text-[11px] mt-0.5 block" style={{ color: 'var(--text-muted, #94A3B8)' }}>All time earnings</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #64748B)' }}>Total Expenses</span>
          <div className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400">
            {formatCurrency(totalExpenses, currencySymbol)}
          </div>
          <span className="text-[11px] mt-0.5 block" style={{ color: 'var(--text-muted, #94A3B8)' }}>
            {expenseRatio ? `${expenseRatio}% of income` : 'All time spending'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #64748B)' }}>Net Savings</span>
          <div className={`text-xl font-bold mt-1 ${netSavings >= 0 ? '' : 'text-rose-600 dark:text-rose-400'}`} style={{ color: netSavings >= 0 ? 'var(--text-primary, #0F172A)' : undefined }}>
            {netSavings < 0 ? '-' : ''}{formatCurrency(Math.abs(netSavings), currencySymbol)}
          </div>
          <span className="text-[11px] mt-0.5 block" style={{ color: 'var(--text-muted, #94A3B8)' }}>
            Savings Rate: {savingsRate !== null ? `${savingsRate}%` : 'N/A'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #64748B)' }}>Avg Daily Spending</span>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary, #0F172A)' }}>
            {formatCurrency(avgDailySpend, currencySymbol)}
          </div>
          <span className="text-[11px] mt-0.5 block" style={{ color: 'var(--text-muted, #94A3B8)' }}>Past 14-day average</span>
        </div>
      </div>

      {/* Monthly Trend Section with 3/6/12 Month switch */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Monthly Income & Expense Trend</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #94A3B8)' }}>Historical comparison of cash inflow vs outflow</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg border dark:border-slate-700 text-xs font-medium">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTimeRange(m)}
                className={`px-3 py-1 rounded-md transition-all ${
                  timeRange === m
                    ? 'bg-white text-indigo-700 dark:bg-slate-700 dark:text-indigo-300 shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {m} Months
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #F1F5F9)" opacity={0.6} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary, #94A3B8)' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => formatShortCurrency(v, currencySymbol)}
              tick={{ fontSize: 11, fill: 'var(--text-secondary, #94A3B8)' }}
              axisLine={false} tickLine={false} width={60}
            />
            <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
            <Legend
              iconType="circle" iconSize={8}
              formatter={(v) => <span style={{ color: 'var(--text-secondary, #64748B)', fontSize: 11 }}>{v}</span>}
            />
            <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="net" name="Net" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Deep-Dive Table & Top Category Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Table of categories with count & average (2 cols on lg) */}
        <Card className="lg:col-span-2" padding={false}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Category Spending Analysis</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted, #94A3B8)' }}>Breakdown by expense category, volume, and average ticket size</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/50 dark:bg-slate-800/50 font-semibold border-b" style={{ borderColor: 'var(--border-color, #F1F5F9)', color: 'var(--text-secondary, #64748B)' }}>
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Total Spent</th>
                  <th className="px-4 py-3">% of Total</th>
                  <th className="px-4 py-3">Transactions</th>
                  <th className="px-4 py-3">Avg Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color, #F8FAFC)' }}>
                {categoryDeepDive.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-2 font-medium" style={{ color: 'var(--text-primary, #0F172A)' }}>
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: `${cat.color}15`, color: cat.color }}>
                        {cat.icon || '🏷️'}
                      </span>
                      {cat.label}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>
                      {formatCurrency(cat.amount, currencySymbol)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary, #475569)' }}>
                      <div className="flex items-center gap-2">
                        <span>{cat.percentage}%</span>
                        <div className="w-16 bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, cat.percentage)}%`, background: cat.color }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary, #475569)' }}>
                      {cat.count} txns
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary, #475569)' }}>
                      {formatCurrency(cat.avg, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Category Spotlight & Daily Trend (1 col on lg) */}
        <div className="space-y-4">
          {topCategory && (
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl flex-shrink-0">
                  <Award size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Top Expense Category</span>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary, #0F172A)' }}>{topCategory.label}</h3>
                </div>
              </div>
              <div className="text-2xl font-extrabold" style={{ color: 'var(--text-primary, #0F172A)' }}>
                {formatCurrency(topCategory.amount, currencySymbol)}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, #64748B)' }}>
                Accounts for <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{topCategory.percentage}%</strong> of all expenses ({topCategory.count} transactions, avg {formatCurrency(topCategory.avg, currencySymbol)}).
              </p>
            </Card>
          )}

          {/* Daily spending area sparkline */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Daily Spending (14 Days)</span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted, #94A3B8)' }}>Avg {formatCurrency(avgDailySpend, currencySymbol)}/day</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={dailyData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip formatter={(v) => [formatCurrency(v, currencySymbol), 'Spent']} />
                <Area type="monotone" dataKey="spent" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#spendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      {/* Income Sources & Account Balance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income Sources */}
        <Card>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary, #0F172A)' }}>Income Distribution</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted, #94A3B8)' }}>Breakdown of revenue streams</p>
          {incomeSources.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted, #94A3B8)' }}>No income records available</p>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={incomeSources} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    dataKey="amount" nameKey="name"
                  >
                    {incomeSources.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(v, currencySymbol), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2">
                {incomeSources.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary, #475569)' }}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span>{d.name} ({d.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Account Wealth Distribution */}
        <Card>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary, #0F172A)' }}>Account Distribution</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted, #94A3B8)' }}>Distribution of stored funds across wallets & accounts</p>
          {accountDistribution.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted, #94A3B8)' }}>No accounts with positive balances</p>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={accountDistribution} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    dataKey="balance" nameKey="name"
                  >
                    {accountDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(v, currencySymbol), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2">
                {accountDistribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary, #475569)' }}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span>{d.icon} {d.name} ({formatCurrency(d.balance, currencySymbol)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { useTransactions } from '../context/TransactionContext'
import {
  getYearlyMonthlyData,
  getCategoryData,
  getTotalIncome,
  getTotalExpenses,
  getBalance,
  getThisMonthExpenses,
  getThisMonthIncome,
} from '../utils/calculations'
import { formatCurrency, formatShortCurrency } from '../utils/formatters'
import { getCategoryById } from '../data/categories'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import { BarChart3 } from 'lucide-react'

const CustomTooltip = ({ active, payload, label, currencySymbol }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border p-3 shadow-xl" style={{ background: '#1e2130', borderColor: '#2a2d3e' }}>
      <p className="text-xs font-semibold mb-2" style={{ color: '#94a3b8' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-xs">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold" style={{ color: '#f1f5f9' }}>
            {formatShortCurrency(p.value, currencySymbol)}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#2a2d3e' }}>
      <span className="text-sm" style={{ color: '#94a3b8' }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: color || '#f1f5f9' }}>{value}</span>
    </div>
  )
}

export default function Analytics() {
  const { transactions, settings } = useTransactions()
  const symbol = settings?.currencySymbol || '₹'

  const monthlyData = useMemo(() => getYearlyMonthlyData(transactions), [transactions])
  const expenseCategories = useMemo(() => getCategoryData(transactions, 'expense'), [transactions])
  const incomeCategories = useMemo(() => getCategoryData(transactions, 'income'), [transactions])

  const totalIncome = useMemo(() => getTotalIncome(transactions), [transactions])
  const totalExpenses = useMemo(() => getTotalExpenses(transactions), [transactions])
  const balance = useMemo(() => getBalance(transactions), [transactions])
  const thisMonthExp = useMemo(() => getThisMonthExpenses(transactions), [transactions])
  const thisMonthInc = useMemo(() => getThisMonthIncome(transactions), [transactions])

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

  const expChartData = expenseCategories.slice(0, 7).map((d) => {
    const cat = getCategoryById(d.category, 'expense')
    return { name: cat.label, amount: d.amount, fill: cat.color }
  })

  const incChartData = incomeCategories.slice(0, 6).map((d) => {
    const cat = getCategoryById(d.category, 'income')
    return { ...d, label: cat.label, fill: cat.color }
  })

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#64748b' }}>All Time</p>
          <StatRow label="Total Income" value={formatCurrency(totalIncome, symbol)} color="#10b981" />
          <StatRow label="Total Expenses" value={formatCurrency(totalExpenses, symbol)} color="#ef4444" />
          <StatRow label="Net Balance" value={formatCurrency(balance, symbol)} color={balance >= 0 ? '#10b981' : '#ef4444'} />
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#64748b' }}>This Month</p>
          <StatRow label="Income" value={formatCurrency(thisMonthInc, symbol)} color="#10b981" />
          <StatRow label="Expenses" value={formatCurrency(thisMonthExp, symbol)} color="#ef4444" />
          <StatRow label="Net" value={formatCurrency(thisMonthInc - thisMonthExp, symbol)} color={(thisMonthInc - thisMonthExp) >= 0 ? '#10b981' : '#ef4444'} />
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#64748b' }}>Transactions</p>
          <StatRow label="Total" value={transactions.length} />
          <StatRow label="Income entries" value={transactions.filter((t) => t.type === 'income').length} color="#10b981" />
          <StatRow label="Expense entries" value={transactions.filter((t) => t.type === 'expense').length} color="#ef4444" />
        </Card>
      </div>

      {/* Monthly trend */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Monthly Trend ({new Date().getFullYear()})</h2>
        {monthlyData.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: '#475569' }}>No data for this year yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 5, bottom: 0, left: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatShortCurrency(v, symbol)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip currencySymbol={symbol} />} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense categories */}
        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Expense Categories</h2>
          {expenseCategories.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#475569' }}>No expenses yet</p>
          ) : (
            <div className="space-y-2">
              {expenseCategories.map((d) => {
                const cat = getCategoryById(d.category, 'expense')
                const pct = Number(d.percentage)
                return (
                  <div key={d.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                        <span>{cat.icon}</span>{cat.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: '#f1f5f9' }}>
                          {formatCurrency(d.amount, symbol)}
                        </span>
                        <span className="text-xs" style={{ color: '#64748b' }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2a2d3e' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%`, background: cat.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Income categories */}
        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Income Sources</h2>
          {incomeCategories.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#475569' }}>No income recorded yet</p>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={incChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    dataKey="amount" nameKey="label">
                    {incChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(v, symbol), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                {incChartData.map((d) => (
                  <div key={d.category} className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: d.fill, display: 'inline-block' }} />
                    {d.label}
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

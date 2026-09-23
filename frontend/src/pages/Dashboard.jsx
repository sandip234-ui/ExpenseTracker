import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, TrendingUp, TrendingDown, Calendar, Plus } from 'lucide-react'
import { useTransactions } from '../context/TransactionContext'
import {
  getBalance,
  getTotalIncome,
  getTotalExpenses,
  getThisMonthExpenses,
  getThisMonthIncome,
  getMonthlyData,
  getCategoryData,
  getRecentTransactions,
} from '../utils/calculations'
import { formatCurrency } from '../utils/formatters'
import SummaryCard from '../components/dashboard/SummaryCard'
import MonthlyChart from '../components/dashboard/MonthlyChart'
import CategoryChart from '../components/dashboard/CategoryChart'
import RecentTransactions from '../components/dashboard/RecentTransactions'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

export default function Dashboard() {
  const { transactions, settings } = useTransactions()
  const navigate = useNavigate()
  const symbol = settings?.currencySymbol || '₹'

  const stats = useMemo(() => ({
    balance: getBalance(transactions),
    totalIncome: getTotalIncome(transactions),
    totalExpenses: getTotalExpenses(transactions),
    thisMonthExpenses: getThisMonthExpenses(transactions),
    thisMonthIncome: getThisMonthIncome(transactions),
  }), [transactions])

  const monthlyData = useMemo(() => getMonthlyData(transactions, 6), [transactions])
  const categoryData = useMemo(() => getCategoryData(transactions, 'expense'), [transactions])
  const recent = useMemo(() => getRecentTransactions(transactions, 5), [transactions])

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          title="Current Balance"
          value={formatCurrency(stats.balance, symbol)}
          subtitle="Total net balance"
          icon={Wallet}
          color="#6366f1"
        />
        <SummaryCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome, symbol)}
          subtitle="All time income"
          icon={TrendingUp}
          color="#10b981"
        />
        <SummaryCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses, symbol)}
          subtitle="All time expenses"
          icon={TrendingDown}
          color="#ef4444"
        />
        <SummaryCard
          title="This Month"
          value={formatCurrency(stats.thisMonthExpenses, symbol)}
          subtitle={`Income: ${formatCurrency(stats.thisMonthIncome, symbol)}`}
          icon={Calendar}
          color="#f59e0b"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
              Income vs Expenses
            </h2>
            <span className="text-xs" style={{ color: '#64748b' }}>Last 6 months</span>
          </div>
          <MonthlyChart data={monthlyData} currencySymbol={symbol} />
        </Card>

        {/* Category chart */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
              Spending by Category
            </h2>
          </div>
          <CategoryChart data={categoryData} currencySymbol={symbol} />
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Recent Transactions</h2>
          <Button size="sm" onClick={() => navigate('/transactions/new')}>
            <Plus size={13} /> Add
          </Button>
        </div>
        <RecentTransactions transactions={recent} currencySymbol={symbol} />
      </Card>
    </div>
  )
}

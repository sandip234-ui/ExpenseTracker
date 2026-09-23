import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpCircle, ArrowDownCircle, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { getCategoryById } from '../../data/categories'
import EmptyState from '../common/EmptyState'

export default function RecentTransactions({ transactions, currencySymbol = '₹' }) {
  const navigate = useNavigate()

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="No transactions yet"
        description="Add your first transaction to see it here."
        actionLabel="+ Add Transaction"
        actionTo="/transactions/new"
      />
    )
  }

  return (
    <div>
      <div className="divide-y" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
        {transactions.map((t) => {
          const cat = getCategoryById(t.category, t.type)
          const isTransfer = t.type === 'transfer'
          const isDepositToGoal = t.transferType === 'goal_deposit'
          const isWithdrawalFromGoal = t.transferType === 'goal_withdrawal'
          const isPositive = t.type === 'income' || isWithdrawalFromGoal

          return (
            <div
              key={t.id}
              className="flex items-center gap-3 py-2.5 px-1 rounded-lg cursor-pointer hover:bg-gray-50/70 dark:hover:bg-slate-800/60 transition-colors"
              onClick={() => {
                if (isTransfer) {
                  navigate('/goals')
                } else {
                  navigate(`/transactions/${t.id}/edit`)
                }
              }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                style={{ background: isTransfer ? 'rgba(99, 102, 241, 0.14)' : `${cat.color}14` }}
              >
                <span className="text-sm">{isTransfer ? '🎯' : cat.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary, #0F172A)' }}>{t.description}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #94A3B8)' }}>
                  {isTransfer ? 'Savings Goal' : cat.label} · {formatDate(t.date)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {t.type === 'income' ? (
                  <ArrowUpCircle size={13} className="text-emerald-500" />
                ) : isTransfer ? (
                  <ArrowLeftRight size={13} className="text-indigo-400" />
                ) : (
                  <ArrowDownCircle size={13} className="text-rose-500" />
                )}
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: isPositive
                      ? 'var(--color-income, #059669)'
                      : isTransfer
                      ? '#818CF8'
                      : 'var(--color-expense, #DC2626)',
                  }}
                >
                  {isPositive ? '+' : '-'}{formatCurrency(t.amount, currencySymbol)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <button
        onClick={() => navigate('/transactions')}
        className="flex items-center gap-1 mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        View all transactions <ArrowRight size={12} />
      </button>
    </div>
  )
}

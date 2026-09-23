import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpCircle, ArrowDownCircle, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { getCategoryById } from '../../data/categories'
import EmptyState from '../common/EmptyState'
import { ArrowLeftRight } from 'lucide-react'

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
      <div className="space-y-1">
        {transactions.map((t) => {
          const cat = getCategoryById(t.category, t.type)
          return (
            <div key={t.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-colors"
              onClick={() => navigate(`/transactions/${t.id}/edit`)}>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                style={{ background: `${cat.color}18` }}>
                <span className="text-sm">{cat.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>{t.description}</p>
                <p className="text-xs" style={{ color: '#64748b' }}>{cat.label} · {formatDate(t.date)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {t.type === 'income'
                  ? <ArrowUpCircle size={13} color="#10b981" />
                  : <ArrowDownCircle size={13} color="#ef4444" />
                }
                <span className="text-sm font-semibold"
                  style={{ color: t.type === 'income' ? '#10b981' : '#ef4444' }}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currencySymbol)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <button
        onClick={() => navigate('/transactions')}
        className="flex items-center gap-1 mt-4 text-xs font-medium"
        style={{ color: '#6366f1' }}>
        View all transactions <ArrowRight size={12} />
      </button>
    </div>
  )
}

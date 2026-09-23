import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../context/TransactionContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getCategoryById } from '../data/categories'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'
import { Plus, Search, Edit3, Trash2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, SlidersHorizontal } from 'lucide-react'

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].reduce((acc, c) => {
  if (!acc.find((x) => x.id === c.id)) acc.push(c)
  return acc
}, [])

const PAGE_SIZE = 10

const INPUT_STYLE = {
  background: '#13151f',
  border: '1px solid #2a2d3e',
  color: '#f1f5f9',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
}

export default function Transactions() {
  const { transactions, deleteTransaction, settings } = useTransactions()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const currencySymbol = settings?.currencySymbol || '₹'

  const filtered = useMemo(() => {
    let list = [...transactions]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      )
    }

    if (filterType !== 'all') list = list.filter((t) => t.type === filterType)
    if (filterCategory !== 'all') list = list.filter((t) => t.category === filterCategory)
    if (filterDateFrom) list = list.filter((t) => t.date >= filterDateFrom)
    if (filterDateTo) list = list.filter((t) => t.date <= filterDateTo)

    list.sort((a, b) => {
      let av = a[sortField], bv = b[sortField]
      if (sortField === 'amount') { av = Number(av); bv = Number(bv) }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [transactions, search, filterType, filterCategory, filterDateFrom, filterDateTo, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetPage = () => setPage(1)

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
    resetPage()
  }

  const confirmDelete = () => {
    if (deleteTarget) { deleteTransaction(deleteTarget); setDeleteTarget(null) }
  }

  const hasFilters = filterType !== 'all' || filterCategory !== 'all' || filterDateFrom || filterDateTo

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            style={{ ...INPUT_STYLE, paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border"
            style={{
              background: hasFilters ? 'rgba(99,102,241,0.12)' : '#13151f',
              borderColor: hasFilters ? 'rgba(99,102,241,0.4)' : '#2a2d3e',
              color: hasFilters ? '#a5b4fc' : '#94a3b8',
            }}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
          </button>
          <Button onClick={() => navigate('/transactions/new')}>
            <Plus size={16} />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#94a3b8' }}>Type</label>
              <select value={filterType} onChange={(e) => { setFilterType(e.target.value); resetPage() }}
                style={{ ...INPUT_STYLE, width: '100%' }}>
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#94a3b8' }}>Category</label>
              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); resetPage() }}
                style={{ ...INPUT_STYLE, width: '100%' }}>
                <option value="all">All Categories</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#94a3b8' }}>From</label>
              <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); resetPage() }}
                style={{ ...INPUT_STYLE, width: '100%', colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#94a3b8' }}>To</label>
              <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); resetPage() }}
                style={{ ...INPUT_STYLE, width: '100%', colorScheme: 'dark' }} />
            </div>
          </div>
          {hasFilters && (
            <button onClick={() => { setFilterType('all'); setFilterCategory('all'); setFilterDateFrom(''); setFilterDateTo(''); resetPage() }}
              className="mt-3 text-xs" style={{ color: '#6366f1' }}>
              Clear filters
            </button>
          )}
        </Card>
      )}

      {/* Summary counts */}
      {filtered.length > 0 && (
        <p className="text-xs" style={{ color: '#64748b' }}>
          Showing {paginated.length} of {filtered.length} transactions
        </p>
      )}

      {/* Table */}
      <Card padding={false}>
        {paginated.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={transactions.length === 0 ? 'No transactions yet' : 'No results found'}
            description={
              transactions.length === 0
                ? 'Start tracking your finances by adding your first transaction.'
                : 'Try adjusting your search or filters.'
            }
            actionLabel={transactions.length === 0 ? '+ Add Transaction' : undefined}
            actionTo="/transactions/new"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
                  {[
                    { label: 'Date', field: 'date' },
                    { label: 'Description', field: 'description' },
                    { label: 'Category', field: 'category' },
                    { label: 'Method', field: 'paymentMethod' },
                    { label: 'Amount', field: 'amount' },
                  ].map(({ label, field }) => (
                    <th key={field}
                      onClick={() => toggleSort(field)}
                      className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap"
                      style={{ color: sortField === field ? '#a5b4fc' : '#64748b' }}>
                      {label}
                      {sortField === field && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3" style={{ color: '#64748b' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => {
                  const cat = getCategoryById(t.category, t.type)
                  return (
                    <tr key={t.id} className="border-b hover:bg-white/[0.02] transition-colors"
                      style={{ borderColor: '#2a2d3e' }}>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#94a3b8' }}>
                        {formatDate(t.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {t.type === 'income'
                            ? <ArrowUpCircle size={15} color="#10b981" />
                            : <ArrowDownCircle size={15} color="#ef4444" />
                          }
                          <span style={{ color: '#f1f5f9' }} className="font-medium truncate max-w-[180px]">
                            {t.description}
                          </span>
                        </div>
                        {t.notes && <p className="text-xs mt-0.5 pl-5 truncate max-w-[180px]" style={{ color: '#475569' }}>{t.notes}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md"
                          style={{ background: `${cat.color}18`, color: cat.color }}>
                          {cat.icon} {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="neutral">{t.paymentMethod || '—'}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold"
                        style={{ color: t.type === 'income' ? '#10b981' : '#ef4444' }}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currencySymbol)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/transactions/${t.id}/edit`)}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#64748b' }}>
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => setDeleteTarget(t.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: '#64748b' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#2a2d3e' }}>
            <span className="text-xs" style={{ color: '#64748b' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-xs rounded-lg border disabled:opacity-40"
                style={{ background: '#13151f', borderColor: '#2a2d3e', color: '#94a3b8' }}>
                Previous
              </button>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs rounded-lg border disabled:opacity-40"
                style={{ background: '#13151f', borderColor: '#2a2d3e', color: '#94a3b8' }}>
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        title="Delete Transaction"
        description="This action cannot be undone. The transaction will be permanently removed."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../context/TransactionContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getAllCategories, findCategory } from '../services/categoryService'
import { PAYMENT_METHODS } from '../data/categories'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'
import {
  Plus, Search, Edit3, Trash2, Copy,
  ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, SlidersHorizontal,
  Download, X, Check, ChevronDown, FileSpreadsheet, Target
} from 'lucide-react'

const PAGE_SIZE = 10

const inputStyle = {
  background: 'var(--card-bg, #F8FAFC)',
  border: '1px solid var(--border-color, #E5E7EB)',
  color: 'var(--text-primary, #0F172A)',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
}

export default function Transactions() {
  const {
    transactions,
    accounts,
    customCategories,
    deleteTransaction,
    duplicateTransaction,
    exportCSV,
    settings,
    showToast,
  } = useTransactions()

  const navigate = useNavigate()
  const currencySymbol = settings?.currencySymbol || '₹'

  // Search and Filters
  const [search, setSearch]                       = useState('')
  const [filterType, setFilterType]               = useState('all') // 'all' | 'income' | 'expense'
  const [selectedCategories, setSelectedCategories] = useState([]) // array of categoryIds
  const [selectedAccounts, setSelectedAccounts]     = useState([]) // array of accountIds
  const [selectedMethods, setSelectedMethods]       = useState([]) // array of strings
  const [filterDateFrom, setFilterDateFrom]       = useState('')
  const [filterDateTo, setFilterDateTo]           = useState('')
  const [filterAmountMin, setFilterAmountMin]     = useState('')
  const [filterAmountMax, setFilterAmountMax]     = useState('')

  // Sorting: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'name_asc' | 'name_desc'
  const [sortOption, setSortOption]               = useState('date_desc')
  const [page, setPage]                           = useState(1)
  const [deleteTarget, setDeleteTarget]           = useState(null)
  const [showFilterPanel, setShowFilterPanel]     = useState(false)

  const allCategories = useMemo(
    () => getAllCategories('all', customCategories),
    [customCategories]
  )

  // Filter & Sort Logic
  const filtered = useMemo(() => {
    let list = [...transactions]

    // Search query across description, notes, category, account name
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) => {
        const cat = findCategory(t.category, t.type, customCategories)
        const acc = accounts.find((a) => a.id === t.accountId)
        return (
          t.description.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          cat.label.toLowerCase().includes(q) ||
          (acc && acc.name.toLowerCase().includes(q)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q))
        )
      })
    }

    // Type filter
    if (filterType !== 'all') {
      list = list.filter((t) => t.type === filterType)
    }

    // Multi-category filter
    if (selectedCategories.length > 0) {
      list = list.filter((t) => selectedCategories.includes(t.category))
    }

    // Multi-account filter
    if (selectedAccounts.length > 0) {
      list = list.filter((t) => selectedAccounts.includes(t.accountId))
    }

    // Multi-payment method filter
    if (selectedMethods.length > 0) {
      list = list.filter((t) => selectedMethods.includes(t.paymentMethod))
    }

    // Date range
    if (filterDateFrom) {
      list = list.filter((t) => t.date >= filterDateFrom)
    }
    if (filterDateTo) {
      list = list.filter((t) => t.date <= filterDateTo)
    }

    // Amount range
    if (filterAmountMin !== '' && !isNaN(Number(filterAmountMin))) {
      list = list.filter((t) => Number(t.amount) >= Number(filterAmountMin))
    }
    if (filterAmountMax !== '' && !isNaN(Number(filterAmountMax))) {
      list = list.filter((t) => Number(t.amount) <= Number(filterAmountMax))
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortOption) {
        case 'date_asc':
          return new Date(a.date) - new Date(b.date)
        case 'date_desc':
          return new Date(b.date) - new Date(a.date)
        case 'amount_asc':
          return Number(a.amount) - Number(b.amount)
        case 'amount_desc':
          return Number(b.amount) - Number(a.amount)
        case 'name_asc':
          return a.description.localeCompare(b.description)
        case 'name_desc':
          return b.description.localeCompare(a.description)
        default:
          return new Date(b.date) - new Date(a.date)
      }
    })

    return list
  }, [
    transactions, search, filterType, selectedCategories, selectedAccounts,
    selectedMethods, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax,
    sortOption, customCategories, accounts
  ])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const resetPage  = () => setPage(1)

  // Active filter count & chips
  const hasActiveFilters = (
    filterType !== 'all' ||
    selectedCategories.length > 0 ||
    selectedAccounts.length > 0 ||
    selectedMethods.length > 0 ||
    filterDateFrom ||
    filterDateTo ||
    filterAmountMin !== '' ||
    filterAmountMax !== '' ||
    search.trim() !== ''
  )

  const clearAllFilters = () => {
    setSearch('')
    setFilterType('all')
    setSelectedCategories([])
    setSelectedAccounts([])
    setSelectedMethods([])
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterAmountMin('')
    setFilterAmountMax('')
    resetPage()
  }

  // Toggle multi-select helper
  const toggleSelection = (item, currentList, setter) => {
    if (currentList.includes(item)) {
      setter(currentList.filter((x) => x !== item))
    } else {
      setter([...currentList, item])
    }
    resetPage()
  }

  // Duplicate Transaction Handler
  const handleDuplicate = (txn) => {
    const duplicatedData = duplicateTransaction(txn)
    navigate('/transactions/new', { state: { prefill: duplicatedData } })
    showToast('Transaction details duplicated. Modify and save.', 'info')
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteTransaction(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted, #94A3B8)' }} />
          <input
            type="text"
            placeholder="Search descriptions, notes, categories, accounts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            style={{ ...inputStyle, paddingLeft: '2.25rem' }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); resetPage() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-75 transition-opacity"
              style={{ color: 'var(--text-muted, #94A3B8)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilterPanel((f) => !f)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              background: hasActiveFilters ? 'rgba(99, 102, 241, 0.15)' : 'var(--card-bg, #FFFFFF)',
              borderColor: hasActiveFilters ? 'var(--primary-color, #818CF8)' : 'var(--border-color, #E5E7EB)',
              color: hasActiveFilters ? 'var(--primary-color, #818CF8)' : 'var(--text-secondary, #64748B)',
            }}
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>

          {/* Sort Dropdown */}
          <select
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value); resetPage() }}
            className="px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors"
            style={{ borderColor: 'var(--border-color, #E5E7EB)', background: 'var(--card-bg, #FFFFFF)', color: 'var(--text-primary, #475569)' }}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
            <option value="name_asc">A → Z</option>
            <option value="name_desc">Z → A</option>
          </select>

          {/* Export Filtered CSV */}
          <Button
            variant="secondary"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
            title="Export filtered transactions to CSV"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden md:inline">Export CSV</span>
          </Button>

          {/* Add Transaction */}
          <Button onClick={() => navigate('/transactions/new')}>
            <Plus size={15} />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Advanced Filter Drawer / Panel */}
      {showFilterPanel && (
        <Card className="animate-fadeIn">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted, #94A3B8)' }}>Advanced Filters</span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:opacity-80"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Type selector */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary, #374151)' }}>Type</label>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'income', label: 'Income' },
                  { id: 'expense', label: 'Expenses' },
                  { id: 'transfer', label: 'Transfers' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setFilterType(t.id); resetPage() }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      filterType === t.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                    style={{
                      background: filterType === t.id ? undefined : 'var(--card-bg, #FFFFFF)',
                      color: filterType === t.id ? undefined : 'var(--text-secondary, #64748B)',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-Select Categories */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary, #374151)' }}>Categories</label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 border rounded-lg bg-gray-50/50 dark:bg-slate-900/30" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
                {allCategories.map((c) => {
                  const isSelected = selectedCategories.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelection(c.id, selectedCategories, setSelectedCategories)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                      style={{
                        background: isSelected ? undefined : 'var(--card-bg, #FFFFFF)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-secondary, #374151)',
                      }}
                    >
                      <span>{c.icon}</span>
                      <span>{c.label}</span>
                      {isSelected && <Check size={11} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Multi-Select Accounts */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary, #374151)' }}>Accounts</label>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((a) => {
                  const isSelected = selectedAccounts.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleSelection(a.id, selectedAccounts, setSelectedAccounts)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                      style={{
                        background: isSelected ? undefined : 'var(--card-bg, #FFFFFF)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-secondary, #374151)',
                      }}
                    >
                      <span>{a.icon || '🏦'}</span>
                      <span>{a.name}</span>
                      {isSelected && <Check size={11} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date Range & Amount Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary, #374151)' }}>From Date</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => { setFilterDateFrom(e.target.value); resetPage() }}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary, #374151)' }}>To Date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => { setFilterDateTo(e.target.value); resetPage() }}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary, #374151)' }}>Min Amount ({currencySymbol})</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filterAmountMin}
                  onChange={(e) => { setFilterAmountMin(e.target.value); resetPage() }}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary, #374151)' }}>Max Amount ({currencySymbol})</label>
                <input
                  type="number"
                  placeholder="No limit"
                  value={filterAmountMax}
                  onChange={(e) => { setFilterAmountMax(e.target.value); resetPage() }}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted, #94A3B8)' }}>Active filters:</span>

          {filterType !== 'all' && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Type: {filterType}
              <X size={12} className="cursor-pointer hover:opacity-75" onClick={() => setFilterType('all')} />
            </span>
          )}

          {selectedCategories.map((cId) => {
            const cat = findCategory(cId, 'all', customCategories)
            return (
              <span key={cId} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {cat.icon} {cat.label}
                <X
                  size={12}
                  className="cursor-pointer hover:opacity-75"
                  onClick={() => setSelectedCategories(selectedCategories.filter((x) => x !== cId))}
                />
              </span>
            )
          })}

          {selectedAccounts.map((aId) => {
            const acc = accounts.find((a) => a.id === aId) || { name: aId }
            return (
              <span key={aId} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {acc.name}
                <X
                  size={12}
                  className="cursor-pointer hover:opacity-75"
                  onClick={() => setSelectedAccounts(selectedAccounts.filter((x) => x !== aId))}
                />
              </span>
            )
          })}

          {(filterDateFrom || filterDateTo) && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Date: {filterDateFrom || 'Start'} → {filterDateTo || 'Now'}
              <X
                size={12}
                className="cursor-pointer hover:opacity-75"
                onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }}
              />
            </span>
          )}

          {(filterAmountMin !== '' || filterAmountMax !== '') && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Amount: {currencySymbol}{filterAmountMin || '0'} - {currencySymbol}{filterAmountMax || '∞'}
              <X
                size={12}
                className="cursor-pointer hover:opacity-75"
                onClick={() => { setFilterAmountMin(''); setFilterAmountMax('') }}
              />
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-xs text-rose-600 dark:text-rose-400 hover:opacity-80 font-medium ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Count & Summary */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary, #64748B)' }}>
          <span>
            Showing <strong style={{ color: 'var(--text-primary, #0F172A)' }}>{paginated.length}</strong> of <strong style={{ color: 'var(--text-primary, #0F172A)' }}>{filtered.length}</strong> transactions
          </span>
          {hasActiveFilters && (
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Filtered results</span>
          )}
        </div>
      )}

      {/* Transactions Table */}
      <Card padding={false}>
        {paginated.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
            description={
              transactions.length === 0
                ? 'Start tracking your finances by adding your first transaction.'
                : 'Try adjusting or clearing your active filters and search query.'
            }
            actionLabel={transactions.length === 0 ? '+ Add Transaction' : 'Clear Filters'}
            actionOnClick={transactions.length === 0 ? () => navigate('/transactions/new') : clearAllFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50 dark:bg-slate-800/50 text-xs font-semibold" style={{ borderColor: 'var(--border-color, #F1F5F9)', color: 'var(--text-secondary, #64748B)' }}>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Account</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => {
                  const cat = findCategory(t.category, t.type, customCategories)
                  const acc = accounts.find((a) => a.id === t.accountId) || { name: 'Cash', icon: '💵' }

                  return (
                    <tr
                      key={t.id}
                      className="border-b hover:bg-gray-50/70 dark:hover:bg-slate-800/60 transition-colors"
                      style={{ borderColor: 'var(--border-color, #F8FAFC)' }}
                    >
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--text-secondary, #64748B)' }}>
                        {formatDate(t.date)}
                      </td>

                      {/* Description & Notes */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {t.type === 'income' ? (
                            <ArrowUpCircle size={14} className="text-emerald-500 flex-shrink-0" />
                          ) : t.type === 'transfer' ? (
                            <ArrowLeftRight size={14} className="text-indigo-500 flex-shrink-0" />
                          ) : (
                            <ArrowDownCircle size={14} className="text-rose-500 flex-shrink-0" />
                          )}
                          <span className="font-semibold truncate max-w-[180px] sm:max-w-xs" style={{ color: 'var(--text-primary, #0F172A)' }}>
                            {t.description}
                          </span>
                        </div>
                        {t.notes && (
                          <p className="text-xs mt-0.5 pl-5 truncate max-w-[180px] sm:max-w-xs" style={{ color: 'var(--text-muted, #94A3B8)' }}>
                            {t.notes}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium"
                          style={{
                            background: t.type === 'transfer' ? 'rgba(99, 102, 241, 0.12)' : `${cat.color || '#6366F1'}15`,
                            color: t.type === 'transfer' ? '#818CF8' : cat.color,
                          }}
                        >
                          {t.type === 'transfer' ? '🎯' : cat.icon} {t.type === 'transfer' ? 'Savings Goal' : cat.label}
                        </span>
                      </td>

                      {/* Account */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium" style={{ color: 'var(--text-secondary, #475569)' }}>
                        <span className="inline-flex items-center gap-1">
                          {acc.icon} {acc.name}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="neutral">{t.paymentMethod || '—'}</Badge>
                      </td>

                      {/* Amount */}
                      <td
                        className="px-4 py-3 whitespace-nowrap font-bold text-sm"
                        style={{
                          color:
                            t.type === 'income' || t.transferType === 'goal_withdrawal'
                              ? 'var(--color-income, #059669)'
                              : 'var(--color-expense, #DC2626)',
                        }}
                      >
                        {t.type === 'income' || t.transferType === 'goal_withdrawal' ? '+' : '-'}
                        {formatCurrency(t.amount, currencySymbol)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {t.type === 'transfer' ? (
                            <>
                              <button
                                onClick={() => navigate('/goals')}
                                className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                                style={{ color: 'var(--text-muted, #94A3B8)' }}
                                title="View in Savings Goals"
                              >
                                <Target size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(t)}
                                className="p-1.5 rounded-lg hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                style={{ color: 'var(--text-muted, #94A3B8)' }}
                                title="Delete Transfer (Reverses goal contribution)"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleDuplicate(t)}
                                className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                                style={{ color: 'var(--text-muted, #94A3B8)' }}
                                title="Duplicate Transaction"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                onClick={() => navigate(`/transactions/${t.id}/edit`)}
                                className="p-1.5 rounded-lg hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                style={{ color: 'var(--text-muted, #94A3B8)' }}
                                title="Edit Transaction"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(t)}
                                className="p-1.5 rounded-lg hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                style={{ color: 'var(--text-muted, #94A3B8)' }}
                                title="Delete Transaction"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
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
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted, #94A3B8)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-xs rounded-lg border disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                style={{ borderColor: 'var(--border-color, #E5E7EB)', color: 'var(--text-secondary, #374151)', background: 'var(--card-bg, #FFFFFF)' }}
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs rounded-lg border disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                style={{ borderColor: 'var(--border-color, #E5E7EB)', color: 'var(--text-secondary, #374151)', background: 'var(--card-bg, #FFFFFF)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          title="Delete Transaction"
          description={`Are you sure you want to delete "${deleteTarget.description}" (${formatCurrency(deleteTarget.amount, currencySymbol)})? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

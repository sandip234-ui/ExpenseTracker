import React, { useState } from 'react'
import { useTransactions } from '../context/TransactionContext'
import { calculateAccountBalance, getTotalNetWorth } from '../services/accountService'
import { formatCurrency } from '../utils/formatters'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'
import AnimatedGradientBorder from '../components/common/AnimatedGradientBorder'
import {
  Wallet, Plus, Edit3, Trash2, Landmark, Smartphone, CreditCard,
  Layers, ArrowUpRight, ArrowDownLeft
} from 'lucide-react'

const ACCOUNT_TYPES = [
  { id: 'bank', label: 'Bank Account', icon: '🏦', iconComponent: Landmark },
  { id: 'cash', label: 'Cash', icon: '💵', iconComponent: Wallet },
  { id: 'upi', label: 'UPI / Wallet', icon: '📱', iconComponent: Smartphone },
  { id: 'card', label: 'Credit Card', icon: '💳', iconComponent: CreditCard },
  { id: 'other', label: 'Other', icon: '💼', iconComponent: Layers },
]

const COLOR_OPTIONS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#64748B'
]

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

export default function Accounts() {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount, settings } = useTransactions()
  const currencySymbol = settings?.currencySymbol || '₹'

  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    openingBalance: '',
    icon: '🏦',
    color: '#3B82F6',
  })

  const totalNetWorth = getTotalNetWorth(accounts, transactions)

  const openAddModal = () => {
    setEditingAccount(null)
    setFormData({
      name: '',
      type: 'bank',
      openingBalance: '0',
      icon: '🏦',
      color: '#3B82F6',
    })
    setShowModal(true)
  }

  const openEditModal = (acc) => {
    setEditingAccount(acc)
    setFormData({
      name: acc.name,
      type: acc.type || 'bank',
      openingBalance: String(acc.openingBalance ?? 0),
      icon: acc.icon || '🏦',
      color: acc.color || '#3B82F6',
    })
    setShowModal(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: formData.name,
        type: formData.type,
        openingBalance: Number(formData.openingBalance) || 0,
        icon: formData.icon,
        color: formData.color,
      })
    } else {
      addAccount({
        name: formData.name,
        type: formData.type,
        openingBalance: Number(formData.openingBalance) || 0,
        icon: formData.icon,
        color: formData.color,
      })
    }
    setShowModal(false)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteAccount(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Banner with Net Worth & Action */}
      <AnimatedGradientBorder className="rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl border border-transparent">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-secondary, #64748B)' }}>Total Net Worth</span>
            <div className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: totalNetWorth >= 0 ? 'var(--text-primary, #0F172A)' : '#DC2626' }}>
              {formatCurrency(totalNetWorth, currencySymbol)}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted, #94A3B8)' }}>
              Across {accounts.length} active account{accounts.length !== 1 ? 's' : ''} (derived from transactions)
            </p>
          </div>
          <div>
            <Button onClick={openAddModal}>
              <Plus size={16} /> Add Account
            </Button>
          </div>
        </div>
      </AnimatedGradientBorder>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            description="Add your first cash, bank, or wallet account to organize where your money is stored."
            actionLabel="+ Add Account"
            actionOnClick={openAddModal}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const currentBal = calculateAccountBalance(acc, transactions)
            const linkedTxns = transactions.filter((t) => t.accountId === acc.id)
            const totalInc = linkedTxns
              .filter((t) => t.type === 'income' || t.transferType === 'goal_withdrawal')
              .reduce((s, t) => s + Number(t.amount || 0), 0)
            const totalExp = linkedTxns
              .filter((t) => t.type === 'expense' || t.transferType === 'goal_deposit')
              .reduce((s, t) => s + Number(t.amount || 0), 0)

            return (
              <AnimatedGradientBorder key={acc.id} className="rounded-xl h-full">
                <div
                  className="bg-white dark:bg-slate-800 rounded-xl border border-transparent p-5 transition-all hover:shadow-sm flex flex-col justify-between h-full"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: `${acc.color || '#3B82F6'}18`, color: acc.color || '#3B82F6' }}
                        >
                          {acc.icon || '🏦'}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>{acc.name}</h3>
                          <span className="inline-block text-xs uppercase px-2 py-0.5 rounded font-medium mt-0.5" style={{ background: 'var(--badge-bg, #F1F5F9)', color: 'var(--text-secondary, #64748B)' }}>
                            {acc.type || 'bank'}
                          </span>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(acc)}
                          className="p-1.5 rounded-lg hover:text-indigo-600 transition-colors"
                          style={{ color: 'var(--text-muted, #94A3B8)' }}
                          title="Edit Account"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(acc)}
                          className="p-1.5 rounded-lg hover:text-red-500 transition-colors"
                          style={{ color: 'var(--text-muted, #94A3B8)' }}
                          title="Delete Account"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Balance Display */}
                    <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
                      <div className="text-xs" style={{ color: 'var(--text-muted, #94A3B8)' }}>Current Balance</div>
                      <div
                        className="text-xl font-bold mt-0.5"
                        style={{ color: currentBal >= 0 ? 'var(--text-primary, #0F172A)' : '#F87171' }}
                      >
                        {currentBal < 0 ? '-' : ''}{formatCurrency(Math.abs(currentBal), currencySymbol)}
                      </div>
                    </div>
                  </div>

                  {/* Account Details / Stats */}
                  <div className="mt-4 pt-3 border-t grid grid-cols-3 gap-2 text-xs" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
                    <div>
                      <span className="block" style={{ color: 'var(--text-muted, #94A3B8)' }}>Opening</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary, #475569)' }}>
                        {formatCurrency(acc.openingBalance || 0, currencySymbol)}
                      </span>
                    </div>
                    <div>
                      <span className="block flex items-center gap-0.5" style={{ color: 'var(--text-muted, #94A3B8)' }}>
                        <ArrowUpRight size={11} className="text-emerald-500" /> In
                      </span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalInc, currencySymbol)}
                      </span>
                    </div>
                    <div>
                      <span className="block flex items-center gap-0.5" style={{ color: 'var(--text-muted, #94A3B8)' }}>
                        <ArrowDownLeft size={11} className="text-rose-500" /> Out
                      </span>
                      <span className="font-medium text-rose-600 dark:text-rose-400">
                        {formatCurrency(totalExp, currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>
              </AnimatedGradientBorder>
            )
          })}
        </div>
      )}

      {/* Add / Edit Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary, #0F172A)' }}>
              {editingAccount ? 'Edit Account' : 'Create New Account'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label style={labelStyle}>Account Name *</label>
                <input
                  type="text"
                  placeholder="e.g. SBI Salary, Cash Wallet, HDFC Card"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Account Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const sel = ACCOUNT_TYPES.find((t) => t.id === e.target.value)
                      setFormData({
                        ...formData,
                        type: e.target.value,
                        icon: sel ? sel.icon : formData.icon,
                      })
                    }}
                    style={inputStyle}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Opening Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Icon Emoji</label>
                <div className="flex gap-2">
                  {['🏦', '💵', '📱', '💳', '💼', '🪙', '💰', '📈'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-all ${
                        formData.icon === emoji ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                      style={{
                        background: formData.icon === emoji ? undefined : 'var(--card-bg, #FFFFFF)',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Color Tag</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: col })}
                      className="w-6 h-6 rounded-full transition-transform"
                      style={{
                        background: col,
                        outline: formData.color === col ? '2.5px solid var(--text-primary, #0F172A)' : 'none',
                        outlineOffset: '2px',
                        transform: formData.color === col ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingAccount ? 'Save Changes' : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          title={`Delete "${deleteTarget.name}"?`}
          description={`Are you sure you want to delete this account? ${
            transactions.filter((t) => t.accountId === deleteTarget.id).length
          } transaction(s) are associated with it.`}
          confirmLabel="Delete Account"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

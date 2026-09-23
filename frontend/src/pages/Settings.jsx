import React, { useState, useRef } from 'react'
import { useTransactions } from '../context/TransactionContext'
import { CURRENCIES } from '../data/categories'
import { getAllCategories, getCategoryUsageCount } from '../services/categoryService'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import {
  Download, Upload, Trash2, Shield, Globe, CheckCircle, Tag,
  Plus, Edit3, Sun, Moon, Monitor, FileSpreadsheet
} from 'lucide-react'

const inputStyle = {
  background: 'var(--bg-card, #F8FAFC)',
  border: '1px solid var(--border-color, #E5E7EB)',
  color: 'var(--text-primary, #0F172A)',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
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

const COLOR_OPTIONS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#64748B'
]

function Section({ title, description, icon: Icon, children }) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle, #F1F5F9)' }}>
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'var(--color-accent-bg, #EEF2FF)' }}
        >
          <Icon size={17} color="#6366F1" />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>{title}</h2>
          {description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #94A3B8)' }}>{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

export default function Settings() {
  const {
    transactions,
    customCategories,
    settings,
    clearAllTransactions,
    importData,
    updateSettings,
    exportJSON,
    exportCSV,
    addCategory,
    updateCategory,
    deleteCategory,
    showToast,
  } = useTransactions()

  const [showClearModal, setShowClearModal]   = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pendingImport, setPendingImport]     = useState(null)
  const [importPreview, setImportPreview]     = useState(null)
  const [importError, setImportError]         = useState('')
  const [currency, setCurrency]               = useState(settings?.currency || 'INR')
  const [theme, setTheme]                     = useState(settings?.theme || 'light')
  const fileRef = useRef()

  // Category management state
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [catDeleteTarget, setCatDeleteTarget] = useState(null)
  const [reassignTo, setReassignTo] = useState('other')
  const [catForm, setCatForm] = useState({
    label: '',
    icon: '🏷️',
    color: '#6366F1',
    type: 'expense',
  })

  const allCategories = getAllCategories('all', customCategories)

  // ── Theme Switcher ─────────────────────────────────────────────
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    updateSettings({ theme: newTheme })
  }

  // ── Import Handler ─────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      try {
        const parsed = JSON.parse(text)
        const txns = Array.isArray(parsed) ? parsed : parsed?.transactions
        if (!Array.isArray(txns)) {
          setImportError('Invalid file format. No transactions array found.')
          return
        }
        setPendingImport(text)
        setImportPreview({ count: txns.length, file: file.name })
        setShowImportModal(true)
      } catch {
        setImportError('Could not parse file. Make sure it is a valid FinTrack JSON backup.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const confirmImport = () => {
    if (!pendingImport) return
    const result = importData(pendingImport)
    if (result.success) {
      setShowImportModal(false)
      setPendingImport(null)
      setImportPreview(null)
    }
  }

  // ── Currency ───────────────────────────────────────────────────
  const handleSaveCurrency = () => {
    const selected = CURRENCIES.find((c) => c.code === currency)
    if (selected) {
      updateSettings({ currency: selected.code, currencySymbol: selected.symbol })
      showToast('Currency updated!', 'success')
    }
  }

  // ── Category CRUD ──────────────────────────────────────────────
  const openAddCategory = () => {
    setEditingCat(null)
    setCatForm({ label: '', icon: '🏷️', color: '#6366F1', type: 'expense' })
    setShowCatModal(true)
  }

  const openEditCategory = (cat) => {
    setEditingCat(cat)
    setCatForm({
      label: cat.label,
      icon: cat.icon || '🏷️',
      color: cat.color || '#6366F1',
      type: cat.type || 'expense',
    })
    setShowCatModal(true)
  }

  const handleSaveCategory = (e) => {
    e.preventDefault()
    if (!catForm.label.trim()) return

    if (editingCat) {
      updateCategory(editingCat.id, catForm)
    } else {
      addCategory(catForm)
    }
    setShowCatModal(false)
  }

  const handleDeleteCategoryPrompt = (cat) => {
    setCatDeleteTarget(cat)
    setReassignTo('other')
  }

  const confirmDeleteCategory = () => {
    if (catDeleteTarget) {
      deleteCategory(catDeleteTarget.id, reassignTo)
      setCatDeleteTarget(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Appearance & Theme */}
      <Section icon={Sun} title="Appearance" description="Choose your preferred color theme">
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-primary, #374151)' }}>
            Theme Mode
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map((t) => {
              const IconComp = t.icon
              const isSelected = theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleThemeChange(t.id)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all"
                  style={
                    isSelected
                      ? {
                          background: 'var(--color-accent-bg, #EEF2FF)',
                          color: 'var(--color-accent, #4338CA)',
                          borderColor: '#6366F1',
                          borderWidth: '1.5px',
                        }
                      : {
                          background: 'var(--bg-card, #FFFFFF)',
                          color: 'var(--text-secondary, #64748B)',
                          borderColor: 'var(--border-color, #E5E7EB)',
                        }
                  }
                >
                  <IconComp size={15} />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Custom Category Management */}
      <Section icon={Tag} title="Custom Categories" description="Add, rename, or manage transaction categories">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #64748B)' }}>
              {allCategories.length} total categories ({customCategories.length} custom)
            </span>
            <Button size="sm" onClick={openAddCategory}>
              <Plus size={13} /> Add Category
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {allCategories.map((cat) => {
              const usageCount = getCategoryUsageCount(cat.id, transactions)
              const isCustom = cat.isCustom || customCategories.some((c) => c.id === cat.id)

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-white"
                  style={{ borderColor: 'var(--border-subtle, #F1F5F9)', background: 'var(--bg-card, #FFFFFF)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: `${cat.color || '#6366F1'}20`, color: cat.color }}
                    >
                      {cat.icon || '🏷️'}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary, #0F172A)' }}>
                        {cat.label}
                      </p>
                      <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary, #94A3B8)' }}>
                        {usageCount} transaction{usageCount !== 1 ? 's' : ''} {cat.type ? `· ${cat.type}` : ''}
                      </p>
                    </div>
                  </div>

                  {isCustom && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        title="Edit"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategoryPrompt(cat)}
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Data Management */}
      <Section icon={Download} title="Data Management" description="Export, import, or clear your local data">
        <div className="space-y-0">
          {/* JSON Export */}
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border-subtle, #F1F5F9)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Full JSON Backup</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #64748B)' }}>
                Complete backup including accounts, budgets, goals, recurring, and transactions
              </p>
            </div>
            <Button size="sm" onClick={exportJSON}>
              <Download size={13} /> Export JSON
            </Button>
          </div>

          {/* CSV Export */}
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border-subtle, #F1F5F9)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Transactions CSV Export</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #64748B)' }}>
                Download all {transactions.length} transaction(s) as a spreadsheet CSV file
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => exportCSV()} disabled={transactions.length === 0}>
              <FileSpreadsheet size={13} /> Export CSV
            </Button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border-subtle, #F1F5F9)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>Import Data</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #64748B)' }}>
                Load and merge data from a FinTrack JSON backup file
              </p>
              {importError && (
                <p className="text-xs mt-1 text-rose-500 font-medium">{importError}</p>
              )}
            </div>
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> Import JSON
            </Button>
            <input ref={fileRef} type="file" accept=".json,application/json"
              className="hidden" onChange={handleFileChange} />
          </div>

          {/* Clear */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-rose-500">Clear All Application Data</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #64748B)' }}>
                Permanently resets all transactions, accounts, budgets, and goals.
              </p>
            </div>
            <Button size="sm" variant="danger" onClick={() => setShowClearModal(true)}>
              <Trash2 size={13} /> Reset All
            </Button>
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section icon={Globe} title="Currency Settings" description="Customize your display currency">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-primary, #374151)' }}>Currency</label>
          <div className="flex gap-2">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {c.label} ({c.code})</option>
              ))}
            </select>
            <Button size="sm" onClick={handleSaveCurrency}>
              <CheckCircle size={13} /> Save
            </Button>
          </div>
        </div>
      </Section>

      {/* Privacy */}
      <Section icon={Shield} title="Privacy & Security">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-accent-bg, #EEF2FF)', border: '1px solid #C7D2FE' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-accent, #4338CA)' }}>100% Client-Side & Private</p>
          <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-secondary, #475569)' }}>
            FinTrack stores all your transactions, accounts, budgets, and goals locally in your browser's LocalStorage.
            No data is transmitted to external servers.
          </p>
        </div>
      </Section>

      {/* Add / Edit Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary, #0F172A)' }}>
              {editingCat ? 'Edit Category' : 'Create Custom Category'}
            </h2>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label style={labelStyle}>Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Groceries, Gym, Crypto"
                  value={catForm.label}
                  onChange={(e) => setCatForm({ ...catForm, label: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Category Type</label>
                <select
                  value={catForm.type}
                  onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}
                  style={inputStyle}
                >
                  <option value="expense">Expense Only</option>
                  <option value="income">Income Only</option>
                  <option value="both">Both (Expense & Income)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Icon Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {['🍔', '🚗', '🛍️', '🧾', '📚', '🎬', '💊', '✈️', '📱', '🏋️', '💻', '🎁', '🐶', '🏠', '🏷️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCatForm({ ...catForm, icon: emoji })}
                      className={`w-8 h-8 rounded-lg border text-base flex items-center justify-center transition-all ${
                        catForm.icon === emoji ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:bg-gray-50/20'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setCatForm({ ...catForm, color: col })}
                      className="w-6 h-6 rounded-full transition-transform"
                      style={{
                        background: col,
                        outline: catForm.color === col ? '2.5px solid var(--text-primary, #0F172A)' : 'none',
                        outlineOffset: '2px',
                        transform: catForm.color === col ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCatModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingCat ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {catDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
            <h2 className="text-base font-semibold text-rose-500 mb-2">
              Delete Category "{catDeleteTarget.label}"?
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary, #64748B)' }}>
              {getCategoryUsageCount(catDeleteTarget.id, transactions) > 0 ? (
                <>
                  This category is currently used by{' '}
                  <strong style={{ color: 'var(--text-primary, #0F172A)' }}>
                    {getCategoryUsageCount(catDeleteTarget.id, transactions)} transaction(s)
                  </strong>.
                  Please select where to reassign these transactions:
                </>
              ) : (
                'Are you sure you want to permanently delete this category?'
              )}
            </p>

            {getCategoryUsageCount(catDeleteTarget.id, transactions) > 0 && (
              <div className="mb-4">
                <label style={labelStyle}>Move transactions to:</label>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  style={inputStyle}
                >
                  {allCategories
                    .filter((c) => c.id !== catDeleteTarget.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setCatDeleteTarget(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" className="flex-1" onClick={confirmDeleteCategory}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirmation */}
      <Modal
        isOpen={showClearModal}
        title="Reset All Application Data"
        description={`This will permanently delete all ${transactions.length} transaction(s), accounts, budgets, and goals. This action cannot be undone.`}
        confirmLabel="Yes, Reset Everything"
        confirmVariant="danger"
        onConfirm={() => { clearAllTransactions(); setShowClearModal(false) }}
        onCancel={() => setShowClearModal(false)}
      />

      {/* Import confirmation */}
      <Modal
        isOpen={showImportModal}
        title="Import Backup Data"
        description={`Found ${importPreview?.count} transaction(s) in "${importPreview?.file}". Data will be safely merged with your current records.`}
        confirmLabel="Import Data"
        confirmVariant="primary"
        onConfirm={confirmImport}
        onCancel={() => { setShowImportModal(false); setPendingImport(null); setImportPreview(null) }}
      />
    </div>
  )
}

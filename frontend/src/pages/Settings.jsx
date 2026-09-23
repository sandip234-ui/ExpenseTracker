import React, { useState, useRef } from 'react'
import { useTransactions } from '../context/TransactionContext'
import { exportTransactions } from '../services/storage'
import { CURRENCIES } from '../data/categories'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { Download, Upload, Trash2, Shield, Globe, CheckCircle } from 'lucide-react'

const INPUT_STYLE = {
  background: '#13151f',
  border: '1px solid #2a2d3e',
  color: '#f1f5f9',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
}

function Section({ title, description, icon: Icon, children }) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: '#2a2d3e' }}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Icon size={17} color="#6366f1" />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{title}</h2>
          {description && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

export default function Settings() {
  const { transactions, clearAllTransactions, importData, updateSettings, settings, showToast } = useTransactions()
  const [showClearModal, setShowClearModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pendingImport, setPendingImport] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importError, setImportError] = useState('')
  const [currency, setCurrency] = useState(settings?.currency || 'INR')
  const fileRef = useRef()

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = () => {
    const json = exportTransactions()
    const date = new Date().toISOString().split('T')[0]
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fintrack-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported successfully!', 'success')
  }

  // ── Import ────────────────────────────────────────────────────────────────

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

  // ── Currency ──────────────────────────────────────────────────────────────

  const handleSaveCurrency = () => {
    const selected = CURRENCIES.find((c) => c.code === currency)
    if (selected) {
      updateSettings({ currency: selected.code, currencySymbol: selected.symbol })
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Data Management */}
      <Section icon={Download} title="Data Management" description="Export, import or clear your local data">
        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#2a2d3e' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>Export Data</p>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                Download all {transactions.length} transaction(s) as JSON backup
              </p>
            </div>
            <Button size="sm" onClick={handleExport} disabled={transactions.length === 0}>
              <Download size={14} /> Export
            </Button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#2a2d3e' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>Import Data</p>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                Load transactions from a FinTrack JSON backup file
              </p>
              {importError && (
                <p className="text-xs mt-1" style={{ color: '#f87171' }}>{importError}</p>
              )}
            </div>
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Import
            </Button>
            <input ref={fileRef} type="file" accept=".json,application/json"
              className="hidden" onChange={handleFileChange} />
          </div>

          {/* Clear */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium" style={{ color: '#f87171' }}>Clear All Data</p>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                Permanently delete all transactions. This cannot be undone.
              </p>
            </div>
            <Button size="sm" variant="danger" onClick={() => setShowClearModal(true)}
              disabled={transactions.length === 0}>
              <Trash2 size={14} /> Clear
            </Button>
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section icon={Globe} title="Preferences" description="Customize your experience">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>Currency</label>
          <div className="flex gap-2">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              style={{ ...INPUT_STYLE, flex: 1 }}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} style={{ background: '#13151f' }}>
                  {c.symbol} {c.label} ({c.code})
                </option>
              ))}
            </select>
            <Button size="sm" onClick={handleSaveCurrency}>
              <CheckCircle size={14} /> Save
            </Button>
          </div>
          <p className="text-xs mt-1.5" style={{ color: '#475569' }}>
            Currently: {settings?.currencySymbol} ({settings?.currency})
          </p>
        </div>
      </Section>

      {/* Privacy */}
      <Section icon={Shield} title="Privacy">
        <div className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: '#a5b4fc' }}>Your data is 100% private</p>
          <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
            FinTrack stores your transaction data exclusively in your browser's local storage.
            No data is uploaded to any server, cloud service, or third party. Your financial
            information never leaves your device. Clearing your browser data or using incognito
            mode will remove your stored transactions.
          </p>
          <p className="text-xs mt-3" style={{ color: '#475569' }}>
            Transactions stored: <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{transactions.length}</span>
          </p>
        </div>
      </Section>

      {/* About */}
      <div className="text-center py-4">
        <p className="text-xs" style={{ color: '#475569' }}>FinTrack v1.0 · Frontend-only · No backend required</p>
      </div>

      {/* Clear confirmation */}
      <Modal
        isOpen={showClearModal}
        title="Clear All Data"
        description={`This will permanently delete all ${transactions.length} transaction(s). This action cannot be undone. Consider exporting a backup first.`}
        confirmLabel="Yes, Clear Everything"
        confirmVariant="danger"
        onConfirm={() => { clearAllTransactions(); setShowClearModal(false) }}
        onCancel={() => setShowClearModal(false)}
      />

      {/* Import confirmation */}
      <Modal
        isOpen={showImportModal}
        title="Import Data"
        description={`Found ${importPreview?.count} transaction(s) in "${importPreview?.file}". New transactions will be merged with your existing data. Duplicates will be skipped.`}
        confirmLabel="Import"
        confirmVariant="primary"
        onConfirm={confirmImport}
        onCancel={() => { setShowImportModal(false); setPendingImport(null); setImportPreview(null) }}
      />
    </div>
  )
}

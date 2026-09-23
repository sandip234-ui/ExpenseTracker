import React, { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Button from './Button'

export default function Modal({ isOpen, title, description, onConfirm, onCancel, confirmLabel = 'Confirm', confirmVariant = 'danger', children }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-xl bg-white dark:bg-slate-800"
        style={{ borderColor: 'var(--border-color, #E5E7EB)', backgroundColor: 'var(--card-bg, #FFFFFF)' }}
      >
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full"
              style={{ background: 'rgba(239, 68, 68, 0.15)' }}
            >
              <AlertTriangle size={18} color="#EF4444" />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>{title}</h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:opacity-80" style={{ color: 'var(--text-muted, #94A3B8)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          {description && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary, #475569)' }}>{description}</p>}
          {children}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant} className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

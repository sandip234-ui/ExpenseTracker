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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl border shadow-2xl"
        style={{ background: '#1e2130', borderColor: '#2a2d3e' }}>
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full"
              style={{ background: 'rgba(239,68,68,0.12)' }}>
              <AlertTriangle size={20} color="#f87171" />
            </div>
            <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>{title}</h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg" style={{ color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4">
          {description && <p className="text-sm" style={{ color: '#94a3b8' }}>{description}</p>}
          {children}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant} className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

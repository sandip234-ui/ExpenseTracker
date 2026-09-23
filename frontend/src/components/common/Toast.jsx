import React, { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react'

const CONFIG = {
  success: { icon: CheckCircle, bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', iconColor: '#10B981' },
  error:   { icon: XCircle,     bg: '#FEF2F2', border: '#FECACA', color: '#991B1B', iconColor: '#EF4444' },
  info:    { icon: Info,        bg: '#EEF2FF', border: '#C7D2FE', color: '#3730A3', iconColor: '#6366F1' },
  warning: { icon: AlertCircle, bg: '#FFFBEB', border: '#FDE68A', color: '#78350F', iconColor: '#F59E0B' },
}

export default function Toast({ message, variant = 'success', onClose, duration = 3500 }) {
  const c = CONFIG[variant] || CONFIG.success
  const Icon = c.icon

  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [message, onClose, duration])

  return (
    <div
      className="fixed bottom-20 lg:bottom-5 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm"
      style={{ background: c.bg, borderColor: c.border, color: c.color }}
    >
      <Icon size={17} color={c.iconColor} />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100">
        <X size={15} />
      </button>
    </div>
  )
}

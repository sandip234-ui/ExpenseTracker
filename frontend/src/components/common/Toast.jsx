import React, { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react'

const CONFIG = {
  success: { icon: CheckCircle, bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#34d399', iconColor: '#10b981' },
  error:   { icon: XCircle,     bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#f87171', iconColor: '#ef4444' },
  info:    { icon: Info,         bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', color: '#a5b4fc', iconColor: '#6366f1' },
  warning: { icon: AlertCircle,  bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24', iconColor: '#f59e0b' },
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
      className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl max-w-sm"
      style={{ background: c.bg, borderColor: c.border, color: c.color, backdropFilter: 'blur(8px)' }}
    >
      <Icon size={18} color={c.iconColor} />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <X size={16} />
      </button>
    </div>
  )
}

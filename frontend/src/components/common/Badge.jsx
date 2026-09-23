import React from 'react'

const VARIANTS = {
  income: { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' },
  expense: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' },
  default: { background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' },
  warning: { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' },
  neutral: { background: '#1e2130', color: '#94a3b8', border: '1px solid #2a2d3e' },
}

export default function Badge({ children, variant = 'default', className = '' }) {
  const v = VARIANTS[variant] || VARIANTS.default
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}
      style={v}
    >
      {children}
    </span>
  )
}

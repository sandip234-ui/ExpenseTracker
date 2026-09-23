import React from 'react'

const VARIANTS = {
  income:  { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' },
  expense: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
  default: { background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' },
  warning: { background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' },
  neutral: { background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' },
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

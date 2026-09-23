import React from 'react'

const VARIANTS = {
  primary: { background: '#6366f1', color: '#fff', hover: '#4f46e5' },
  secondary: { background: '#1e2130', color: '#94a3b8', border: '1px solid #2a2d3e' },
  danger: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
  success: { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' },
  ghost: { background: 'transparent', color: '#94a3b8' },
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size] || sizes.md} ${className}`}
      style={{ ...v }}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

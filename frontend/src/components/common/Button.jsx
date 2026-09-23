import React from 'react'

const VARIANTS = {
  primary:   { background: '#6366F1', color: '#FFFFFF' },
  secondary: { background: 'var(--card-bg, #FFFFFF)', color: 'var(--text-primary, #374151)', border: '1px solid var(--border-color, #D1D5DB)' },
  danger:    { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
  success:   { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' },
  ghost:     { background: 'transparent', color: 'var(--text-secondary, #6B7280)' },
}

const HOVER = {
  primary:   { background: '#4F46E5' },
  secondary: { background: '#F9FAFB' },
  danger:    { background: '#FEE2E2' },
  success:   { background: '#D1FAE5' },
  ghost:     { background: '#F3F4F6' },
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
    sm:  'px-3 py-1.5 text-xs',
    md:  'px-4 py-2 text-sm',
    lg:  'px-5 py-2.5 text-base',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size] || sizes.md} ${className}`}
      style={{ ...v }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          const h = HOVER[variant]
          if (h?.background) e.currentTarget.style.background = h.background
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = v.background
        }
      }}
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

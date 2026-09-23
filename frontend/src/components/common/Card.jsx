import React from 'react'

/**
 * Card
 *
 * Primary content card component in FinTrack.
 * Restored to clean, stable card without gradient border wrappers.
 */
export default function Card({
  children,
  className = '',
  padding = true,
  style = {},
  onClick,
}) {
  return (
    <div
      className={`rounded-xl border bg-white dark:bg-slate-800 shadow-sm ${padding ? 'p-5' : ''} ${className}`}
      style={{ borderColor: 'var(--border-color, #E5E7EB)', ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

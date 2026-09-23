import React from 'react'

export default function SummaryCard({ title, value, subtitle, icon: Icon, color = '#6366F1' }) {
  return (
    <div
      className="rounded-xl border bg-white dark:bg-slate-800 shadow-sm p-4 h-full flex flex-col justify-between"
      style={{ borderColor: 'var(--border-color, #E5E7EB)' }}
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted, #64748B)' }}>
            {title}
          </p>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
            style={{ background: `${color}18` }}
          >
            <Icon size={16} color={color} />
          </div>
        </div>
        <p className="text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary, #0F172A)' }}>{value}</p>
      </div>
      {subtitle && (
        <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--text-secondary, #475569)' }}>{subtitle}</p>
      )}
    </div>
  )
}

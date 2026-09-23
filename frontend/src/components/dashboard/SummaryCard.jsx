import React from 'react'

export default function SummaryCard({ title, value, subtitle, icon: Icon, color = '#6366f1', trend }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: '#1e2130', borderColor: '#2a2d3e' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748b' }}>{title}</p>
        </div>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
          <Icon size={17} color={color} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>{value}</p>
      {subtitle && <p className="text-xs mt-1" style={{ color: '#64748b' }}>{subtitle}</p>}
      {trend !== undefined && (
        <p className="text-xs mt-2 font-medium" style={{ color: trend >= 0 ? '#10b981' : '#ef4444' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs last month
        </p>
      )}
    </div>
  )
}

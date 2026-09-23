import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getCategoryById } from '../../data/categories'
import { formatCurrency } from '../../utils/formatters'

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CustomTooltip = ({ active, payload, currencySymbol }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border px-3 py-2 shadow-lg bg-white dark:bg-slate-900" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>{d.label}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #64748B)' }}>{formatCurrency(d.amount, currencySymbol)}</p>
    </div>
  )
}

export default function CategoryChart({ data, currencySymbol = '₹' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-36 text-sm" style={{ color: 'var(--text-muted, #94A3B8)' }}>
        <p className="font-medium" style={{ color: 'var(--text-secondary, #CBD5E1)' }}>No expenses yet</p>
        <p className="text-xs mt-1">Add an expense to see breakdown</p>
      </div>
    )
  }

  const chartData = data.slice(0, 6).map((d) => {
    const cat = getCategoryById(d.category, 'expense')
    return { ...d, label: cat.label, fill: cat.color }
  })

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={chartData} cx="50%" cy="50%"
            innerRadius={45} outerRadius={75}
            dataKey="amount" labelLine={false} label={renderCustomLabel}
          >
            {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
          <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-2">
        {chartData.map((d) => (
          <div key={d.category} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary, #475569)' }}>
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: d.fill }} />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

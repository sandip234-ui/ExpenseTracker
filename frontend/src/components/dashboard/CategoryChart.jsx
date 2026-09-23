import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getCategoryById } from '../../data/categories'
import { formatCurrency } from '../../utils/formatters'

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CustomTooltip = ({ active, payload, currencySymbol }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border px-3 py-2 shadow-xl"
      style={{ background: '#1e2130', borderColor: '#2a2d3e' }}>
      <p className="text-xs font-semibold" style={{ color: '#f1f5f9' }}>{d.label}</p>
      <p className="text-xs" style={{ color: '#94a3b8' }}>{formatCurrency(d.amount, currencySymbol)}</p>
    </div>
  )
}

export default function CategoryChart({ data, currencySymbol = '₹' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#475569' }}>
        No expense data yet
      </div>
    )
  }

  const chartData = data.slice(0, 6).map((d) => {
    const cat = getCategoryById(d.category, 'expense')
    return { ...d, label: cat.label, fill: cat.color }
  })

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
            dataKey="amount" labelLine={false} label={renderCustomLabel}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {chartData.map((d) => (
          <div key={d.category} className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.fill }} />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

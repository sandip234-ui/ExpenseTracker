import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatShortCurrency } from '../../utils/formatters'

const CustomTooltip = ({ active, payload, label, currencySymbol }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border p-3 shadow-xl"
      style={{ background: '#1e2130', borderColor: '#2a2d3e', minWidth: 140 }}>
      <p className="text-xs font-semibold mb-2" style={{ color: '#94a3b8' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-xs">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold" style={{ color: '#f1f5f9' }}>
            {formatShortCurrency(p.value, currencySymbol)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlyChart({ data, currencySymbol = '₹' }) {
  if (!data || data.every((d) => d.income === 0 && d.expenses === 0)) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#475569' }}>
        No data yet — add transactions to see the chart
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => formatShortCurrency(v, currencySymbol)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
        <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
        <Legend iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
        <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

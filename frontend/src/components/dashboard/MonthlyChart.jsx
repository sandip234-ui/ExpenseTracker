import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { formatShortCurrency } from '../../utils/formatters'

const CustomTooltip = ({ active, payload, label, currencySymbol }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl border px-3 py-2.5 shadow-lg bg-white dark:bg-slate-900"
      style={{ borderColor: 'var(--border-color, #E5E7EB)', minWidth: 140 }}
    >
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary, #64748B)' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-xs">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>
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
      <div className="flex flex-col items-center justify-center h-36 text-sm" style={{ color: 'var(--text-muted, #94A3B8)' }}>
        <p className="font-medium" style={{ color: 'var(--text-secondary, #CBD5E1)' }}>No data yet</p>
        <p className="text-xs mt-1">Add transactions to see trends</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #F1F5F9)" opacity={0.6} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary, #94A3B8)' }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => formatShortCurrency(v, currencySymbol)}
          tick={{ fontSize: 11, fill: 'var(--text-secondary, #94A3B8)' }}
          axisLine={false} tickLine={false} width={58}
        />
        <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
        <Legend
          iconType="circle" iconSize={7}
          formatter={(v) => <span style={{ color: 'var(--text-secondary, #64748B)', fontSize: 11 }}>{v}</span>}
        />
        <Area type="monotone" dataKey="income" name="Income"
          stroke="#10B981" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
        <Area type="monotone" dataKey="expenses" name="Expenses"
          stroke="#EF4444" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

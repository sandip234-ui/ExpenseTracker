import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, Calendar,
  Repeat, Target, Wallet, BarChart3, Settings, TrendingUp
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/recurring', icon: Repeat, label: 'Recurring' },
  { to: '/goals', icon: Target, label: 'Savings Goals' },
  { to: '/accounts', icon: Wallet, label: 'Accounts & Wallets' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 border-r z-20"
      style={{ background: 'var(--bg-card, #FFFFFF)', borderColor: 'var(--border-color, #E5E7EB)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          <TrendingUp size={16} color="white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary, #0F172A)' }}>FinTrack</p>
          <p className="text-xs" style={{ color: 'var(--text-subtle, #94A3B8)' }}>Personal Finance</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={({ isActive }) => ({
              background: isActive ? 'var(--color-accent-bg, #EEF2FF)' : 'transparent',
              color: isActive ? 'var(--color-accent, #6366F1)' : 'var(--text-secondary, #64748B)',
            })}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <p className="text-xs" style={{ color: 'var(--text-subtle, #94A3B8)' }}>Data stored locally · Private</p>
        </div>
      </div>
    </aside>
  )
}

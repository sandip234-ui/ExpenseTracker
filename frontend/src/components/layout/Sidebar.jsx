import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, Calendar,
  Target, Wallet, BarChart3, Settings, TrendingUp,
  LogOut, User
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/goals', icon: Target, label: 'Savings Goals' },
  { to: '/accounts', icon: Wallet, label: 'Accounts & Wallets' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 border-r z-20"
      style={{ background: 'var(--bg-card, #FFFFFF)', borderColor: 'var(--border-color, #E5E7EB)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
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

      {/* User Session & Logout Footer */}
      <div className="px-4 py-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border-color, #E5E7EB)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EEF2FF', color: '#6366F1' }}>
              <User size={15} />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary, #0F172A)' }}>
                {user?.name || 'Authorized User'}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-subtle, #94A3B8)' }}>
                {user?.email || 'Authenticated'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <p className="text-[10px]" style={{ color: 'var(--text-subtle, #94A3B8)' }}>Encrypted Session · PostgreSQL Authoritative</p>
        </div>
      </div>
    </aside>
  )
}

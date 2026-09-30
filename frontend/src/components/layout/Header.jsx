import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, LogOut } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell'
import { useAuth } from '../../context/AuthContext'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/transactions/new': 'Add Transaction',
  '/budgets': 'Budget Management',
  '/calendar': 'Calendar View',
  '/recurring': 'Recurring Transactions',
  '/goals': 'Savings Goals',
  '/accounts': 'Accounts & Wallets',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const isEditPage = location.pathname.includes('/edit')
  const title = isEditPage
    ? 'Edit Transaction'
    : (PAGE_TITLES[location.pathname] || 'FinTrack')

  const showAddBtn = ['/dashboard', '/transactions', '/calendar'].includes(location.pathname)

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 h-14 border-b"
      style={{
        background: 'var(--header-bg, rgba(255,255,255,0.92))',
        borderColor: 'var(--border-color, #E5E7EB)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          <TrendingUp size={14} color="white" />
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--text-primary, #0F172A)' }}>FinTrack</span>
      </div>

      {/* Desktop page title */}
      <h1 className="hidden lg:block text-base font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>{title}</h1>

      {/* Actions & Alerts */}
      <div className="flex items-center gap-2.5">
        <NotificationBell />

        {showAddBtn && (
          <button
            onClick={() => navigate('/transactions/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white shadow-sm hover:opacity-95 transition-opacity"
            style={{ background: '#6366F1' }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add Transaction</span>
          </button>
        )}

        <button
          onClick={async () => {
            await logout()
            navigate('/login')
          }}
          title="Sign out"
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

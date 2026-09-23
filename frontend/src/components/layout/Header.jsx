import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, TrendingUp } from 'lucide-react'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/transactions/new': 'Add Transaction',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()

  const isEditPage = location.pathname.includes('/edit')
  const title = isEditPage
    ? 'Edit Transaction'
    : (PAGE_TITLES[location.pathname] || 'FinTrack')

  const showAddBtn = ['/dashboard', '/transactions'].includes(location.pathname)

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 h-16 border-b"
      style={{ background: 'rgba(15,17,23,0.95)', borderColor: '#2a2d3e', backdropFilter: 'blur(8px)' }}>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <TrendingUp size={14} color="white" />
        </div>
        <span className="font-bold text-sm" style={{ color: '#f1f5f9' }}>FinTrack</span>
      </div>

      {/* Desktop page title */}
      <h1 className="hidden lg:block text-lg font-semibold" style={{ color: '#f1f5f9' }}>{title}</h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {showAddBtn && (
          <button
            onClick={() => navigate('/transactions/new')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#6366f1' }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Transaction</span>
          </button>
        )}
      </div>
    </header>
  )
}

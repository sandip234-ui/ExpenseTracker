import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, BarChart3, Settings, TrendingUp } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 border-r z-20"
      style={{ background: '#1a1d27', borderColor: '#2a2d3e' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: '#2a2d3e' }}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <TrendingUp size={18} color="white" />
        </div>
        <div>
          <p className="font-bold text-base leading-tight" style={{ color: '#f1f5f9' }}>FinTrack</p>
          <p className="text-xs" style={{ color: '#64748b' }}>Personal Finance</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'text-white'
                  : 'hover:text-white'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: isActive ? '#a5b4fc' : '#64748b',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t" style={{ borderColor: '#2a2d3e' }}>
        <p className="text-xs" style={{ color: '#64748b' }}>Data stored locally</p>
        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Your privacy is protected</p>
      </div>
    </aside>
  )
}

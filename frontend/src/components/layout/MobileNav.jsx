import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, BarChart3, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t"
      style={{ background: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div className="flex">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            style={({ isActive }) => ({
              color: isActive ? '#6366f1' : '#64748b',
            })}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

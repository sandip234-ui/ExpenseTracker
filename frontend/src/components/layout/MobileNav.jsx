import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, Calendar,
  Wallet, Settings, MoreHorizontal
} from 'lucide-react'

const MOBILE_NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Txns' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function MobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t"
      style={{ background: 'var(--card-bg, #FFFFFF)', borderColor: 'var(--border-color, #E5E7EB)' }}
    >
      <div className="flex">
        {MOBILE_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[11px] font-medium transition-colors"
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-accent, #6366F1)' : 'var(--text-secondary, #64748B)',
            })}
          >
            <Icon size={18} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

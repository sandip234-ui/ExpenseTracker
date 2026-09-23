import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import Header from './Header'
import Toast from '../common/Toast'
import { useTransactions } from '../../context/TransactionContext'

export default function AppLayout() {
  const { toast, clearToast } = useTransactions()

  return (
    <div className="flex min-h-screen" style={{ background: '#0f1117' }}>
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 lg:pl-64">
        <Header />
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={clearToast}
        />
      )}
    </div>
  )
}

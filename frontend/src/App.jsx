import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TransactionProvider } from './context/TransactionContext'
import AppLayout from './components/layout/AppLayout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import AddTransaction from './pages/AddTransaction'
import EditTransaction from './pages/EditTransaction'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

export default function App() {
  return (
    <TransactionProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing */}
          <Route path="/" element={<Landing />} />

          {/* App shell routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/new" element={<AddTransaction />} />
            <Route path="/transactions/:id/edit" element={<EditTransaction />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Catch all → dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </TransactionProvider>
  )
}
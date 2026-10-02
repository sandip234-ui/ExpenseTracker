import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TransactionProvider } from './context/TransactionContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import AddTransaction from './pages/AddTransaction'
import EditTransaction from './pages/EditTransaction'
import Budgets from './pages/Budgets'
import Calendar from './pages/Calendar'
import Goals from './pages/Goals'
import Accounts from './pages/Accounts'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TransactionProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Protected app shell routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/transactions/new" element={<AddTransaction />} />
              <Route path="/transactions/:id/edit" element={<EditTransaction />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Catch all → dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </TransactionProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
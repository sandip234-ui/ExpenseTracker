import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TransactionForm from '../components/forms/TransactionForm'
import Card from '../components/common/Card'
import { useTransactions } from '../context/TransactionContext'

export default function AddTransaction() {
  const { addTransaction } = useTransactions()
  const navigate = useNavigate()
  const location = useLocation()

  const prefill = location.state?.prefill || null

  const handleSubmit = (data) => {
    addTransaction(data)
    navigate('/transactions')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary, #0F172A)' }}>
          {prefill ? 'Duplicate Transaction' : 'Add Transaction'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary, #64748B)' }}>
          {prefill ? 'Review prefilled details and save as a new transaction' : 'Record a new income or expense'}
        </p>
      </div>
      <Card>
        <TransactionForm initialData={prefill} onSubmit={handleSubmit} submitLabel={prefill ? 'Save As New Transaction' : 'Add Transaction'} />
      </Card>
    </div>
  )
}

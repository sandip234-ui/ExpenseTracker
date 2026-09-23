import React from 'react'
import { useNavigate } from 'react-router-dom'
import TransactionForm from '../components/forms/TransactionForm'
import Card from '../components/common/Card'
import { useTransactions } from '../context/TransactionContext'

export default function AddTransaction() {
  const { addTransaction } = useTransactions()
  const navigate = useNavigate()

  const handleSubmit = (data) => {
    addTransaction(data)
    navigate('/transactions')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Add Transaction</h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Record a new income or expense</p>
      </div>
      <Card>
        <TransactionForm onSubmit={handleSubmit} submitLabel="Add Transaction" />
      </Card>
    </div>
  )
}

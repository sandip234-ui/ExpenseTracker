import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TransactionForm from '../components/forms/TransactionForm'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import { useTransactions } from '../context/TransactionContext'
import { Search } from 'lucide-react'

export default function EditTransaction() {
  const { id } = useParams()
  const { transactions, updateTransaction } = useTransactions()
  const navigate = useNavigate()

  const transaction = transactions.find((t) => t.id === id)

  if (!transaction) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <EmptyState
            icon={Search}
            title="Transaction not found"
            description="This transaction may have been deleted."
            actionLabel="Back to Transactions"
            actionTo="/transactions"
          />
        </Card>
      </div>
    )
  }

  const handleSubmit = (data) => {
    updateTransaction(id, data)
    navigate('/transactions')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary, #0F172A)' }}>Edit Transaction</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary, #64748B)' }}>Update the transaction details</p>
      </div>
      <Card>
        <TransactionForm
          initialData={transaction}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />
      </Card>
    </div>
  )
}

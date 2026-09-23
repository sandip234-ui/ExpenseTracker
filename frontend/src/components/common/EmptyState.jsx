import React from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  const navigate = useNavigate()
  const handleAction = () => {
    if (onAction) { onAction(); return }
    if (actionTo) navigate(actionTo)
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <Icon size={28} color="#6366f1" />
        </div>
      )}
      <h3 className="text-base font-semibold mb-1" style={{ color: '#f1f5f9' }}>{title}</h3>
      {description && (
        <p className="text-sm mb-6 max-w-xs" style={{ color: '#64748b' }}>{description}</p>
      )}
      {actionLabel && (
        <Button onClick={handleAction}>{actionLabel}</Button>
      )}
    </div>
  )
}

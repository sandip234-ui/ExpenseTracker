import React from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction, actionOnClick }) {
  const navigate = useNavigate()
  const handleAction = () => {
    if (actionOnClick) { actionOnClick(); return }
    if (onAction) { onAction(); return }
    if (actionTo) navigate(actionTo)
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      {Icon && (
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl mb-3"
          style={{ background: 'var(--color-accent-bg, #EEF2FF)', border: '1px solid #C7D2FE' }}
        >
          <Icon size={22} color="#6366F1" />
        </div>
      )}
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary, #0F172A)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-xs mb-4 max-w-xs leading-relaxed" style={{ color: 'var(--text-secondary, #64748B)' }}>
          {description}
        </p>
      )}
      {actionLabel && (
        <Button size="sm" onClick={handleAction}>{actionLabel}</Button>
      )}
    </div>
  )
}

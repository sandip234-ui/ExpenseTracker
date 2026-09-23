import React from 'react'

export default function Card({ children, className = '', padding = true, style = {} }) {
  return (
    <div
      className={`rounded-xl border ${padding ? 'p-5' : ''} ${className}`}
      style={{ background: '#1e2130', borderColor: '#2a2d3e', ...style }}
    >
      {children}
    </div>
  )
}

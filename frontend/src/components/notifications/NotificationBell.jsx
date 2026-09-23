import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../../context/TransactionContext'
import {
  Bell, AlertTriangle, AlertCircle, Info, CheckCircle2,
  ChevronRight, X
} from 'lucide-react'

export default function NotificationBell() {
  const { warnings } = useTransactions()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const count = warnings.length

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'critical':
        return <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />
      case 'warning':
        return <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
      case 'success':
        return <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
      default:
        return <Info size={15} className="text-indigo-600 flex-shrink-0" />
    }
  }

  const getSeverityBg = (sev) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-50/70 border-rose-100 hover:bg-rose-50'
      case 'warning':
        return 'bg-amber-50/70 border-amber-100 hover:bg-amber-50'
      case 'success':
        return 'bg-emerald-50/70 border-emerald-100 hover:bg-emerald-50'
      default:
        return 'bg-indigo-50/70 border-indigo-100 hover:bg-indigo-50'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl border transition-colors bg-white hover:bg-gray-50 text-gray-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
        style={{ borderColor: 'var(--border-color, #E5E7EB)' }}
        title="Notifications & Smart Warnings"
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl border overflow-hidden z-50 animate-fadeIn"
          style={{ backgroundColor: 'var(--card-bg, #FFFFFF)', borderColor: 'var(--border-color, #E5E7EB)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/70 dark:bg-slate-800/80" style={{ borderColor: 'var(--border-color, #F1F5F9)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary, #0F172A)' }}>Smart Alerts</span>
              {count > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-semibold">
                  {count} active
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X size={14} />
            </button>
          </div>

          {/* Warnings List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
            {count === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                <p className="font-semibold" style={{ color: 'var(--text-primary, #1F2937)' }}>You're all caught up!</p>
                <p className="mt-0.5" style={{ color: 'var(--text-muted, #9CA3AF)' }}>No critical budget or account warnings at this time.</p>
              </div>
            ) : (
              warnings.map((w) => (
                <div
                  key={w.id}
                  onClick={() => {
                    if (w.link) navigate(w.link)
                    setIsOpen(false)
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 dark:bg-slate-800/60 dark:border-slate-700/80 ${getSeverityBg(
                    w.severity
                  )}`}
                >
                  <div className="mt-0.5">{getSeverityIcon(w.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>{w.title}</p>
                      <ChevronRight size={13} className="text-gray-400" />
                    </div>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-secondary, #4B5563)' }}>{w.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

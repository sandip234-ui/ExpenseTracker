import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../../context/TransactionContext'
import { useAuth } from '../../context/AuthContext'
import { notificationApi } from '../../services/api/notificationApi'
import {
  Bell, AlertTriangle, AlertCircle, Info, CheckCircle2,
  ChevronRight, X, Trash2
} from 'lucide-react'

export default function NotificationBell() {
  const { warnings } = useTransactions()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, right: 16, width: 384 })
  const [statesMap, setStatesMap] = useState({})
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  // Fetch persisted notification states for the authenticated user
  const fetchStates = useCallback(async () => {
    try {
      const res = await notificationApi.getStates()
      if (res && res.data) {
        const map = {}
        for (const s of res.data) {
          map[s.alertId] = {
            isRead: Boolean(s.isRead),
            isDismissed: Boolean(s.isDismissed),
            createdAt: s.createdAt,
          }
        }
        setStatesMap(map)
      }
    } catch (err) {
      console.warn('Could not load notification states from server:', err.message)
    }
  }, [user?.id])

  useEffect(() => {
    fetchStates()
  }, [fetchStates])

  // Compute active visible notifications
  // Rule 2: Active financial alerts remain while condition exists and auto-resolve when resolved.
  // Rule 3: Dismissed alerts are hidden and persist across refresh/navigation.
  // Rule 5: Informational/non-condition alerts expire after 7 days. Financial alerts do NOT expire.
  const activeWarnings = (warnings || []).filter((w) => {
    const state = statesMap[w.id]
    if (state?.isDismissed) return false

    // Condition-based financial alerts
    const isFinancialAlert =
      w.id.startsWith('budget-crit-') ||
      w.id.startsWith('budget-warn-') ||
      w.id.startsWith('acc-neg-')

    if (!isFinancialAlert) {
      const createdTime = new Date(state?.createdAt || w.createdAt || Date.now()).getTime()
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - createdTime > sevenDaysMs) {
        return false
      }
    }

    return true
  })

  // Bell badge = count of unread active notifications
  const unreadCount = activeWarnings.filter((w) => !statesMap[w.id]?.isRead).length

  // Calculate coordinates for global overlay portal
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const panelWidth = Math.min(384, viewportWidth - 24)
    
    // Right alignment relative to bell button, clamped within viewport
    let right = viewportWidth - rect.right
    let left = rect.right - panelWidth
    if (left < 12) {
      right = Math.max(12, viewportWidth - (12 + panelWidth))
    }

    const top = rect.bottom + 8
    setPosition({
      top,
      right: Math.max(12, right),
      width: panelWidth,
    })
  }, [])

  // Toggle open and mark active unread notifications as read
  const handleToggle = async () => {
    if (!isOpen) {
      updatePosition()
      setIsOpen(true)

      const unreadAlerts = activeWarnings.filter((w) => !statesMap[w.id]?.isRead)
      if (unreadAlerts.length > 0) {
        const unreadIds = unreadAlerts.map((w) => w.id)
        setStatesMap((prev) => {
          const next = { ...prev }
          unreadIds.forEach((id) => {
            next[id] = { ...(next[id] || {}), isRead: true }
          })
          return next
        })

        try {
          await notificationApi.markRead(unreadIds)
        } catch (err) {
          console.warn('Failed to mark notifications read:', err.message)
        }
      }
    } else {
      setIsOpen(false)
    }
  }

  // Dismiss individual notification
  const handleDismiss = async (e, alertId) => {
    e.stopPropagation()
    setStatesMap((prev) => ({
      ...prev,
      [alertId]: { ...(prev[alertId] || {}), isDismissed: true },
    }))

    try {
      await notificationApi.dismiss(alertId)
    } catch (err) {
      console.warn('Failed to dismiss alert:', err.message)
    }
  }

  // Clear all active notifications
  const handleClearAll = async (e) => {
    e.stopPropagation()
    const idsToClear = activeWarnings.map((w) => w.id)
    if (idsToClear.length === 0) return

    setStatesMap((prev) => {
      const next = { ...prev }
      idsToClear.forEach((id) => {
        next[id] = { ...(next[id] || {}), isDismissed: true }
      })
      return next
    })

    try {
      await notificationApi.dismissAll(idsToClear)
    } catch (err) {
      console.warn('Failed to dismiss all alerts:', err.message)
    }
  }

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'critical':
        return <AlertCircle size={15} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
      case 'warning':
        return <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
      case 'success':
        return <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
      default:
        return <Info size={15} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
    }
  }

  const getSeverityBg = (sev) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-50/80 border-rose-100 hover:bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/50 dark:hover:bg-rose-950/40'
      case 'warning':
        return 'bg-amber-50/80 border-amber-100 hover:bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 dark:hover:bg-amber-950/40'
      case 'success':
        return 'bg-emerald-50/80 border-emerald-100 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:hover:bg-emerald-950/40'
      default:
        return 'bg-indigo-50/80 border-indigo-100 hover:bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:hover:bg-indigo-950/40'
    }
  }

  return (
    <div className="relative inline-flex items-center">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        id="notification-bell-btn"
        onClick={handleToggle}
        className="relative p-2 rounded-xl border transition-colors bg-white hover:bg-gray-50 text-gray-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
        style={{ borderColor: 'var(--border-color, #E5E7EB)' }}
        title="Notifications & Smart Warnings"
        aria-label={`Notifications, ${unreadCount} unread`}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            id="notification-badge-count"
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Global Overlay Dropdown Panel via React Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            id="notification-portal-panel"
            className="fixed rounded-2xl shadow-2xl border overflow-hidden animate-fadeIn"
            style={{
              top: `${position.top}px`,
              right: `${position.right}px`,
              width: `${position.width}px`,
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border-color, #E5E7EB)',
              zIndex: 99999,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/80 dark:bg-slate-800/90"
              style={{ borderColor: 'var(--border-color, #F1F5F9)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary, #0F172A)' }}>
                  Smart Alerts
                </span>
                {activeWarnings.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-semibold">
                    {activeWarnings.length} active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {activeWarnings.length > 0 && (
                  <button
                    type="button"
                    id="notification-clear-all-btn"
                    onClick={handleClearAll}
                    title="Clear All Notifications"
                    className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Clear All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close notification panel"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Warnings List */}
            <div className="max-h-84 overflow-y-auto p-2 space-y-1.5">
              {activeWarnings.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                  <p className="font-semibold" style={{ color: 'var(--text-primary, #1F2937)' }}>
                    You're all caught up!
                  </p>
                  <p className="mt-0.5" style={{ color: 'var(--text-muted, #9CA3AF)' }}>
                    No critical budget or account warnings at this time.
                  </p>
                </div>
              ) : (
                activeWarnings.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => {
                      if (w.link) navigate(w.link)
                      setIsOpen(false)
                    }}
                    className={`group relative p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${getSeverityBg(
                      w.severity
                    )}`}
                  >
                    <div className="mt-0.5">{getSeverityIcon(w.severity)}</div>
                    <div className="flex-1 min-w-0 pr-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary, #0F172A)' }}>
                          {w.title}
                        </p>
                        <ChevronRight size={13} className="text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-secondary, #4B5563)' }}>
                        {w.message}
                      </p>
                    </div>

                    {/* Individual Dismiss Button */}
                    <button
                      type="button"
                      title="Dismiss notification"
                      aria-label="Dismiss notification"
                      onClick={(e) => handleDismiss(e, w.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

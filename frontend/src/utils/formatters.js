/**
 * Formatting utilities.
 * currency symbol is derived from settings — never hard-coded.
 */

export function formatCurrency(amount, currencySymbol = '₹') {
  const num = Number(amount) || 0
  return `${currencySymbol}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDate(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d)) return dateString
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatRelativeDate(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateString)
}

export function formatAmount(amount) {
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatShortCurrency(amount, currencySymbol = '₹') {
  const num = Number(amount) || 0
  if (num >= 10000000) return `${currencySymbol}${(num / 10000000).toFixed(1)}Cr`
  if (num >= 100000) return `${currencySymbol}${(num / 100000).toFixed(1)}L`
  if (num >= 1000) return `${currencySymbol}${(num / 1000).toFixed(1)}K`
  return formatCurrency(num, currencySymbol)
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Format currency amount using Indian numbering system by default.
 * Example: 15000 -> "₹15,000.00"
 */
export function formatCurrency(amount, symbol = '₹') {
  const num = Number(amount) || 0
  const formatted = Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${symbol}${formatted}`
}

/**
 * Returns allowed payment methods for an account type.
 */
export function getPaymentMethodsForAccount(account) {
  if (!account) return ['Other']
  const type = String(account.type || '').toLowerCase()
  if (type === 'cash') {
    return ['Cash', 'Other']
  }
  if (type === 'bank') {
    return ['UPI', 'Debit Card', 'Net Banking', 'Cheque', 'Other']
  }
  if (type === 'upi' || type === 'wallet') {
    return ['UPI', 'Wallet', 'Other']
  }
  return ['Cash', 'UPI', 'Debit Card', 'Net Banking', 'Wallet', 'Cheque', 'Other']
}

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍔', color: '#f59e0b' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#3b82f6' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { id: 'bills', label: 'Bills', icon: '🧾', color: '#6366f1' },
  { id: 'education', label: 'Education', icon: '📚', color: '#8b5cf6' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#f43f5e' },
  { id: 'health', label: 'Health', icon: '💊', color: '#10b981' },
  { id: 'travel', label: 'Travel', icon: '✈️', color: '#0ea5e9' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '📱', color: '#a855f7' },
  { id: 'other', label: 'Other', icon: '📦', color: '#78716c' },
]

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: '💼', color: '#10b981' },
  { id: 'freelance', label: 'Freelance', icon: '💻', color: '#3b82f6' },
  { id: 'business', label: 'Business', icon: '🏢', color: '#f59e0b' },
  { id: 'investment', label: 'Investment', icon: '📈', color: '#6366f1' },
  { id: 'gift', label: 'Gift', icon: '🎁', color: '#ec4899' },
  { id: 'other', label: 'Other', icon: '💰', color: '#78716c' },
]

export const PAYMENT_METHODS = [
  'UPI',
  'Cash',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Wallet',
  'Cheque',
  'Other',
]

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
]

export const getCategoryById = (id, type = 'expense') => {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return list.find((c) => c.id === id) || { id, label: id, icon: '📦', color: '#78716c' }
}

export const getCategoriesForType = (type) => {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

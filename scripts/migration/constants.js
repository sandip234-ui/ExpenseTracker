/**
 * FinTrack Controlled LocalStorage -> PostgreSQL Migration Constants
 */

export const SCHEMA_VERSION = 1
export const SOURCE_IDENTIFIER = 'fintrack-localStorage'

export const ENTITY_TYPES = [
  'accounts',
  'categories',
  'transactions',
  'goals',
  'budgets',
  'settings',
]

export const VALID_ACCOUNT_TYPES = [
  'cash',
  'bank',
  'upi',
  'wallet',
  'credit_card',
  'other',
]

export const VALID_TRANSACTION_TYPES = [
  'income',
  'expense',
  'transfer',
]

export const VALID_TRANSFER_TYPES = [
  'goal_deposit',
  'goal_withdrawal',
]

export const VALID_CATEGORY_TYPES = [
  'expense',
  'income',
  'transfer',
  'both',
]

export const DEFAULT_CATEGORY_IDS = [
  'food',
  'transport',
  'shopping',
  'bills',
  'education',
  'entertainment',
  'health',
  'travel',
  'subscriptions',
  'salary',
  'freelance',
  'business',
  'investment',
  'gift',
  'other',
  'savings',
]

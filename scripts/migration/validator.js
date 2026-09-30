/**
 * FinTrack Migration Validator
 * Validates integrity, schemas, relationships, duplicates, and business rules.
 */

import {
  VALID_ACCOUNT_TYPES,
  VALID_TRANSACTION_TYPES,
  VALID_TRANSFER_TYPES,
  VALID_CATEGORY_TYPES,
  VALID_RECURRING_FREQUENCIES,
  DEFAULT_CATEGORY_IDS,
} from './constants.js'

/**
 * Validates the entire migration payload.
 *
 * @param {object} data - Normalized data section
 * @param {object} [existingDbData={}] - Optional known existing DB IDs { accountIds: Set, categoryIds: Set, goalIds: Set }
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateMigrationPayload(data, existingDbData = {}) {
  const errors = []
  const warnings = []

  const existingAccountIds = existingDbData.accountIds || new Set()
  const existingCategoryIds = existingDbData.categoryIds || new Set()
  const existingGoalIds = existingDbData.goalIds || new Set()

  // Track internal IDs for reference checking & duplicate detection
  const payloadAccountIds = new Set()
  const payloadCategoryIds = new Set()
  const payloadGoalIds = new Set()
  const payloadTxnIds = new Set()
  const payloadBudgetIds = new Set()
  const payloadRecurringIds = new Set()
  const budgetCategoryMonthPairs = new Set()

  // ─── 1. Accounts Validation ────────────────────────────────────────────────
  for (const [idx, acc] of (data.accounts || []).entries()) {
    const prefix = `Account[${idx}]`
    if (!acc || typeof acc !== 'object') {
      errors.push(`${prefix}: Must be a valid object.`)
      continue
    }

    if (!acc.id || typeof acc.id !== 'string' || !acc.id.trim()) {
      errors.push(`${prefix}: Missing or invalid 'id'.`)
    } else {
      if (payloadAccountIds.has(acc.id)) {
        errors.push(`${prefix}: Duplicate account ID "${acc.id}" within payload.`)
      }
      payloadAccountIds.add(acc.id)
    }

    if (!acc.name || typeof acc.name !== 'string' || !acc.name.trim()) {
      errors.push(`${prefix} (${acc.id || 'unknown'}): Missing or invalid 'name'.`)
    }

    const type = String(acc.type || '').toLowerCase()
    if (!VALID_ACCOUNT_TYPES.includes(type)) {
      errors.push(`${prefix} (${acc.id}): Invalid account type "${acc.type}". Allowed: ${VALID_ACCOUNT_TYPES.join(', ')}.`)
    }

    if (acc.openingBalance !== undefined && acc.openingBalance !== null) {
      const ob = Number(acc.openingBalance)
      if (isNaN(ob) || !Number.isFinite(ob)) {
        errors.push(`${prefix} (${acc.id}): Invalid openingBalance "${acc.openingBalance}". Must be a finite number.`)
      }
    }
  }

  // Combined set of available accounts (in payload + existing DB)
  const availableAccountIds = new Set([...payloadAccountIds, ...existingAccountIds])

  // ─── 2. Categories Validation ──────────────────────────────────────────────
  for (const [idx, cat] of (data.categories || []).entries()) {
    const prefix = `Category[${idx}]`
    if (!cat || typeof cat !== 'object') {
      errors.push(`${prefix}: Must be a valid object.`)
      continue
    }

    if (!cat.id || typeof cat.id !== 'string' || !cat.id.trim()) {
      errors.push(`${prefix}: Missing or invalid 'id'.`)
    } else {
      if (payloadCategoryIds.has(cat.id)) {
        errors.push(`${prefix}: Duplicate category ID "${cat.id}" within payload.`)
      }
      payloadCategoryIds.add(cat.id)
    }

    const name = cat.name || cat.label
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.push(`${prefix} (${cat.id || 'unknown'}): Missing or invalid category name/label.`)
    }

    if (cat.type && !VALID_CATEGORY_TYPES.includes(cat.type)) {
      errors.push(`${prefix} (${cat.id}): Invalid category type "${cat.type}". Allowed: ${VALID_CATEGORY_TYPES.join(', ')}.`)
    }
  }

  // Combined set of available categories (defaults + payload + existing DB)
  const availableCategoryIds = new Set([
    ...DEFAULT_CATEGORY_IDS,
    ...payloadCategoryIds,
    ...existingCategoryIds,
  ])

  // ─── 3. Goals Validation ───────────────────────────────────────────────────
  for (const [idx, goal] of (data.goals || []).entries()) {
    const prefix = `SavingsGoal[${idx}]`
    if (!goal || typeof goal !== 'object') {
      errors.push(`${prefix}: Must be a valid object.`)
      continue
    }

    if (!goal.id || typeof goal.id !== 'string' || !goal.id.trim()) {
      errors.push(`${prefix}: Missing or invalid 'id'.`)
    } else {
      if (payloadGoalIds.has(goal.id)) {
        errors.push(`${prefix}: Duplicate goal ID "${goal.id}" within payload.`)
      }
      payloadGoalIds.add(goal.id)
    }

    if (!goal.name || typeof goal.name !== 'string' || !goal.name.trim()) {
      errors.push(`${prefix} (${goal.id || 'unknown'}): Missing or invalid goal 'name'.`)
    }

    const targetAmount = Number(goal.targetAmount)
    if (isNaN(targetAmount) || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      errors.push(`${prefix} (${goal.id}): Invalid targetAmount "${goal.targetAmount}". Must be a number > 0.`)
    }

    if (goal.currentAmount !== undefined && goal.currentAmount !== null) {
      const curAmount = Number(goal.currentAmount)
      if (isNaN(curAmount) || !Number.isFinite(curAmount) || curAmount < 0) {
        errors.push(`${prefix} (${goal.id}): Invalid currentAmount "${goal.currentAmount}". Must be a number >= 0.`)
      }
    }

    if (goal.targetDate) {
      const d = new Date(goal.targetDate)
      if (isNaN(d.getTime())) {
        errors.push(`${prefix} (${goal.id}): Invalid targetDate "${goal.targetDate}". Must be a valid date.`)
      }
    }
  }

  const availableGoalIds = new Set([...payloadGoalIds, ...existingGoalIds])

  // ─── 4. Budgets Validation ─────────────────────────────────────────────────
  const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/
  for (const [idx, b] of (data.budgets || []).entries()) {
    const prefix = `Budget[${idx}]`
    if (!b || typeof b !== 'object') {
      errors.push(`${prefix}: Must be a valid object.`)
      continue
    }

    if (!b.id || typeof b.id !== 'string' || !b.id.trim()) {
      errors.push(`${prefix}: Missing or invalid 'id'.`)
    } else {
      if (payloadBudgetIds.has(b.id)) {
        errors.push(`${prefix}: Duplicate budget ID "${b.id}" within payload.`)
      }
      payloadBudgetIds.add(b.id)
    }

    if (!b.categoryId || !availableCategoryIds.has(b.categoryId)) {
      errors.push(`${prefix} (${b.id}): Broken reference. categoryId "${b.categoryId}" not found in categories.`)
    }

    if (!b.month || !monthRegex.test(b.month)) {
      errors.push(`${prefix} (${b.id}): Invalid month "${b.month}". Expected format YYYY-MM.`)
    }

    const amount = Number(b.amount)
    if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0) {
      errors.push(`${prefix} (${b.id}): Invalid amount "${b.amount}". Must be a positive number > 0.`)
    }

    // Check unique (categoryId, month) within payload
    if (b.categoryId && b.month) {
      const pairKey = `${b.categoryId}__${b.month}`
      if (budgetCategoryMonthPairs.has(pairKey)) {
        errors.push(`${prefix} (${b.id}): Duplicate budget constraint for category "${b.categoryId}" in month "${b.month}".`)
      }
      budgetCategoryMonthPairs.add(pairKey)
    }
  }

  // ─── 5. Recurring Transactions Validation ──────────────────────────────────
  for (const [idx, r] of (data.recurringTransactions || []).entries()) {
    const prefix = `RecurringTransaction[${idx}]`
    if (!r || typeof r !== 'object') {
      errors.push(`${prefix}: Must be a valid object.`)
      continue
    }

    if (!r.id || typeof r.id !== 'string' || !r.id.trim()) {
      errors.push(`${prefix}: Missing or invalid 'id'.`)
    } else {
      if (payloadRecurringIds.has(r.id)) {
        errors.push(`${prefix}: Duplicate recurring ID "${r.id}" within payload.`)
      }
      payloadRecurringIds.add(r.id)
    }

    if (!r.description || typeof r.description !== 'string' || !r.description.trim()) {
      errors.push(`${prefix} (${r.id}): Missing or invalid 'description'.`)
    }

    const amount = Number(r.amount)
    if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0) {
      errors.push(`${prefix} (${r.id}): Invalid amount "${r.amount}". Must be a positive number > 0.`)
    }

    const type = String(r.type || '').toLowerCase()
    if (!['income', 'expense'].includes(type)) {
      errors.push(`${prefix} (${r.id}): Invalid type "${r.type}". Must be 'income' or 'expense'.`)
    }

    const freq = String(r.frequency || '').toLowerCase()
    if (!VALID_RECURRING_FREQUENCIES.includes(freq)) {
      errors.push(`${prefix} (${r.id}): Invalid frequency "${r.frequency}". Allowed: ${VALID_RECURRING_FREQUENCIES.join(', ')}.`)
    }

    if (!r.accountId || !availableAccountIds.has(r.accountId)) {
      errors.push(`${prefix} (${r.id}): Broken reference. accountId "${r.accountId}" not found in accounts.`)
    }

    const catId = r.categoryId || r.category
    if (catId && !availableCategoryIds.has(catId)) {
      warnings.push(`${prefix} (${r.id}): Category "${catId}" not found in category taxonomy; will default to null.`)
    }

    if (r.startDate) {
      const sd = new Date(r.startDate)
      if (isNaN(sd.getTime())) {
        errors.push(`${prefix} (${r.id}): Invalid startDate "${r.startDate}".`)
      }
    } else {
      errors.push(`${prefix} (${r.id}): Missing required startDate.`)
    }

    if (r.nextOccurrence) {
      const no = new Date(r.nextOccurrence)
      if (isNaN(no.getTime())) {
        errors.push(`${prefix} (${r.id}): Invalid nextOccurrence "${r.nextOccurrence}".`)
      }
    }
  }

  // ─── 6. Transactions Validation ────────────────────────────────────────────
  for (const [idx, t] of (data.transactions || []).entries()) {
    const prefix = `Transaction[${idx}]`
    if (!t || typeof t !== 'object') {
      errors.push(`${prefix}: Must be a valid object.`)
      continue
    }

    if (!t.id || typeof t.id !== 'string' || !t.id.trim()) {
      errors.push(`${prefix}: Missing or invalid 'id'.`)
    } else {
      if (payloadTxnIds.has(t.id)) {
        errors.push(`${prefix}: Duplicate transaction ID "${t.id}" within payload.`)
      }
      payloadTxnIds.add(t.id)
    }

    const type = String(t.type || '').toLowerCase()
    if (!VALID_TRANSACTION_TYPES.includes(type)) {
      errors.push(`${prefix} (${t.id}): Invalid transaction type "${t.type}". Allowed: ${VALID_TRANSACTION_TYPES.join(', ')}.`)
    }

    const amount = Number(t.amount)
    if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0) {
      errors.push(`${prefix} (${t.id}): Invalid amount "${t.amount}". Must be a positive number > 0.`)
    }

    if (!t.description || typeof t.description !== 'string' || !t.description.trim()) {
      errors.push(`${prefix} (${t.id}): Missing or empty description.`)
    }

    if (!t.date) {
      errors.push(`${prefix} (${t.id}): Missing transaction date.`)
    } else {
      const d = new Date(t.date)
      if (isNaN(d.getTime())) {
        errors.push(`${prefix} (${t.id}): Invalid date "${t.date}".`)
      }
    }

    // Account reference
    if (!t.accountId) {
      errors.push(`${prefix} (${t.id}): Missing required accountId.`)
    } else if (!availableAccountIds.has(t.accountId)) {
      errors.push(`${prefix} (${t.id}): Broken reference. accountId "${t.accountId}" not found in accounts.`)
    }

    // Goal transfers validation
    if (type === 'transfer') {
      if (!t.transferType || !VALID_TRANSFER_TYPES.includes(t.transferType)) {
        errors.push(`${prefix} (${t.id}): Transfer transaction must have valid transferType ('goal_deposit' or 'goal_withdrawal').`)
      }

      if (!t.goalId) {
        errors.push(`${prefix} (${t.id}): Goal transfer transaction missing required goalId.`)
      } else if (!availableGoalIds.has(t.goalId)) {
        errors.push(`${prefix} (${t.id}): Broken reference. goalId "${t.goalId}" not found in savings goals.`)
      }
    }

    // Category reference check
    const catId = t.categoryId || t.category
    if (catId && !availableCategoryIds.has(catId)) {
      warnings.push(`${prefix} (${t.id}): Unknown category "${catId}". Will be linked as null category.`)
    }
  }

  // ─── 7. Settings Validation ────────────────────────────────────────────────
  if (data.settings && typeof data.settings !== 'object') {
    errors.push('Settings must be an object of key-value pairs.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

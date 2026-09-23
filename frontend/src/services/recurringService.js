import { STORAGE_KEYS, safeRead, safeWrite } from './storageService'
import { v4 as uuidv4 } from 'uuid'
import { todayISO } from '../utils/formatters'

export function getRecurringTransactions() {
  const recurring = safeRead(STORAGE_KEYS.RECURRING, [])
  return Array.isArray(recurring) ? recurring : []
}

export function saveRecurringTransactions(recurring) {
  safeWrite(STORAGE_KEYS.RECURRING, recurring)
  return recurring
}

export function addRecurringTransaction(rule) {
  const list = getRecurringTransactions()
  const updated = [...list, rule]
  safeWrite(STORAGE_KEYS.RECURRING, updated)
  return updated
}

export function updateRecurringTransaction(id, updatedFields) {
  const list = getRecurringTransactions()
  const updated = list.map((r) => (r.id === id ? { ...r, ...updatedFields, id } : r))
  safeWrite(STORAGE_KEYS.RECURRING, updated)
  return updated
}

export function deleteRecurringTransaction(id) {
  const list = getRecurringTransactions()
  const updated = list.filter((r) => r.id !== id)
  safeWrite(STORAGE_KEYS.RECURRING, updated)
  return updated
}

/**
 * Computes the next date given a base date and frequency.
 */
export function getNextDate(dateStr, frequency) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return todayISO()

  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
    default:
      d.setMonth(d.getMonth() + 1)
  }
  return d.toISOString().split('T')[0]
}

/**
 * Checks all active recurring transactions and generates due transactions.
 * Prevents duplicates by recording lastGeneratedDate.
 * Returns { generatedTransactions: [], updatedRules: [] }
 */
export function checkAndGenerateRecurringTransactions(recurringRules = [], existingTransactions = []) {
  const today = todayISO()
  const generatedTransactions = []
  let rulesChanged = false

  const updatedRules = recurringRules.map((rule) => {
    if (!rule.active) return rule

    let next = rule.nextOccurrence || rule.startDate
    let lastGen = rule.lastGeneratedDate
    let currentRule = { ...rule }

    // Check if endDate is exceeded
    if (rule.endDate && next > rule.endDate) {
      rulesChanged = true
      return { ...rule, active: false }
    }

    // Process all occurrences up to today (safe max loop of 24 to avoid infinite loops)
    let loopCount = 0
    while (next <= today && loopCount < 24) {
      loopCount++

      if (rule.endDate && next > rule.endDate) {
        currentRule.active = false
        break
      }

      // Check if already generated for this date
      const alreadyGenerated = lastGen === next || existingTransactions.some(
        (t) => t.recurringId === rule.id && t.date === next
      )

      if (!alreadyGenerated) {
        const newTxn = {
          id: uuidv4(),
          recurringId: rule.id,
          type: rule.type || 'expense',
          amount: Number(rule.amount),
          description: rule.description,
          category: rule.categoryId || 'other',
          accountId: rule.accountId || 'account-cash',
          date: next,
          paymentMethod: 'Recurring',
          notes: `Auto-generated recurring transaction (${rule.frequency})`,
          createdAt: new Date().toISOString(),
        }
        generatedTransactions.push(newTxn)
        lastGen = next
        currentRule.lastGeneratedDate = next
        rulesChanged = true
      }

      // Advance to next cycle
      const upcoming = getNextDate(next, rule.frequency)
      if (upcoming <= next) break // Safety against invalid date math
      next = upcoming
      currentRule.nextOccurrence = next
      rulesChanged = true
    }

    return currentRule
  })

  return {
    generatedTransactions,
    updatedRules,
    rulesChanged,
  }
}

/**
 * Transaction form validation.
 * Returns { valid: boolean, errors: { field: string } }
 */
export function validateTransaction(data) {
  const errors = {}

  if (!data.type || !['income', 'expense'].includes(data.type)) {
    errors.type = 'Please select a transaction type.'
  }

  const amount = Number(data.amount)
  if (!data.amount || isNaN(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than zero.'
  }

  if (!data.description || String(data.description).trim().length === 0) {
    errors.description = 'Description is required.'
  } else if (String(data.description).trim().length > 200) {
    errors.description = 'Description must be 200 characters or less.'
  }

  if (!data.category || String(data.category).trim().length === 0) {
    errors.category = 'Please select a category.'
  }

  if (!data.date) {
    errors.date = 'Date is required.'
  } else {
    const d = new Date(data.date)
    if (isNaN(d.getTime())) {
      errors.date = 'Please enter a valid date.'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Validate imported backup JSON structure.
 */
export function validateImportData(parsed) {
  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, error: 'File must contain a JSON object.' }
  }

  const transactions = Array.isArray(parsed) ? parsed : parsed?.transactions

  if (!Array.isArray(transactions)) {
    return { valid: false, error: 'No "transactions" array found in the backup file.' }
  }

  if (transactions.length === 0) {
    return { valid: true, warning: 'The file contains zero transactions.' }
  }

  const required = ['id', 'type', 'amount', 'description', 'category', 'date']
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    for (const field of required) {
      if (t[field] === undefined || t[field] === null || t[field] === '') {
        return { valid: false, error: `Transaction at index ${i} is missing required field: "${field}".` }
      }
    }
    if (!['income', 'expense'].includes(t.type)) {
      return { valid: false, error: `Transaction at index ${i} has invalid type "${t.type}". Must be "income" or "expense".` }
    }
    if (isNaN(Number(t.amount)) || Number(t.amount) <= 0) {
      return { valid: false, error: `Transaction at index ${i} has invalid amount "${t.amount}".` }
    }
  }

  return { valid: true }
}

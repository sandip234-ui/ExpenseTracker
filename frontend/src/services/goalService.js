import { STORAGE_KEYS, safeRead, safeWrite } from './storageService.js'

export function getGoals() {
  const goals = safeRead(STORAGE_KEYS.GOALS, [])
  return Array.isArray(goals) ? goals : []
}

export function saveGoals(goals) {
  safeWrite(STORAGE_KEYS.GOALS, goals)
  return goals
}

export function addGoal(goal) {
  const goals = getGoals()
  const updated = [...goals, goal]
  safeWrite(STORAGE_KEYS.GOALS, updated)
  return updated
}

export function updateGoal(id, updatedFields) {
  const goals = getGoals()
  const updated = goals.map((g) => (g.id === id ? { ...g, ...updatedFields, id } : g))
  safeWrite(STORAGE_KEYS.GOALS, updated)
  return updated
}

export function deleteGoal(id) {
  const goals = getGoals()
  const updated = goals.filter((g) => g.id !== id)
  safeWrite(STORAGE_KEYS.GOALS, updated)
  return updated
}

import { calculateAccountBalance } from './accountService.js'

export function contributeToGoal(id, deltaAmount, accountId = null) {
  const numDelta = Number(deltaAmount)
  if (numDelta > 0) {
    return depositToGoal({ goalId: id, amount: numDelta, sourceAccountId: accountId })
  } else if (numDelta < 0) {
    return withdrawFromGoal({ goalId: id, amount: Math.abs(numDelta), destinationAccountId: accountId })
  }
  throw new Error('Please enter a valid non-zero amount.')
}

/**
 * Strict business logic validation for depositing funds from an account into a savings goal.
 * Enforces:
 * 1. amount > 0 and is finite number
 * 2. goal exists
 * 3. source account exists
 * 4. amount <= available balance of source account
 * 5. amount <= remaining target (prevents overfunding)
 * 6. atomic updates to both goal and transaction record
 */
export function depositToGoal({
  goalId,
  amount,
  sourceAccountId,
  accounts: passedAccounts,
  transactions: passedTransactions,
  goals: passedGoals,
}) {
  const numAmount = Number(amount)
  if (!Number.isFinite(numAmount) || isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Please enter a valid amount greater than ₹0.')
  }

  const allGoals = passedGoals || getGoals()
  const goal = allGoals.find((g) => g.id === goalId)
  if (!goal) {
    throw new Error('Savings goal not found.')
  }

  const allAccounts = passedAccounts || safeRead(STORAGE_KEYS.ACCOUNTS, [])
  const sourceAccount = allAccounts.find((a) => a.id === sourceAccountId) || allAccounts[0]
  if (!sourceAccount) {
    throw new Error('Please select a valid source account.')
  }

  const allTransactions = passedTransactions || safeRead(STORAGE_KEYS.TRANSACTIONS, [])
  const availableBalance = calculateAccountBalance(sourceAccount, allTransactions)

  if (numAmount > availableBalance) {
    const formattedBal = availableBalance.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    throw new Error(`Insufficient balance. Available balance in ${sourceAccount.name}: ₹${formattedBal}`)
  }

  const targetAmount = Number(goal.targetAmount) || 0
  const currentAmount = Number(goal.currentAmount) || 0
  const remainingTarget = Math.max(0, targetAmount - currentAmount)

  if (targetAmount > 0 && numAmount > remainingTarget) {
    const formattedRemaining = remainingTarget.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    throw new Error(`Only ₹${formattedRemaining} remaining to reach this goal.`)
  }

  // Atomic update: Goal balance increases
  const newCurrentAmount = currentAmount + numAmount
  const updatedGoals = allGoals.map((g) =>
    g.id === goalId ? { ...g, currentAmount: newCurrentAmount } : g
  )

  // Transaction record: Auditable transfer that reduces account balance without creating new income
  const txnRecord = {
    id: `txn-goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: new Date().toISOString().split('T')[0],
    amount: numAmount,
    type: 'transfer',
    transferType: 'goal_deposit',
    accountId: sourceAccount.id,
    goalId: goal.id,
    goalName: goal.name,
    category: 'savings',
    description: `Transfer to Savings Goal — ${goal.name}`,
    paymentMethod:
      sourceAccount.type === 'upi'
        ? 'UPI'
        : sourceAccount.type === 'cash'
        ? 'Cash'
        : 'Net Banking',
    notes: `Transferred to savings goal "${goal.name}" from ${sourceAccount.name}`,
    createdAt: new Date().toISOString(),
  }

  const updatedTransactions = [txnRecord, ...allTransactions]

  // Persist both atomically
  safeWrite(STORAGE_KEYS.GOALS, updatedGoals)
  safeWrite(STORAGE_KEYS.TRANSACTIONS, updatedTransactions)

  return {
    success: true,
    updatedGoals,
    updatedTransactions,
    transactionRecord: txnRecord,
    updatedGoal: { ...goal, currentAmount: newCurrentAmount },
    sourceAccount,
    remainingAccountBalance: availableBalance - numAmount,
  }
}

/**
 * Strict business logic validation for withdrawing funds from a savings goal into a destination account.
 * Enforces:
 * 1. amount > 0 and is finite number
 * 2. goal exists
 * 3. destination account exists
 * 4. amount <= current goal balance
 * 5. atomic updates to both goal and transaction record (no artificial income)
 */
export function withdrawFromGoal({
  goalId,
  amount,
  destinationAccountId,
  accounts: passedAccounts,
  transactions: passedTransactions,
  goals: passedGoals,
}) {
  const numAmount = Number(amount)
  if (!Number.isFinite(numAmount) || isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Please enter a valid amount greater than ₹0.')
  }

  const allGoals = passedGoals || getGoals()
  const goal = allGoals.find((g) => g.id === goalId)
  if (!goal) {
    throw new Error('Savings goal not found.')
  }

  const currentAmount = Number(goal.currentAmount) || 0
  if (numAmount > currentAmount) {
    const formattedCurrent = currentAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    throw new Error(`Insufficient funds in this savings goal. Currently available: ₹${formattedCurrent}`)
  }

  const allAccounts = passedAccounts || safeRead(STORAGE_KEYS.ACCOUNTS, [])
  const destAccount = allAccounts.find((a) => a.id === destinationAccountId) || allAccounts[0]
  if (!destAccount) {
    throw new Error('Please select a valid destination account.')
  }

  const allTransactions = passedTransactions || safeRead(STORAGE_KEYS.TRANSACTIONS, [])

  // Atomic update: Goal balance decreases
  const newCurrentAmount = Math.max(0, currentAmount - numAmount)
  const updatedGoals = allGoals.map((g) =>
    g.id === goalId ? { ...g, currentAmount: newCurrentAmount } : g
  )

  // Transaction record: Auditable transfer that increases account balance without being counted as salary/external income
  const txnRecord = {
    id: `txn-goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: new Date().toISOString().split('T')[0],
    amount: numAmount,
    type: 'transfer',
    transferType: 'goal_withdrawal',
    accountId: destAccount.id,
    goalId: goal.id,
    goalName: goal.name,
    category: 'savings',
    description: `Withdrawal from Savings Goal — ${goal.name}`,
    paymentMethod:
      destAccount.type === 'upi'
        ? 'UPI'
        : destAccount.type === 'cash'
        ? 'Cash'
        : 'Net Banking',
    notes: `Withdrawn from savings goal "${goal.name}" into ${destAccount.name}`,
    createdAt: new Date().toISOString(),
  }

  const updatedTransactions = [txnRecord, ...allTransactions]

  // Persist both atomically
  safeWrite(STORAGE_KEYS.GOALS, updatedGoals)
  safeWrite(STORAGE_KEYS.TRANSACTIONS, updatedTransactions)

  return {
    success: true,
    updatedGoals,
    updatedTransactions,
    transactionRecord: txnRecord,
    updatedGoal: { ...goal, currentAmount: newCurrentAmount },
    destinationAccount: destAccount,
  }
}

/**
 * Calculates progress and suggested monthly savings for a savings goal.
 */
export function calculateGoalMetrics(goal) {
  if (!goal) return null
  const target = Number(goal.targetAmount) || 0
  const current = Number(goal.currentAmount) || 0
  const remaining = Math.max(0, target - current)
  const percentage = target > 0 ? (current / target) * 100 : 0
  const isCompleted = current >= target

  // Calculate months remaining
  let monthsRemaining = 0
  let isOverdue = false

  if (goal.targetDate) {
    const today = new Date()
    const targetD = new Date(goal.targetDate)
    const diffTime = targetD.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      isOverdue = true
      monthsRemaining = 0
    } else {
      monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.44))
    }
  }

  const suggestedMonthlySaving = monthsRemaining > 0 ? remaining / monthsRemaining : remaining

  return {
    ...goal,
    targetAmount: target,
    currentAmount: current,
    remaining,
    percentage,
    isCompleted,
    isOverdue,
    monthsRemaining,
    suggestedMonthlySaving,
  }
}

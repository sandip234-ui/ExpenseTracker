import prisma from '../lib/prisma.js'
import {
  GoalNotFoundError,
  AccountNotFoundError,
  InvalidAmountError,
  InsufficientBalanceError,
  GoalInsufficientFundsError,
  GoalOverfundingError,
} from '../errors/domainErrors.js'
import { getAccountById, calculateAccountBalance } from './accountService.js'
import { formatCurrency } from '../utils/formatters.js'

/**
 * Savings Goal Domain Service
 * Encapsulates atomic transfers between accounts and goals within PostgreSQL transactions.
 * Preserves currentAmount and maintains the transaction ledger invariant.
 */

export async function getGoals(userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.savingsGoal) {
    dbClient = userIdOrClient
  }

  return dbClient.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      transactions: {
        orderBy: { date: 'desc' },
      },
    },
  })
}

export async function getGoalById(id, userIdOrClient = null, clientOrUserId = prisma) {
  if (!id) return null
  let userId = null
  let dbClient = prisma

  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.savingsGoal) {
    dbClient = userIdOrClient
  }

  if (typeof clientOrUserId === 'string') {
    userId = clientOrUserId
  } else if (clientOrUserId && typeof clientOrUserId === 'object' && clientOrUserId.savingsGoal) {
    dbClient = clientOrUserId
  }

  const where = { id }
  if (userId) where.userId = userId

  return dbClient.savingsGoal.findFirst({
    where,
    include: {
      transactions: {
        orderBy: { date: 'desc' },
      },
    },
  })
}

export async function createGoal(data, userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = data.userId || 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = data.userId || userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.savingsGoal) {
    dbClient = userIdOrClient
  }

  const targetAmount = Number(data.targetAmount) || 0
  if (targetAmount <= 0) {
    throw new InvalidAmountError('Target amount must be greater than zero.')
  }

  const currentAmount = Number(data.currentAmount) || 0
  const id = data.id || `goal-${Date.now()}`

  return dbClient.savingsGoal.create({
    data: {
      id,
      userId,
      name: String(data.name || 'New Savings Goal').trim(),
      targetAmount,
      currentAmount: Math.max(0, currentAmount),
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      category: data.category || 'savings',
      color: data.color || '#10B981',
      icon: data.icon || '🎯',
      notes: data.notes || '',
    },
  })
}

export async function updateGoal(id, data, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.savingsGoal) {
    dbClient = userIdOrClient
  }

  const goal = await getGoalById(id, userId, dbClient)
  if (!goal) {
    throw new GoalNotFoundError(`Savings goal with ID "${id}" not found.`)
  }

  const updateData = {}
  if (data.name !== undefined) updateData.name = String(data.name).trim()
  if (data.targetAmount !== undefined) {
    const t = Number(data.targetAmount)
    if (isNaN(t) || t <= 0) throw new InvalidAmountError('Target amount must be greater than zero.')
    updateData.targetAmount = t
  }
  if (data.currentAmount !== undefined) updateData.currentAmount = Number(data.currentAmount) || 0
  if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null
  if (data.category !== undefined) updateData.category = data.category
  if (data.color !== undefined) updateData.color = data.color
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.notes !== undefined) updateData.notes = data.notes

  return dbClient.savingsGoal.update({
    where: { id },
    data: updateData,
  })
}

export async function deleteGoal(id, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.savingsGoal) {
    dbClient = userIdOrClient
  }

  const goal = await getGoalById(id, userId, dbClient)
  if (!goal) {
    throw new GoalNotFoundError(`Savings goal with ID "${id}" not found.`)
  }

  return dbClient.savingsGoal.delete({
    where: { id },
  })
}

/**
 * Strict atomic deposit from an Account into a Savings Goal:
 * 1. Validate amount > 0
 * 2. Lock account & goal
 * 3. Validate source account available balance >= amount
 * 4. Validate remaining target (prevent overfunding)
 * 5. Create transfer transaction record (transferType: 'goal_deposit')
 * 6. Atomically update goal.currentAmount
 */
export async function depositToGoal(firstArg, secondArg = null, maybeClient = prisma) {
  let goalId, amount, sourceAccountId, notes, paymentMethod, client
  if (typeof firstArg === 'string') {
    goalId = firstArg
    const opts = secondArg || {}
    amount = opts.amount
    sourceAccountId = opts.sourceAccountId || opts.accountId
    notes = opts.notes
    paymentMethod = opts.paymentMethod
    client = maybeClient
  } else {
    goalId = firstArg.goalId
    amount = firstArg.amount
    sourceAccountId = firstArg.sourceAccountId || firstArg.accountId
    notes = firstArg.notes
    paymentMethod = firstArg.paymentMethod
    client = secondArg || prisma
  }

  const runInTx = async (tx) => {
    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || isNaN(numAmount) || numAmount <= 0) {
      throw new InvalidAmountError('Please enter a valid amount greater than ₹0.')
    }

    if (!sourceAccountId) {
      throw new AccountNotFoundError('Please select a valid source account.')
    }

    // Row-level lock on source account
    await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${sourceAccountId} FOR UPDATE`
    const sourceAccount = await getAccountById(sourceAccountId, tx)
    if (!sourceAccount) {
      throw new AccountNotFoundError('Please select a valid source account.')
    }

    // Row-level lock on savings goal
    await tx.$queryRaw`SELECT id FROM savings_goals WHERE id = ${goalId} FOR UPDATE`
    const goal = await tx.savingsGoal.findUnique({ where: { id: goalId } })
    if (!goal) {
      throw new GoalNotFoundError('Savings goal not found.')
    }

    const availableBalance = await calculateAccountBalance(sourceAccount, tx)
    const symbol = sourceAccount.currency === 'INR' ? '₹' : (sourceAccount.currency || '₹')

    if (numAmount > availableBalance) {
      throw new InsufficientBalanceError(
        `Insufficient balance. Available balance in ${sourceAccount.name}: ${formatCurrency(
          Math.max(0, availableBalance),
          symbol
        )}`
      )
    }

    const targetAmount = Number(goal.targetAmount) || 0
    const currentAmount = Number(goal.currentAmount) || 0
    const remainingTarget = Math.max(0, targetAmount - currentAmount)

    if (targetAmount > 0 && numAmount > remainingTarget) {
      throw new GoalOverfundingError(
        `Only ${formatCurrency(remainingTarget, symbol)} remaining to reach this goal.`
      )
    }

    // Atomic update 1: Goal balance increases
    const newCurrentAmount = currentAmount + numAmount
    const updatedGoal = await tx.savingsGoal.update({
      where: { id: goal.id },
      data: { currentAmount: newCurrentAmount },
    })

    // Atomic update 2: Create auditable transfer transaction in ledger
    const pm =
      paymentMethod ||
      (sourceAccount.type === 'upi'
        ? 'UPI'
        : sourceAccount.type === 'cash'
        ? 'Cash'
        : 'Net Banking')

    const txnRecord = await tx.transaction.create({
      data: {
        id: `txn-goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: goal.userId || 'user_default_primary',
        date: new Date(),
        amount: numAmount,
        type: 'transfer',
        transferType: 'goal_deposit',
        accountId: sourceAccount.id,
        goalId: goal.id,
        goalName: goal.name,
        categoryId: 'savings',
        description: `Transfer to Savings Goal — ${goal.name}`,
        paymentMethod: pm,
        notes: notes || `Transferred to savings goal "${goal.name}" from ${sourceAccount.name}`,
      },
    })

    return {
      success: true,
      goal: updatedGoal,
      updatedGoal,
      transaction: txnRecord,
      transactionRecord: txnRecord,
      sourceAccount,
      remainingAccountBalance: availableBalance - numAmount,
    }
  }

  if (client.$transaction && client !== prisma) {
    return runInTx(client)
  }
  return prisma.$transaction(runInTx, { maxWait: 10000, timeout: 20000 })
}

/**
 * Strict atomic withdrawal from a Savings Goal into a destination Account:
 * 1. Validate amount > 0
 * 2. Lock goal & destination account
 * 3. Validate goal currentAmount >= amount (prevent overdraw)
 * 4. Create transfer transaction record (transferType: 'goal_withdrawal')
 * 5. Atomically update goal.currentAmount
 */
export async function withdrawFromGoal(firstArg, secondArg = null, maybeClient = prisma) {
  let goalId, amount, destinationAccountId, notes, paymentMethod, client
  if (typeof firstArg === 'string') {
    goalId = firstArg
    const opts = secondArg || {}
    amount = opts.amount
    destinationAccountId = opts.destinationAccountId || opts.accountId
    notes = opts.notes
    paymentMethod = opts.paymentMethod
    client = maybeClient
  } else {
    goalId = firstArg.goalId
    amount = firstArg.amount
    destinationAccountId = firstArg.destinationAccountId || firstArg.accountId
    notes = firstArg.notes
    paymentMethod = firstArg.paymentMethod
    client = secondArg || prisma
  }

  const runInTx = async (tx) => {
    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || isNaN(numAmount) || numAmount <= 0) {
      throw new InvalidAmountError('Please enter a valid amount greater than ₹0.')
    }

    // Row-level lock on savings goal
    await tx.$queryRaw`SELECT id FROM savings_goals WHERE id = ${goalId} FOR UPDATE`
    const goal = await tx.savingsGoal.findUnique({ where: { id: goalId } })
    if (!goal) {
      throw new GoalNotFoundError('Savings goal not found.')
    }

    const currentAmount = Number(goal.currentAmount) || 0
    if (numAmount > currentAmount) {
      throw new GoalInsufficientFundsError(
        `Insufficient funds in this savings goal. Currently available: ${formatCurrency(
          currentAmount
        )}`
      )
    }

    if (!destinationAccountId) {
      throw new AccountNotFoundError('Please select a valid destination account.')
    }

    // Row-level lock on destination account
    await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${destinationAccountId} FOR UPDATE`
    const destAccount = await getAccountById(destinationAccountId, tx)
    if (!destAccount) {
      throw new AccountNotFoundError('Please select a valid destination account.')
    }

    // Atomic update 1: Goal balance decreases
    const newCurrentAmount = Math.max(0, currentAmount - numAmount)
    const updatedGoal = await tx.savingsGoal.update({
      where: { id: goal.id },
      data: { currentAmount: newCurrentAmount },
    })

    // Atomic update 2: Create auditable transfer transaction in ledger
    const pm =
      paymentMethod ||
      (destAccount.type === 'upi'
        ? 'UPI'
        : destAccount.type === 'cash'
        ? 'Cash'
        : 'Net Banking')

    const txnRecord = await tx.transaction.create({
      data: {
        id: `txn-goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: goal.userId || 'user_default_primary',
        date: new Date(),
        amount: numAmount,
        type: 'transfer',
        transferType: 'goal_withdrawal',
        accountId: destAccount.id,
        goalId: goal.id,
        goalName: goal.name,
        categoryId: 'savings',
        description: `Withdrawal from Savings Goal — ${goal.name}`,
        paymentMethod: pm,
        notes: notes || `Withdrawn from savings goal "${goal.name}" into ${destAccount.name}`,
      },
    })

    return {
      success: true,
      goal: updatedGoal,
      updatedGoal,
      transaction: txnRecord,
      transactionRecord: txnRecord,
      destinationAccount: destAccount,
    }
  }

  if (client.$transaction && client !== prisma) {
    return runInTx(client)
  }
  return prisma.$transaction(runInTx, { maxWait: 10000, timeout: 20000 })
}

/**
 * Calculates metrics and progress for a savings goal.
 */
export function calculateGoalMetrics(goal) {
  if (!goal) return null
  const target = Number(goal.targetAmount) || 0
  const current = Number(goal.currentAmount) || 0
  const remaining = Math.max(0, target - current)
  const percentage = target > 0 ? (current / target) * 100 : 0
  const isCompleted = current >= target

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

import prisma from '../lib/prisma.js'
import {
  TransactionNotFoundError,
  AccountNotFoundError,
  CategoryNotFoundError,
  InvalidAmountError,
  InsufficientBalanceError,
  InvalidCategoryTypeError,
  InvalidTransactionTypeError,
} from '../errors/domainErrors.js'
import {
  getAccountById,
  calculateAccountBalance,
  getAvailableAccountBalance,
} from './accountService.js'
import { formatCurrency, getPaymentMethodsForAccount } from '../utils/formatters.js'

/**
 * Transaction Domain Service
 * Encapsulates ledger mutations with PostgreSQL ACID atomicity,
 * strict reversal calculations on edits, and row-level locking for concurrency control.
 */

export async function getTransactions(filter = {}, client = prisma) {
  const where = {}
  if (filter.userId) where.userId = filter.userId
  if (filter.accountId) where.accountId = filter.accountId
  if (filter.type) where.type = filter.type
  if (filter.categoryId) where.categoryId = filter.categoryId
  if (filter.goalId) where.goalId = filter.goalId
  if (filter.startDate || filter.endDate) {
    where.date = {}
    if (filter.startDate) where.date.gte = new Date(filter.startDate)
    if (filter.endDate) where.date.lte = new Date(filter.endDate)
  }

  return client.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      account: true,
      category: true,
      goal: true,
    },
    take: filter.limit ? Number(filter.limit) : undefined,
    skip: filter.offset ? Number(filter.offset) : undefined,
  })
}

export async function getTransactionById(id, client = prisma, userId = null) {
  if (!id) return null
  const where = { id }
  if (userId) where.userId = userId

  return client.transaction.findFirst({
    where,
    include: {
      account: true,
      category: true,
      goal: true,
    },
  })
}

/**
 * Creates a transaction atomically with concurrency row locking.
 */
export async function createTransaction(data, client = prisma) {
  const runInTx = async (tx) => {
    const amount = Number(data.amount)
    if (!Number.isFinite(amount) || isNaN(amount) || amount <= 0) {
      throw new InvalidAmountError('Amount must be greater than zero.')
    }

    const type = String(data.type || '').toLowerCase()
    if (!['income', 'expense', 'transfer'].includes(type)) {
      throw new InvalidTransactionTypeError(
        `Invalid transaction type "${data.type}". Must be income, expense, or transfer.`
      )
    }

    if (!data.accountId) {
      throw new AccountNotFoundError('accountId is required for a transaction.')
    }

    // Row-level lock on account for concurrency control
    await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${data.accountId} FOR UPDATE`
    const account = await getAccountById(data.accountId, tx, data.userId || null)
    if (!account) {
      throw new AccountNotFoundError(`Account with ID "${data.accountId}" not found.`)
    }

    // Category validation
    let category = null
    if (data.categoryId) {
      category = await tx.category.findUnique({ where: { id: data.categoryId } })
      if (!category) {
        throw new CategoryNotFoundError(`Category with ID "${data.categoryId}" not found.`)
      }
      if (type !== 'transfer') {
        const catType = category.type.toLowerCase()
        if (catType !== 'both' && catType !== type) {
          throw new InvalidCategoryTypeError(
            `Category "${category.name}" (${category.type}) is not compatible with transaction type "${type}".`
          )
        }
      }
    }

    // Payment method handling (metadata only)
    let paymentMethod = data.paymentMethod || 'Other'
    if (data.paymentMethod) {
      const allowedMethods = getPaymentMethodsForAccount(account)
      // If payment method is not in allowed list and is not a custom/legacy method, reset to default
      if (!allowedMethods.includes(paymentMethod) && !data.allowLegacyMethod) {
        paymentMethod = allowedMethods[0] || 'Other'
      }
    }

    // Expense validation against derived balance
    if (type === 'expense') {
      const availableBalance = await calculateAccountBalance(account, tx)
      if (amount > availableBalance) {
        const symbol = account.currency === 'INR' ? '₹' : (account.currency || '₹')
        throw new InsufficientBalanceError(
          `Insufficient balance. Available in ${account.name}: ${formatCurrency(
            Math.max(0, availableBalance),
            symbol
          )}`
        )
      }
    }

    const dateVal = data.date ? new Date(data.date) : new Date()
    if (isNaN(dateVal.getTime())) {
      throw new DomainError('Please enter a valid date.')
    }

    const id = data.id || `txn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const userId = data.userId || account.userId || 'user_default_primary'

    const transaction = await tx.transaction.create({
      data: {
        id,
        userId,
        type,
        amount,
        description: String(data.description || '').trim(),
        date: dateVal,
        paymentMethod,
        notes: data.notes ? String(data.notes).trim() : '',
        transferType: data.transferType || null,
        goalName: data.goalName || null,
        accountId: account.id,
        categoryId: category ? category.id : null,
        goalId: data.goalId || null,
      },
      include: {
        account: true,
        category: true,
        goal: true,
      },
    })

    return transaction
  }

  // If already inside an interactive transaction, use it; otherwise wrap in prisma.$transaction
  if (client.$transaction && client !== prisma) {
    return runInTx(client)
  }
  return prisma.$transaction(runInTx)
}

/**
 * Updates an existing transaction with atomic reversal semantics:
 * 1. Lock account(s)
 * 2. Temporarily reverse original transaction effect
 * 3. Validate new transaction against corrected balance
 * 4. Apply new transaction atomically
 */
export async function updateTransaction(id, data, client = prisma, userId = null) {
  const runInTx = async (tx) => {
    const where = { id }
    if (userId) where.userId = userId

    const originalTxn = await tx.transaction.findFirst({
      where,
      include: { account: true, category: true, goal: true },
    })
    if (!originalTxn) {
      throw new TransactionNotFoundError(`Transaction with ID "${id}" not found.`)
    }

    const targetAccountId = data.accountId || originalTxn.accountId

    // Acquire row-level locks on both original and target accounts
    await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${originalTxn.accountId} FOR UPDATE`
    if (targetAccountId !== originalTxn.accountId) {
      await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${targetAccountId} FOR UPDATE`
    }

    const targetAccount = await getAccountById(targetAccountId, tx, userId || originalTxn.userId)
    if (!targetAccount) {
      throw new AccountNotFoundError(`Account with ID "${targetAccountId}" not found.`)
    }

    const newAmount = data.amount !== undefined ? Number(data.amount) : originalTxn.amount
    if (!Number.isFinite(newAmount) || isNaN(newAmount) || newAmount <= 0) {
      throw new InvalidAmountError('Amount must be greater than zero.')
    }

    const newType = (data.type || originalTxn.type).toLowerCase()
    if (!['income', 'expense', 'transfer'].includes(newType)) {
      throw new InvalidTransactionTypeError(`Invalid transaction type "${newType}".`)
    }

    // Category validation
    const targetCategoryId = data.categoryId !== undefined ? data.categoryId : originalTxn.categoryId
    let category = null
    if (targetCategoryId) {
      category = await tx.category.findUnique({ where: { id: targetCategoryId } })
      if (!category) {
        throw new CategoryNotFoundError(`Category with ID "${targetCategoryId}" not found.`)
      }
      if (newType !== 'transfer') {
        const catType = category.type.toLowerCase()
        if (catType !== 'both' && catType !== newType) {
          throw new InvalidCategoryTypeError(
            `Category "${category.name}" (${category.type}) is not compatible with transaction type "${newType}".`
          )
        }
      }
    }

    // Reversal calculation:
    // If the new transaction is an expense, validate against available balance
    // after reversing the original transaction's financial effect.
    if (newType === 'expense') {
      const available = await getAvailableAccountBalance(targetAccount, originalTxn, tx)
      if (newAmount > available) {
        const symbol = targetAccount.currency === 'INR' ? '₹' : (targetAccount.currency || '₹')
        throw new InsufficientBalanceError(
          `Insufficient balance. Available in ${targetAccount.name}: ${formatCurrency(
            Math.max(0, available),
            symbol
          )}`
        )
      }
    }

    // Payment method validation
    let paymentMethod = data.paymentMethod || originalTxn.paymentMethod || 'Other'
    if (data.accountId && data.accountId !== originalTxn.accountId) {
      const allowedMethods = getPaymentMethodsForAccount(targetAccount)
      if (!allowedMethods.includes(paymentMethod)) {
        paymentMethod = allowedMethods[0] || 'Other'
      }
    }

    const updateFields = {
      amount: newAmount,
      type: newType,
      accountId: targetAccountId,
      paymentMethod,
    }
    if (data.description !== undefined) updateFields.description = String(data.description).trim()
    if (data.notes !== undefined) updateFields.notes = String(data.notes).trim()
    if (data.date !== undefined) updateFields.date = new Date(data.date)
    if (data.categoryId !== undefined) updateFields.categoryId = category ? category.id : null
    if (data.goalId !== undefined) updateFields.goalId = data.goalId
    if (data.goalName !== undefined) updateFields.goalName = data.goalName
    if (data.transferType !== undefined) updateFields.transferType = data.transferType

    const updated = await tx.transaction.update({
      where: { id },
      data: updateFields,
      include: {
        account: true,
        category: true,
        goal: true,
      },
    })

    return updated
  }

  if (client.$transaction && client !== prisma) {
    return runInTx(client)
  }
  return prisma.$transaction(runInTx)
}

/**
 * Deletes a transaction atomically.
 * If the transaction was linked to a Savings Goal transfer,
 * atomically rolls back the goal's currentAmount.
 */
export async function deleteTransaction(id, client = prisma, userId = null) {
  const runInTx = async (tx) => {
    const where = { id }
    if (userId) where.userId = userId

    const txn = await tx.transaction.findFirst({
      where,
      include: { goal: true },
    })
    if (!txn) {
      throw new TransactionNotFoundError(`Transaction with ID "${id}" not found.`)
    }

    // Row-level lock on account
    await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${txn.accountId} FOR UPDATE`

    // If transfer linked to a savings goal, atomically reverse goal currentAmount
    if (txn.type === 'transfer' && txn.goalId && txn.goal) {
      let newGoalAmount = txn.goal.currentAmount || 0
      if (txn.transferType === 'goal_deposit') {
        newGoalAmount = Math.max(0, newGoalAmount - txn.amount)
      } else if (txn.transferType === 'goal_withdrawal') {
        newGoalAmount = newGoalAmount + txn.amount
      }

      await tx.savingsGoal.update({
        where: { id: txn.goalId },
        data: { currentAmount: newGoalAmount },
      })
    }

    const deleted = await tx.transaction.delete({
      where: { id },
    })

    return deleted
  }

  if (client.$transaction && client !== prisma) {
    return runInTx(client)
  }
  return prisma.$transaction(runInTx)
}

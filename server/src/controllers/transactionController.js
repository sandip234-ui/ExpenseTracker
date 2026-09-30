import * as transactionService from '../services/transactionService.js'

/**
 * Transaction Controller
 * Thin HTTP adapter mapping requests to transactionService domain methods.
 */

export async function getTransactions(req, res, next) {
  try {
    const filters = {
      userId: req.userId,
      accountId: req.query.accountId,
      type: req.query.type,
      categoryId: req.query.categoryId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      transferType: req.query.transferType,
    }
    const transactions = await transactionService.getTransactions(filters)
    return res.status(200).json({ data: transactions })
  } catch (error) {
    next(error)
  }
}

export async function getTransactionById(req, res, next) {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id, undefined, req.userId)
    if (!transaction) {
      return res.status(404).json({ error: { message: 'Transaction not found.', code: 'TRANSACTION_NOT_FOUND' } })
    }
    return res.status(200).json({ data: transaction })
  } catch (error) {
    next(error)
  }
}

export async function createTransaction(req, res, next) {
  try {
    const transaction = await transactionService.createTransaction({
      ...req.body,
      userId: req.userId,
    })
    return res.status(201).json({ data: transaction })
  } catch (error) {
    next(error)
  }
}

export async function updateTransaction(req, res, next) {
  try {
    const transaction = await transactionService.updateTransaction(req.params.id, req.body, undefined, req.userId)
    return res.status(200).json({ data: transaction })
  } catch (error) {
    next(error)
  }
}

export async function deleteTransaction(req, res, next) {
  try {
    const result = await transactionService.deleteTransaction(req.params.id, undefined, req.userId)
    return res.status(200).json({ data: result })
  } catch (error) {
    next(error)
  }
}

import { Router } from 'express'
import * as transactionController from '../controllers/transactionController.js'
import { validate } from '../middleware/validate.js'
import {
  getTransactionsSchema,
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
} from '../validations/transactionSchema.js'

const router = Router()

/**
 * @route   GET /api/transactions
 * @desc    Get transactions with optional filters
 */
router.get('/', validate(getTransactionsSchema), transactionController.getTransactions)

/**
 * @route   GET /api/transactions/:id
 * @desc    Get single transaction by ID
 */
router.get('/:id', validate(transactionIdParamSchema), transactionController.getTransactionById)

/**
 * @route   POST /api/transactions
 * @desc    Create new transaction (income/expense/transfer)
 */
router.post('/', validate(createTransactionSchema), transactionController.createTransaction)

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update existing transaction with atomic reversal semantics
 */
router.put('/:id', validate(updateTransactionSchema), transactionController.updateTransaction)

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete transaction and reverse ledger/goal effects
 */
router.delete('/:id', validate(transactionIdParamSchema), transactionController.deleteTransaction)

export default router

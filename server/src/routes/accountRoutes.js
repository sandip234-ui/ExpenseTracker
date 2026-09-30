import { Router } from 'express'
import * as accountController from '../controllers/accountController.js'
import { validate } from '../middleware/validate.js'
import {
  createAccountSchema,
  updateAccountSchema,
  accountIdParamSchema,
} from '../validations/accountSchema.js'

const router = Router()

/**
 * @route   GET /api/accounts
 * @desc    Get all accounts with derived ledger balances
 */
router.get('/', accountController.getAllAccounts)

/**
 * @route   GET /api/accounts/net-worth
 * @desc    Get total net worth across accounts and goals
 */
router.get('/net-worth', accountController.getNetWorth)

/**
 * @route   GET /api/accounts/:id
 * @desc    Get single account by ID
 */
router.get('/:id', validate(accountIdParamSchema), accountController.getAccountById)

/**
 * @route   POST /api/accounts
 * @desc    Create new account
 */
router.post('/', validate(createAccountSchema), accountController.createAccount)

/**
 * @route   PUT /api/accounts/:id
 * @desc    Update existing account
 */
router.put('/:id', validate(updateAccountSchema), accountController.updateAccount)

/**
 * @route   DELETE /api/accounts/:id
 * @desc    Delete account if no conflicting ledger entries
 */
router.delete('/:id', validate(accountIdParamSchema), accountController.deleteAccount)

export default router

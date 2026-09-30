import { Router } from 'express'
import * as budgetController from '../controllers/budgetController.js'
import { validate } from '../middleware/validate.js'
import {
  getBudgetsSchema,
  createBudgetSchema,
  updateBudgetSchema,
  budgetIdParamSchema,
} from '../validations/budgetSchema.js'

const router = Router()

/**
 * @route   GET /api/budgets
 * @desc    Get budgets with optional month filter and actual spending status
 */
router.get('/', validate(getBudgetsSchema), budgetController.getBudgets)

/**
 * @route   GET /api/budgets/:id
 * @desc    Get single budget by ID
 */
router.get('/:id', validate(budgetIdParamSchema), budgetController.getBudgetById)

/**
 * @route   POST /api/budgets
 * @desc    Create new budget (enforcing categoryId_month uniqueness)
 */
router.post('/', validate(createBudgetSchema), budgetController.createBudget)

/**
 * @route   PUT /api/budgets/:id
 * @desc    Update existing budget
 */
router.put('/:id', validate(updateBudgetSchema), budgetController.updateBudget)

/**
 * @route   DELETE /api/budgets/:id
 * @desc    Delete budget
 */
router.delete('/:id', validate(budgetIdParamSchema), budgetController.deleteBudget)

export default router

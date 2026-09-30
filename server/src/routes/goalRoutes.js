import { Router } from 'express'
import * as goalController from '../controllers/goalController.js'
import { validate } from '../middleware/validate.js'
import {
  createGoalSchema,
  updateGoalSchema,
  goalIdParamSchema,
  goalDepositSchema,
  goalWithdrawSchema,
} from '../validations/goalSchema.js'

const router = Router()

/**
 * @route   GET /api/goals
 * @desc    Get all savings goals with calculated progress
 */
router.get('/', goalController.getGoals)

/**
 * @route   GET /api/goals/:id
 * @desc    Get single savings goal by ID
 */
router.get('/:id', validate(goalIdParamSchema), goalController.getGoalById)

/**
 * @route   POST /api/goals
 * @desc    Create new savings goal
 */
router.post('/', validate(createGoalSchema), goalController.createGoal)

/**
 * @route   PUT /api/goals/:id
 * @desc    Update existing savings goal
 */
router.put('/:id', validate(updateGoalSchema), goalController.updateGoal)

/**
 * @route   DELETE /api/goals/:id
 * @desc    Delete savings goal
 */
router.delete('/:id', validate(goalIdParamSchema), goalController.deleteGoal)

/**
 * @route   POST /api/goals/:id/deposit
 * @desc    Atomic transfer from account into savings goal
 */
router.post('/:id/deposit', validate(goalDepositSchema), goalController.depositToGoal)

/**
 * @route   POST /api/goals/:id/withdraw
 * @desc    Atomic transfer from savings goal into account
 */
router.post('/:id/withdraw', validate(goalWithdrawSchema), goalController.withdrawFromGoal)

export default router

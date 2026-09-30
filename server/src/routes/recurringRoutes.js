import { Router } from 'express'
import * as recurringController from '../controllers/recurringController.js'
import { validate } from '../middleware/validate.js'
import {
  getRecurringSchema,
  createRecurringSchema,
  updateRecurringSchema,
  recurringIdParamSchema,
} from '../validations/recurringSchema.js'

const router = Router()

/**
 * @route   GET /api/recurring
 * @desc    Get recurring transaction templates with optional active filter
 */
router.get('/', validate(getRecurringSchema), recurringController.getRecurring)

/**
 * @route   GET /api/recurring/:id
 * @desc    Get single recurring transaction template by ID
 */
router.get('/:id', validate(recurringIdParamSchema), recurringController.getRecurringById)

/**
 * @route   POST /api/recurring
 * @desc    Create new recurring transaction template
 */
router.post('/', validate(createRecurringSchema), recurringController.createRecurring)

/**
 * @route   PUT /api/recurring/:id
 * @desc    Update existing recurring transaction template
 */
router.put('/:id', validate(updateRecurringSchema), recurringController.updateRecurring)

/**
 * @route   DELETE /api/recurring/:id
 * @desc    Delete recurring transaction template
 */
router.delete('/:id', validate(recurringIdParamSchema), recurringController.deleteRecurring)

export default router

import { Router } from 'express'
import * as categoryController from '../controllers/categoryController.js'
import { validate } from '../middleware/validate.js'
import {
  getCategoriesSchema,
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from '../validations/categorySchema.js'

const router = Router()

/**
 * @route   GET /api/categories
 * @desc    Get all categories with optional type filter
 */
router.get('/', validate(getCategoriesSchema), categoryController.getCategories)

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID
 */
router.get('/:id', validate(categoryIdParamSchema), categoryController.getCategoryById)

/**
 * @route   POST /api/categories
 * @desc    Create custom category
 */
router.post('/', validate(createCategorySchema), categoryController.createCategory)

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category (if custom)
 */
router.put('/:id', validate(updateCategorySchema), categoryController.updateCategory)

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete custom category (system categories protected)
 */
router.delete('/:id', validate(categoryIdParamSchema), categoryController.deleteCategory)

export default router

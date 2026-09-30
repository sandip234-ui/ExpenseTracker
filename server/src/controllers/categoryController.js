import * as categoryService from '../services/categoryService.js'

/**
 * Category Controller
 * Thin HTTP adapter mapping requests to categoryService domain methods.
 */

export async function getCategories(req, res, next) {
  try {
    const categories = await categoryService.getCategories(req.query.type, req.userId)
    return res.status(200).json({ data: categories })
  } catch (error) {
    next(error)
  }
}

export async function getCategoryById(req, res, next) {
  try {
    const category = await categoryService.getCategoryById(req.params.id, req.userId)
    if (!category) {
      return res.status(404).json({ error: { message: 'Category not found.', code: 'CATEGORY_NOT_FOUND' } })
    }
    return res.status(200).json({ data: category })
  } catch (error) {
    next(error)
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory({
      ...req.body,
      userId: req.userId,
    }, req.userId)
    return res.status(201).json({ data: category })
  } catch (error) {
    next(error)
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body, req.userId)
    return res.status(200).json({ data: category })
  } catch (error) {
    next(error)
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const result = await categoryService.deleteCategory(req.params.id, req.userId)
    return res.status(200).json({ data: result })
  } catch (error) {
    next(error)
  }
}

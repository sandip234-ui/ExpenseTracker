import * as budgetService from '../services/budgetService.js'

/**
 * Budget Controller
 * Thin HTTP adapter mapping requests to budgetService domain methods.
 */

export async function getBudgets(req, res, next) {
  try {
    const budgets = await budgetService.getBudgets(req.query.month, req.userId)
    return res.status(200).json({ data: budgets })
  } catch (error) {
    next(error)
  }
}

export async function getBudgetById(req, res, next) {
  try {
    const budget = await budgetService.getBudgetById(req.params.id, req.userId)
    if (!budget) {
      return res.status(404).json({ error: { message: 'Budget not found.', code: 'BUDGET_NOT_FOUND' } })
    }
    return res.status(200).json({ data: budget })
  } catch (error) {
    next(error)
  }
}

export async function createBudget(req, res, next) {
  try {
    const budget = await budgetService.createBudget({
      ...req.body,
      userId: req.userId,
    }, req.userId)
    return res.status(201).json({ data: budget })
  } catch (error) {
    next(error)
  }
}

export async function updateBudget(req, res, next) {
  try {
    const budget = await budgetService.updateBudget(req.params.id, req.body, req.userId)
    return res.status(200).json({ data: budget })
  } catch (error) {
    next(error)
  }
}

export async function deleteBudget(req, res, next) {
  try {
    const result = await budgetService.deleteBudget(req.params.id, req.userId)
    return res.status(200).json({ data: result })
  } catch (error) {
    next(error)
  }
}

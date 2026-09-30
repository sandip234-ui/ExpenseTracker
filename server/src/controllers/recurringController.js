import * as recurringService from '../services/recurringService.js'

/**
 * Recurring Controller
 * Thin HTTP adapter mapping requests to recurringService domain methods.
 */

export async function getRecurring(req, res, next) {
  try {
    const filters = {
      userId: req.userId,
    }
    if (req.query.active !== undefined) {
      filters.active = req.query.active === 'true'
    }
    const recurringList = await recurringService.getRecurring(filters)
    return res.status(200).json({ data: recurringList })
  } catch (error) {
    next(error)
  }
}

export async function getRecurringById(req, res, next) {
  try {
    const recurring = await recurringService.getRecurringById(req.params.id, req.userId)
    if (!recurring) {
      return res.status(404).json({ error: { message: 'Recurring transaction rule not found.', code: 'RECURRING_NOT_FOUND' } })
    }
    return res.status(200).json({ data: recurring })
  } catch (error) {
    next(error)
  }
}

export async function createRecurring(req, res, next) {
  try {
    const recurring = await recurringService.createRecurring({
      ...req.body,
      userId: req.userId,
    }, req.userId)
    return res.status(201).json({ data: recurring })
  } catch (error) {
    next(error)
  }
}

export async function updateRecurring(req, res, next) {
  try {
    const recurring = await recurringService.updateRecurring(req.params.id, req.body, req.userId)
    return res.status(200).json({ data: recurring })
  } catch (error) {
    next(error)
  }
}

export async function deleteRecurring(req, res, next) {
  try {
    const result = await recurringService.deleteRecurring(req.params.id, req.userId)
    return res.status(200).json({ data: result })
  } catch (error) {
    next(error)
  }
}

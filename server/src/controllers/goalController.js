import * as goalService from '../services/goalService.js'

/**
 * Goal Controller
 * Thin HTTP adapter mapping requests to goalService domain methods.
 */

export async function getGoals(req, res, next) {
  try {
    const goals = await goalService.getGoals(req.userId)
    return res.status(200).json({ data: goals })
  } catch (error) {
    next(error)
  }
}

export async function getGoalById(req, res, next) {
  try {
    const goal = await goalService.getGoalById(req.params.id, req.userId)
    if (!goal) {
      return res.status(404).json({ error: { message: 'Savings goal not found.', code: 'GOAL_NOT_FOUND' } })
    }
    return res.status(200).json({ data: goal })
  } catch (error) {
    next(error)
  }
}

export async function createGoal(req, res, next) {
  try {
    const goal = await goalService.createGoal({
      ...req.body,
      userId: req.userId,
    }, req.userId)
    return res.status(201).json({ data: goal })
  } catch (error) {
    next(error)
  }
}

export async function updateGoal(req, res, next) {
  try {
    const goal = await goalService.updateGoal(req.params.id, req.body, req.userId)
    return res.status(200).json({ data: goal })
  } catch (error) {
    next(error)
  }
}

export async function deleteGoal(req, res, next) {
  try {
    const result = await goalService.deleteGoal(req.params.id, req.userId)
    return res.status(200).json({ data: result })
  } catch (error) {
    next(error)
  }
}

export async function depositToGoal(req, res, next) {
  try {
    const { accountId, amount } = req.body
    const result = await goalService.depositToGoal(req.params.id, { accountId, amount })
    return res.status(200).json({ data: result })
  } catch (error) {
    next(error)
  }
}

export async function withdrawFromGoal(req, res, next) {
  try {
    const { accountId, amount } = req.body
    const result = await goalService.withdrawFromGoal(req.params.id, { accountId, amount })
    return res.status(200).json({ data: result })
  } catch (error) {
    next(error)
  }
}

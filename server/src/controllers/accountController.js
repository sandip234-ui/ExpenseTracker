import * as accountService from '../services/accountService.js'

/**
 * Account Controller
 * Thin HTTP adapter mapping requests to accountService domain methods.
 */

export async function getAllAccounts(req, res, next) {
  try {
    const accounts = await accountService.getAllAccounts(req.userId)
    return res.status(200).json({ data: accounts })
  } catch (error) {
    next(error)
  }
}

export async function getAccountById(req, res, next) {
  try {
    const account = await accountService.getAccountById(req.params.id, req.userId)
    if (!account) {
      return res.status(404).json({ error: { message: 'Account not found.', code: 'ACCOUNT_NOT_FOUND' } })
    }
    return res.status(200).json({ data: account })
  } catch (error) {
    next(error)
  }
}

export async function createAccount(req, res, next) {
  try {
    const account = await accountService.createAccount(req.body, req.userId)
    return res.status(201).json({ data: account })
  } catch (error) {
    next(error)
  }
}

export async function updateAccount(req, res, next) {
  try {
    const account = await accountService.updateAccount(req.params.id, req.body, req.userId)
    return res.status(200).json({ data: account })
  } catch (error) {
    next(error)
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const result = await accountService.deleteAccount(req.params.id, req.userId)
    return res.status(200).json({ data: result })
  } catch (error) {
    next(error)
  }
}

export async function getNetWorth(req, res, next) {
  try {
    const totalNetWorth = await accountService.getTotalNetWorth(req.userId)
    return res.status(200).json({ data: { totalNetWorth } })
  } catch (error) {
    next(error)
  }
}

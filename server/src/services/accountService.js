import prisma from '../lib/prisma.js'
import {
  AccountNotFoundError,
  InvalidAmountError,
  AccountNameExistsError,
} from '../errors/domainErrors.js'
import {
  normalizeAccountName,
  formatCleanAccountName,
  cleanupDuplicateAccountNames,
} from '../utils/accountUtils.js'

export { cleanupDuplicateAccountNames }

/**
 * Account Domain Service
 * Encapsulates all account CRUD and dynamic ledger balance derivation rules.
 * Authoritative financial source of truth: ledger transactions + opening balance.
 * No mutable balance column is stored on Account.
 */

/**
 * Finds an account belonging to a user matching the normalized name.
 * Handles trim, case-insensitivity, and multiple internal spaces.
 *
 * @param {string} userId
 * @param {string} normalizedName
 * @param {object} [client=prisma]
 * @returns {Promise<object|null>}
 */
export async function findAccountByNormalizedName(userId, normalizedName, client = prisma) {
  if (!userId || !normalizedName) return null
  const accounts = await client.account.findMany({
    where: { userId },
    select: { id: true, name: true, normalizedName: true, userId: true },
  })
  return accounts.find((a) => {
    const aNorm = a.normalizedName || normalizeAccountName(a.name)
    return aNorm === normalizedName
  }) || null
}

/**
 * Enriches an account object with dynamically derived balance and availableBalance.
 * Note: Balance is NEVER persisted authoritatively on the Account row.
 */
export async function formatAccountWithBalance(account, client = prisma) {
  if (!account) return null
  const balance = await calculateAccountBalance(account, client)
  return {
    ...account,
    balance,
    availableBalance: balance,
  }
}

export async function getAllAccounts(userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.account) {
    dbClient = userIdOrClient
  }
  const accounts = await dbClient.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  return Promise.all(accounts.map((acc) => formatAccountWithBalance(acc, dbClient)))
}

export async function getAccountById(id, userIdOrClient = null, clientOrUserId = prisma, enrich = true) {
  if (!id) return null
  let userId = null
  let dbClient = prisma

  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.account) {
    dbClient = userIdOrClient
  }

  if (typeof clientOrUserId === 'string') {
    userId = clientOrUserId
  } else if (clientOrUserId && typeof clientOrUserId === 'object' && clientOrUserId.account) {
    dbClient = clientOrUserId
  }

  const where = { id }
  if (userId) {
    where.userId = userId
  }
  const account = await dbClient.account.findFirst({
    where,
  })
  if (!account) return null
  return enrich ? formatAccountWithBalance(account, dbClient) : account
}

export async function createAccount(data, userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = data.userId || 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = data.userId || userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.account) {
    dbClient = userIdOrClient
  }

  const openingBalance = Number(data.openingBalance) || 0
  if (isNaN(openingBalance)) {
    throw new InvalidAmountError('Opening balance must be a valid number.')
  }

  const cleanName = formatCleanAccountName(data.name || 'New Account')
  const normalizedName = normalizeAccountName(cleanName)

  // Verify per-user normalized name uniqueness
  const existing = await findAccountByNormalizedName(userId, normalizedName, dbClient)
  if (existing) {
    throw new AccountNameExistsError('An account with this name already exists.')
  }

  const id = data.id || `account-${Date.now()}`
  const account = await dbClient.account.create({
    data: {
      id,
      userId,
      name: cleanName,
      normalizedName,
      type: String(data.type || 'bank').toLowerCase(),
      openingBalance,
      currency: data.currency || 'INR',
      icon: data.icon || null,
      color: data.color || null,
    },
  })
  return formatAccountWithBalance(account, dbClient)
}

export async function updateAccount(id, data, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.account) {
    dbClient = userIdOrClient
  }
  const account = await getAccountById(id, userId, dbClient)
  if (!account) {
    throw new AccountNotFoundError(`Account with ID "${id}" not found.`)
  }

  const updateData = {}
  if (data.name !== undefined) {
    const cleanName = formatCleanAccountName(data.name)
    const normalizedName = normalizeAccountName(cleanName)

    // Check if another account of this user already has this normalized name
    const existing = await findAccountByNormalizedName(account.userId, normalizedName, dbClient)
    if (existing && existing.id !== id) {
      throw new AccountNameExistsError('An account with this name already exists.')
    }
    updateData.name = cleanName
    updateData.normalizedName = normalizedName
  }

  if (data.type !== undefined) updateData.type = String(data.type).toLowerCase()
  if (data.openingBalance !== undefined) {
    const ob = Number(data.openingBalance)
    if (isNaN(ob)) throw new InvalidAmountError('Opening balance must be a valid number.')
    updateData.openingBalance = ob
  }
  if (data.currency !== undefined) updateData.currency = data.currency
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.color !== undefined) updateData.color = data.color

  const updated = await dbClient.account.update({
    where: { id },
    data: updateData,
  })
  return formatAccountWithBalance(updated, dbClient)
}

export async function deleteAccount(id, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.account) {
    dbClient = userIdOrClient
  }
  const account = await getAccountById(id, userId, dbClient)
  if (!account) {
    throw new AccountNotFoundError(`Account with ID "${id}" not found.`)
  }

  return dbClient.account.delete({
    where: { id },
  })
}

/**
 * Calculates current balance for an account dynamically from the ledger:
 * Balance = openingBalance + (income + goal_withdrawal) - (expense + goal_deposit)
 *
 * @param {string | object} accountOrId - Account ID or Account object
 * @param {object} [client=prisma] - Prisma client or transaction client
 * @returns {Promise<number>}
 */
export async function calculateAccountBalance(accountOrId, client = prisma) {
  let account
  if (typeof accountOrId === 'string') {
    account = await getAccountById(accountOrId, client)
  } else {
    account = accountOrId
  }

  if (!account) {
    throw new AccountNotFoundError('Account not found for balance calculation.')
  }

  const opening = Number(account.openingBalance) || 0

  // Query all transactions assigned to this account
  const transactions = await client.transaction.findMany({
    where: { accountId: account.id },
    select: {
      type: true,
      transferType: true,
      amount: true,
    },
  })

  const income = transactions
    .filter((t) => t.type === 'income' || t.transferType === 'goal_withdrawal')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const expenses = transactions
    .filter((t) => t.type === 'expense' || t.transferType === 'goal_deposit')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  return opening + income - expenses
}

/**
 * Calculates the available balance of an account when creating or editing a transaction.
 * If editing an existing transaction assigned to this account, the original transaction's
 * financial effect is reversed first so that the user can allocate those funds to the new amount.
 *
 * @param {string | object} accountOrId - Account ID or Account object
 * @param {object | null} [originalTxn=null] - Original transaction if editing
 * @param {object} [client=prisma] - Prisma client or transaction client
 * @returns {Promise<number>}
 */
export async function getAvailableAccountBalance(accountOrId, originalTxn = null, client = prisma) {
  let account
  if (typeof accountOrId === 'string') {
    account = await getAccountById(accountOrId, client)
  } else {
    account = accountOrId
  }

  if (!account) {
    throw new AccountNotFoundError('Account not found.')
  }

  const currentBalance = await calculateAccountBalance(account, client)

  if (!originalTxn) {
    return currentBalance
  }

  // If editing an existing transaction assigned to this account, reverse its original effect
  if (originalTxn.accountId === account.id) {
    if (originalTxn.type === 'expense' || originalTxn.transferType === 'goal_deposit') {
      // Reversing original expense adds back the funds
      return currentBalance + Number(originalTxn.amount || 0)
    }
    if (originalTxn.type === 'income' || originalTxn.transferType === 'goal_withdrawal') {
      // Reversing original income subtracts the funds
      return currentBalance - Number(originalTxn.amount || 0)
    }
  }

  return currentBalance
}

/**
 * Returns total net worth across all accounts based on derived balances.
 */
export async function getTotalNetWorth(userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.account) {
    dbClient = userIdOrClient
  }
  const accounts = await getAllAccounts(userId, dbClient)
  let total = 0
  for (const acc of accounts) {
    const bal = await calculateAccountBalance(acc, dbClient)
    total += bal
  }
  return total
}

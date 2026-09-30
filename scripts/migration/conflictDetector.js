/**
 * FinTrack Conflict Detector
 *
 * Inspects PostgreSQL for ID and unique constraint collisions before migration.
 * Enforces rule: NEVER overwrite existing records or silently resolve conflicts.
 */

/**
 * Checks for conflicts between payload data and PostgreSQL database.
 *
 * @param {object} prismaClient - Prisma client
 * @param {object} data - Normalized payload data
 * @returns {Promise<{ hasConflicts: boolean, conflicts: object, details: string[] }>}
 */
export async function detectDatabaseConflicts(prismaClient, data = {}) {
  const conflicts = {
    accounts: [],
    transactions: [],
    goals: [],
    budgets: [],
    recurring: [],
    categories: [],
  }
  const details = []

  // 1. Account ID collisions
  const accountIds = (data.accounts || []).map((a) => a.id).filter(Boolean)
  if (accountIds.length > 0) {
    const existingAccounts = await prismaClient.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true, type: true },
    })
    if (existingAccounts.length > 0) {
      conflicts.accounts = existingAccounts
      for (const acc of existingAccounts) {
        details.push(`Account ID conflict: "${acc.id}" (${acc.name}) already exists in PostgreSQL.`)
      }
    }
  }

  // 2. Transaction ID collisions
  const txnIds = (data.transactions || []).map((t) => t.id).filter(Boolean)
  if (txnIds.length > 0) {
    const existingTxns = await prismaClient.transaction.findMany({
      where: { id: { in: txnIds } },
      select: { id: true, description: true, amount: true },
    })
    if (existingTxns.length > 0) {
      conflicts.transactions = existingTxns
      for (const t of existingTxns) {
        details.push(`Transaction ID conflict: "${t.id}" ("${t.description}", ₹${t.amount}) already exists in PostgreSQL.`)
      }
    }
  }

  // 3. Savings Goal ID collisions
  const goalIds = (data.goals || []).map((g) => g.id).filter(Boolean)
  if (goalIds.length > 0) {
    const existingGoals = await prismaClient.savingsGoal.findMany({
      where: { id: { in: goalIds } },
      select: { id: true, name: true, targetAmount: true },
    })
    if (existingGoals.length > 0) {
      conflicts.goals = existingGoals
      for (const g of existingGoals) {
        details.push(`Savings Goal ID conflict: "${g.id}" ("${g.name}") already exists in PostgreSQL.`)
      }
    }
  }

  // 4. Budget collisions (ID and compound unique [categoryId, month])
  const budgetIds = (data.budgets || []).map((b) => b.id).filter(Boolean)
  if (budgetIds.length > 0) {
    const existingBudgets = await prismaClient.budget.findMany({
      where: { id: { in: budgetIds } },
      select: { id: true, categoryId: true, month: true, amount: true },
    })
    if (existingBudgets.length > 0) {
      conflicts.budgets.push(...existingBudgets)
      for (const b of existingBudgets) {
        details.push(`Budget ID conflict: "${b.id}" (Category: ${b.categoryId}, Month: ${b.month}) already exists in PostgreSQL.`)
      }
    }
  }

  // Check compound unique [userId, categoryId, month]
  for (const b of data.budgets || []) {
    if (b.categoryId && b.month) {
      const targetUserId = b.userId || 'user_default_primary'
      const existingCompound = await prismaClient.budget.findFirst({
        where: { userId: targetUserId, categoryId: b.categoryId, month: b.month },
        select: { id: true, categoryId: true, month: true },
      })
      if (existingCompound && existingCompound.id !== b.id) {
        conflicts.budgets.push(existingCompound)
        details.push(
          `Budget constraint conflict: Category "${b.categoryId}" already has a budget for month "${b.month}" in PostgreSQL (Existing ID: "${existingCompound.id}").`
        )
      }
    }
  }

  // 5. Recurring Transactions ID collisions
  const recurringIds = (data.recurringTransactions || []).map((r) => r.id).filter(Boolean)
  if (recurringIds.length > 0) {
    const existingRec = await prismaClient.recurringTransaction.findMany({
      where: { id: { in: recurringIds } },
      select: { id: true, description: true, amount: true },
    })
    if (existingRec.length > 0) {
      conflicts.recurring = existingRec
      for (const r of existingRec) {
        details.push(`Recurring Transaction ID conflict: "${r.id}" ("${r.description}") already exists in PostgreSQL.`)
      }
    }
  }

  // 6. Custom Category ID collisions
  const customCatIds = (data.categories || [])
    .filter((c) => c.isCustom)
    .map((c) => c.id)
    .filter(Boolean)
  if (customCatIds.length > 0) {
    const existingCats = await prismaClient.category.findMany({
      where: { id: { in: customCatIds }, isCustom: true },
      select: { id: true, name: true },
    })
    if (existingCats.length > 0) {
      conflicts.categories = existingCats
      for (const c of existingCats) {
        details.push(`Custom Category ID conflict: "${c.id}" ("${c.name}") already exists in PostgreSQL.`)
      }
    }
  }

  const hasConflicts = details.length > 0

  return {
    hasConflicts,
    conflicts,
    details,
  }
}

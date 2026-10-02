/**
 * FinTrack Financial Auditor
 *
 * Implements strict, auditable financial integrity calculations for source (localStorage)
 * and destination (PostgreSQL) datasets according to the FinTrack accounting model:
 *
 * Derived Balance = Opening Balance + Income + Goal Withdrawals - Expenses - Goal Deposits
 * Goal deposits are NOT expenses.
 * Goal withdrawals are NOT income.
 */

/**
 * Calculates complete financial metrics for a source payload in-memory.
 *
 * @param {object} data - Normalized migration data { accounts, categories, transactions, goals, budgets, settings }
 * @returns {object} Full financial summary
 */
export function calculateSourceFinancialSummary(data = {}) {
  const accounts = data.accounts || []
  const transactions = data.transactions || []
  const goals = data.goals || []
  const budgets = data.budgets || []
  const settings = data.settings || {}

  // 1. Transaction-level aggregations
  let totalIncome = 0
  let totalExpenses = 0
  let totalGoalDeposits = 0
  let totalGoalWithdrawals = 0

  for (const t of transactions) {
    const amt = Number(t.amount) || 0
    if (t.type === 'income') {
      totalIncome += amt
    } else if (t.type === 'expense') {
      totalExpenses += amt
    } else if (t.type === 'transfer') {
      if (t.transferType === 'goal_deposit') {
        totalGoalDeposits += amt
      } else if (t.transferType === 'goal_withdrawal') {
        totalGoalWithdrawals += amt
      }
    }
  }

  // 2. Per-account derived balances
  let totalOpeningBalance = 0
  const accountBalances = {}

  for (const acc of accounts) {
    const opening = Number(acc.openingBalance) || 0
    totalOpeningBalance += opening

    const accTxns = transactions.filter((t) => t.accountId === acc.id)
    const inc = accTxns
      .filter((t) => t.type === 'income' || t.transferType === 'goal_withdrawal')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const exp = accTxns
      .filter((t) => t.type === 'expense' || t.transferType === 'goal_deposit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const derived = roundToTwo(opening + inc - exp)
    accountBalances[acc.id] = {
      name: acc.name,
      type: acc.type,
      openingBalance: roundToTwo(opening),
      income: roundToTwo(inc),
      expenses: roundToTwo(exp),
      derivedBalance: derived,
    }
  }

  const netWorth = roundToTwo(
    Object.values(accountBalances).reduce((sum, a) => sum + a.derivedBalance, 0)
  )

  // 3. Goals aggregation
  const goalBalances = {}
  let totalGoalCurrentAmount = 0
  let totalGoalTargetAmount = 0

  for (const g of goals) {
    const cur = roundToTwo(Number(g.currentAmount) || 0)
    const tgt = roundToTwo(Number(g.targetAmount) || 0)
    goalBalances[g.id] = {
      name: g.name,
      targetAmount: tgt,
      currentAmount: cur,
    }
    totalGoalCurrentAmount += cur
    totalGoalTargetAmount += tgt
  }

  return {
    recordCounts: {
      accounts: accounts.length,
      categories: (data.categories || []).length,
      transactions: transactions.length,
      goals: goals.length,
      budgets: budgets.length,
      settings: Object.keys(settings).length,
    },
    totalOpeningBalance: roundToTwo(totalOpeningBalance),
    totalIncome: roundToTwo(totalIncome),
    totalExpenses: roundToTwo(totalExpenses),
    totalGoalDeposits: roundToTwo(totalGoalDeposits),
    totalGoalWithdrawals: roundToTwo(totalGoalWithdrawals),
    netWorth,
    accountBalances,
    goalBalances,
    totalGoalCurrentAmount: roundToTwo(totalGoalCurrentAmount),
    totalGoalTargetAmount: roundToTwo(totalGoalTargetAmount),
  }
}

/**
 * Calculates complete financial metrics for migrated entities in PostgreSQL.
 *
 * @param {object} prismaClient - Prisma client
 * @param {string[]} accountIds - List of account IDs to audit
 * @param {string[]} goalIds - List of goal IDs to audit
 * @param {string[]} txnIds - List of transaction IDs to audit
 * @returns {Promise<object>} Full DB financial summary
 */
export async function calculateDbFinancialSummary(prismaClient, accountIds = [], goalIds = [], txnIds = []) {
  const accounts = await prismaClient.account.findMany({
    where: { id: { in: accountIds } },
  })

  const transactions = await prismaClient.transaction.findMany({
    where: txnIds.length > 0 ? { id: { in: txnIds } } : { accountId: { in: accountIds } },
  })

  const goals = await prismaClient.savingsGoal.findMany({
    where: { id: { in: goalIds } },
  })

  // Format into same structure as source
  const sourceMock = {
    accounts,
    transactions,
    goals,
    categories: [],
    budgets: [],
    settings: {},
  }

  return calculateSourceFinancialSummary(sourceMock)
}

/**
 * Compares source and destination financial summaries.
 * Asserts strict numerical equality.
 *
 * @param {object} source - Source financial summary
 * @param {object} db - Database financial summary
 * @returns {{ matches: boolean, discrepancies: string[] }}
 */
export function compareFinancialSummaries(source, db) {
  const discrepancies = []

  const checkField = (field, name) => {
    const sVal = roundToTwo(source[field] || 0)
    const dVal = roundToTwo(db[field] || 0)
    if (Math.abs(sVal - dVal) > 0.001) {
      discrepancies.push(`${name} mismatch: Source=${sVal} vs DB=${dVal}`)
    }
  }

  checkField('totalIncome', 'Total Income')
  checkField('totalExpenses', 'Total Expenses')
  checkField('totalGoalDeposits', 'Total Goal Deposits')
  checkField('totalGoalWithdrawals', 'Total Goal Withdrawals')
  checkField('totalOpeningBalance', 'Total Opening Balance')
  checkField('netWorth', 'Net Worth')
  checkField('totalGoalCurrentAmount', 'Total Goal Balances')

  // Check individual account balances
  for (const [accId, sAcc] of Object.entries(source.accountBalances || {})) {
    const dAcc = db.accountBalances?.[accId]
    if (!dAcc) {
      discrepancies.push(`Account ${accId} missing in DB balance check.`)
    } else if (Math.abs(sAcc.derivedBalance - dAcc.derivedBalance) > 0.001) {
      discrepancies.push(
        `Account "${sAcc.name}" (${accId}) derived balance mismatch: Source=${sAcc.derivedBalance} vs DB=${dAcc.derivedBalance}`
      )
    }
  }

  // Check individual goal balances
  for (const [gId, sGoal] of Object.entries(source.goalBalances || {})) {
    const dGoal = db.goalBalances?.[gId]
    if (!dGoal) {
      discrepancies.push(`Savings goal ${gId} missing in DB goal check.`)
    } else if (Math.abs(sGoal.currentAmount - dGoal.currentAmount) > 0.001) {
      discrepancies.push(
        `Savings goal "${sGoal.name}" (${gId}) balance mismatch: Source=${sGoal.currentAmount} vs DB=${dGoal.currentAmount}`
      )
    }
  }

  return {
    matches: discrepancies.length === 0,
    discrepancies,
  }
}

function roundToTwo(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

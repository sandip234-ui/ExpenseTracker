/**
 * FinTrack Core Migrator
 *
 * Implements atomic migration pipeline:
 * Parse -> Validate -> Audit Source -> Detect Conflicts -> (Dry-Run / Execute Transaction) -> Audit DB -> Verify Equality
 */

import prisma from '../../server/src/lib/prisma.js'
import { parseMigrationPayload } from './parser.js'
import { validateMigrationPayload } from './validator.js'
import {
  calculateSourceFinancialSummary,
  calculateDbFinancialSummary,
  compareFinancialSummaries,
} from './financialAuditor.js'
import { detectDatabaseConflicts } from './conflictDetector.js'
import { normalizeAccountName } from '../../server/src/utils/accountUtils.js'

/**
 * Runs the controlled migration.
 *
 * @param {string | object} input - Migration payload or raw JSON
 * @param {object} options
 * @param {boolean} [options.dryRun=true] - If true, performs validation & conflict check with ZERO DB writes
 * @param {boolean} [options.execute=false] - If true, executes atomic Prisma transaction
 * @param {object} [options.prismaClient=prisma] - Optional custom Prisma client instance
 * @returns {Promise<object>} Migration result report
 */
export async function runMigration(input, options = {}) {
  const isExecute = Boolean(options.execute)
  const isDryRun = !isExecute || Boolean(options.dryRun)
  const client = options.prismaClient || prisma

  // 1. Parse & Normalize Payload
  const payload = parseMigrationPayload(input)
  const { data } = payload

  // 2. Fetch existing DB reference IDs for validation
  const existingAccounts = await client.account.findMany({ select: { id: true } })
  const existingCategories = await client.category.findMany({ select: { id: true } })
  const existingGoals = await client.savingsGoal.findMany({ select: { id: true } })

  const existingDbData = {
    accountIds: new Set(existingAccounts.map((a) => a.id)),
    categoryIds: new Set(existingCategories.map((c) => c.id)),
    goalIds: new Set(existingGoals.map((g) => g.id)),
  }

  // 3. Validate Payload
  const validation = validateMigrationPayload(data, existingDbData)
  if (!validation.valid) {
    return {
      success: false,
      mode: isExecute ? 'execute' : 'dry-run',
      phase: 'validation',
      errors: validation.errors,
      warnings: validation.warnings,
      message: `Validation failed with ${validation.errors.length} error(s). No database writes attempted.`,
    }
  }

  // 4. Source Financial Audit
  const sourceFinancialSummary = calculateSourceFinancialSummary(data)

  // 5. Conflict Detection against PostgreSQL
  const conflictReport = await detectDatabaseConflicts(client, data)
  if (conflictReport.hasConflicts) {
    return {
      success: false,
      mode: isExecute ? 'execute' : 'dry-run',
      phase: 'conflict-detection',
      conflicts: conflictReport.conflicts,
      conflictDetails: conflictReport.details,
      sourceFinancialSummary,
      message: `Aborting migration: ${conflictReport.details.length} database conflict(s) detected. Existing records are never overwritten.`,
    }
  }

  // 6. Dry-Run Branch: Halt before writing anything
  if (isDryRun) {
    return {
      success: true,
      mode: 'dry-run',
      zeroWrites: true,
      localStorageUntouched: true,
      warnings: validation.warnings,
      recordCounts: sourceFinancialSummary.recordCounts,
      sourceFinancialSummary,
      message: 'Dry-run completed successfully. All validations passed, 0 conflicts found, 0 database writes executed.',
    }
  }

  // 7. Execute Branch: Atomic Prisma Transaction
  const accountIdsToMigrate = data.accounts.map((a) => a.id)
  const goalIdsToMigrate = data.goals.map((g) => g.id)
  const txnIdsToMigrate = data.transactions.map((t) => t.id)
  const newCustomCatIds = new Set()
  const targetUserId = options.userId || 'user_default_primary'

  try {
    await client.$transaction(async (tx) => {
      // 7a. Insert Custom Categories
      for (const cat of data.categories) {
        const catId = cat.id
        const existing = await tx.category.findUnique({ where: { id: catId } })
        if (!existing) {
          await tx.category.create({
            data: {
              id: catId,
              userId: targetUserId,
              name: cat.name || cat.label || catId,
              type: cat.type || 'expense',
              icon: cat.icon || null,
              color: cat.color || null,
              isCustom: true,
            },
          })
          newCustomCatIds.add(catId)
        }
      }

      // 7b. Insert Accounts (Preserve original IDs)
      for (const acc of data.accounts) {
        await tx.account.create({
          data: {
            id: acc.id,
            userId: acc.userId || targetUserId,
            name: acc.name,
            normalizedName: normalizeAccountName(acc.name),
            type: String(acc.type || 'bank').toLowerCase(),
            openingBalance: Number(acc.openingBalance) || 0,
            currency: acc.currency || 'INR',
            icon: acc.icon || null,
            color: acc.color || null,
            createdAt: acc.createdAt ? new Date(acc.createdAt) : new Date(),
          },
        })
      }

      // 7c. Insert Savings Goals (Preserve original IDs)
      for (const goal of data.goals) {
        await tx.savingsGoal.create({
          data: {
            id: goal.id,
            userId: goal.userId || targetUserId,
            name: goal.name,
            targetAmount: Number(goal.targetAmount),
            currentAmount: Number(goal.currentAmount) || 0,
            targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
            category: goal.category || null,
            color: goal.color || null,
            icon: goal.icon || null,
            notes: goal.notes || null,
            createdAt: goal.createdAt ? new Date(goal.createdAt) : new Date(),
          },
        })
      }

      // 7d. Insert Budgets (Preserve original IDs)
      for (const b of data.budgets) {
        await tx.budget.create({
          data: {
            id: b.id,
            userId: b.userId || targetUserId,
            categoryId: b.categoryId,
            month: b.month,
            amount: Number(b.amount),
            createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
          },
        })
      }

      // 7e. Insert Transactions (Preserve original IDs)
      for (const t of data.transactions) {
        const catId = t.categoryId || t.category
        const validCategory =
          catId && (existingDbData.categoryIds.has(catId) || newCustomCatIds.has(catId)) ? catId : null

        await tx.transaction.create({
          data: {
            id: t.id,
            userId: t.userId || targetUserId,
            type: String(t.type || 'expense').toLowerCase(),
            amount: Number(t.amount),
            description: t.description,
            date: new Date(t.date),
            paymentMethod: t.paymentMethod || 'Other',
            notes: t.notes || '',
            transferType: t.transferType || null,
            goalName: t.goalName || null,
            accountId: t.accountId,
            categoryId: validCategory,
            goalId: t.goalId || null,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          },
        })
      }

      // 7f. Insert / Upsert Settings
      for (const [key, value] of Object.entries(data.settings || {})) {
        await tx.setting.upsert({
          where: {
            userId_key: {
              userId: targetUserId,
              key,
            },
          },
          update: { value: String(value) },
          create: { userId: targetUserId, key, value: String(value) },
        })
      }
    })
  } catch (txErr) {
    return {
      success: false,
      mode: 'execute',
      phase: 'transaction-execution',
      error: txErr.message,
      rolledBack: true,
      message: `Migration transaction failed and was completely rolled back: ${txErr.message}`,
    }
  }

  // 8. Post-Migration Verification & Financial Audit
  const dbFinancialSummary = await calculateDbFinancialSummary(
    client,
    accountIdsToMigrate,
    goalIdsToMigrate,
    txnIdsToMigrate
  )

  const comparison = compareFinancialSummaries(sourceFinancialSummary, dbFinancialSummary)

  return {
    success: true,
    mode: 'execute',
    phase: 'completed',
    localStorageUntouched: true,
    sourceFinancialSummary,
    dbFinancialSummary,
    comparison,
    insertedCounts: {
      accounts: data.accounts.length,
      categories: newCustomCatIds.size,
      transactions: data.transactions.length,
      goals: data.goals.length,
      budgets: data.budgets.length,
      settings: Object.keys(data.settings || {}).length,
    },
    message: comparison.matches
      ? 'Migration executed successfully. All IDs preserved and financial integrity verified 100% against PostgreSQL.'
      : `Migration executed with financial discrepancies: ${comparison.discrepancies.join('; ')}`,
  }
}

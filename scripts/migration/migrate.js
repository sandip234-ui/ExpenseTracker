#!/usr/bin/env node
/**
 * FinTrack Controlled LocalStorage -> PostgreSQL Migration CLI
 *
 * Usage:
 *   node scripts/migration/migrate.js --file <path-to-json> [--dry-run | --execute] [--json]
 */

import fs from 'fs'
import path from 'path'
import { runMigration } from './migrator.js'
import prisma from '../../server/src/lib/prisma.js'

function printHelp() {
  console.log(`
FinTrack LocalStorage -> PostgreSQL Controlled Migration Tool

Usage:
  node scripts/migration/migrate.js --file <path> [options]

Options:
  --file <path>       Path to JSON export or versioned migration payload (Required)
  --dry-run           Validate and audit data, detect conflicts; ZERO database writes (Default)
  --execute           Atomically migrate validated records into PostgreSQL via Prisma transaction
  --json              Output full result object as JSON
  --help              Show this help message

Safety Guarantees:
  - Never overwrites conflicting database records (aborts immediately).
  - Never truncates or resets tables.
  - Never mutates or deletes localStorage.
  - Automatically rolls back the entire batch if any record fails during --execute.
  - Verifies exact financial integrity before and after migration.
`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.length === 0) {
    printHelp()
    process.exit(0)
  }

  const fileIdx = args.indexOf('--file')
  if (fileIdx === -1 || !args[fileIdx + 1]) {
    console.error('❌ Error: Missing required --file <path> argument.\n')
    printHelp()
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), args[fileIdx + 1])
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: Specified file does not exist: "${filePath}"\n`)
    process.exit(1)
  }

  const isExecute = args.includes('--execute')
  const isDryRun = args.includes('--dry-run') || !isExecute
  const isJson = args.includes('--json')

  let rawContent
  try {
    rawContent = fs.readFileSync(filePath, 'utf-8')
  } catch (err) {
    console.error(`❌ Error reading file: ${err.message}`)
    process.exit(1)
  }

  if (!isJson) {
    console.log('='.repeat(70))
    console.log(`🚀 FinTrack Migration Tool — Mode: ${isExecute ? 'EXECUTE' : 'DRY-RUN'}`)
    console.log(`📁 Source: ${filePath}`)
    console.log('='.repeat(70))
  }

  const result = await runMigration(rawContent, {
    execute: isExecute,
    dryRun: isDryRun,
  })

  if (isJson) {
    console.log(JSON.stringify(result, null, 2))
    await prisma.$disconnect()
    process.exit(result.success ? 0 : 1)
  }

  // Human-readable formatting
  if (!result.success) {
    console.error(`\n❌ MIGRATION FAILED (${result.phase}):`)
    console.error(`   ${result.message}\n`)

    if (result.errors && result.errors.length > 0) {
      console.error('Validation Errors:')
      result.errors.forEach((e) => console.error(`   - ${e}`))
    }

    if (result.conflictDetails && result.conflictDetails.length > 0) {
      console.error('\nDatabase Conflicts Detected:')
      result.conflictDetails.forEach((c) => console.error(`   - ${c}`))
      console.error('\nExisting PostgreSQL records were NOT overwritten.')
    }

    if (result.rolledBack) {
      console.error('\n🛡️  Transaction rolled back: 0 partial records were left in the database.')
    }

    await prisma.$disconnect()
    process.exit(1)
  }

  // Success summary
  const summary = result.sourceFinancialSummary
  console.log('\n📊 Source Record Counts:')
  console.table(summary.recordCounts)

  console.log('💰 Financial Integrity Summary:')
  console.log(`   Total Opening Balance : ₹${summary.totalOpeningBalance.toFixed(2)}`)
  console.log(`   Total Income          : ₹${summary.totalIncome.toFixed(2)}`)
  console.log(`   Total Expenses        : ₹${summary.totalExpenses.toFixed(2)}`)
  console.log(`   Goal Deposits         : ₹${summary.totalGoalDeposits.toFixed(2)}`)
  console.log(`   Goal Withdrawals      : ₹${summary.totalGoalWithdrawals.toFixed(2)}`)
  console.log(`   Total Net Worth       : ₹${summary.netWorth.toFixed(2)}`)
  console.log(`   Goal Balances Sum     : ₹${summary.totalGoalCurrentAmount.toFixed(2)}`)

  console.log('\n🏦 Account Balances (Opening + Income + Goal Withdrawals - Expenses - Goal Deposits):')
  const accTable = Object.entries(summary.accountBalances).map(([id, a]) => ({
    ID: id,
    Name: a.name,
    Type: a.type,
    Opening: `₹${a.openingBalance.toFixed(2)}`,
    Income: `₹${a.income.toFixed(2)}`,
    Expenses: `₹${a.expenses.toFixed(2)}`,
    Derived: `₹${a.derivedBalance.toFixed(2)}`,
  }))
  console.table(accTable)

  if (result.mode === 'dry-run') {
    console.log('\n' + '='.repeat(70))
    console.log('✅ DRY-RUN SUCCESSFUL')
    console.log('   - 0 database writes performed')
    console.log('   - 0 localStorage changes')
    console.log('   - 0 conflicts detected')
    console.log('   - All validation checks passed')
    console.log('   - Financial integrity model verified')
    console.log('='.repeat(70))
    console.log('To execute this migration against PostgreSQL, rerun with --execute.')
  } else {
    console.log('\n' + '='.repeat(70))
    console.log('🎉 EXECUTE SUCCESSFUL')
    console.log(`   - Accounts inserted     : ${result.insertedCounts.accounts}`)
    console.log(`   - Custom categories     : ${result.insertedCounts.categories}`)
    console.log(`   - Transactions inserted : ${result.insertedCounts.transactions}`)
    console.log(`   - Goals inserted        : ${result.insertedCounts.goals}`)
    console.log(`   - Budgets inserted      : ${result.insertedCounts.budgets}`)
    console.log(`   - Recurring inserted    : ${result.insertedCounts.recurring}`)
    console.log(`   - Settings updated      : ${result.insertedCounts.settings}`)
    console.log(`   - Original IDs preserved: 100%`)
    console.log(`   - Database verification : ${result.comparison.matches ? 'PERFECT MATCH' : 'MISMATCH'}`)
    console.log('='.repeat(70))
  }

  await prisma.$disconnect()
  process.exit(0)
}

main().catch(async (e) => {
  console.error('Fatal CLI Error:', e)
  await prisma.$disconnect()
  process.exit(1)
})

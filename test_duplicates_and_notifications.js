/**
 * FINTRACK VERIFICATION TEST SUITE:
 * PART A: Account Duplicates & Normalized Uniqueness
 * PART B: Notification Center Persistence & Lifecycle
 */

import assert from 'node:assert'
import prisma from './server/src/lib/prisma.js'
import * as accountService from './server/src/services/accountService.js'
import * as transactionService from './server/src/services/transactionService.js'
import * as goalService from './server/src/services/goalService.js'
import * as notificationService from './server/src/services/notificationService.js'
import {
  normalizeAccountName,
  formatCleanAccountName,
  cleanupDuplicateAccountNames,
} from './server/src/utils/accountUtils.js'
import { AccountNameExistsError } from './server/src/errors/domainErrors.js'

console.log('======================================================================')
console.log('🧪 FINTRACK TEST SUITE: ACCOUNT UNIQUENESS & NOTIFICATION CENTER')
console.log('======================================================================\n')

async function runTests() {
  const prefix = `test-${Date.now()}`
  const userAId = `${prefix}-user-a`
  const userBId = `${prefix}-user-b`

  try {
    // 0. Setup isolated test users
    console.log('0. Setting up isolated test users...')
    await prisma.user.createMany({
      data: [
        { id: userAId, email: `${userAId}@test.local`, passwordHash: 'hash', name: 'User A' },
        { id: userBId, email: `${userBId}@test.local`, passwordHash: 'hash', name: 'User B' },
      ],
    })
    console.log('  ✓ Test users created.\n')

    // ─────────────────────────────────────────────────────────────────────────
    // PART A: ACCOUNT UNIQUENESS TESTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- PART A: ACCOUNT UNIQUENESS & DUPLICATE CLEANUP ---')

    // Test 1: Normalize account name utility
    console.log('1. Testing name normalization (trim, case-insensitive, internal whitespace)...')
    assert.strictEqual(normalizeAccountName('  HDFC   Bank  '), 'hdfc bank')
    assert.strictEqual(normalizeAccountName('HDFC Bank'), 'hdfc bank')
    assert.strictEqual(normalizeAccountName('hdfc bank'), 'hdfc bank')
    assert.strictEqual(normalizeAccountName('Cash   Wallet '), 'cash wallet')
    console.log('  ✓ Pass: normalizeAccountName correctly cleans whitespace and lowercases')

    // Test 2: Create account with clean name
    console.log('\n2. Creating initial account "HDFC Bank" for User A...')
    const accA1 = await accountService.createAccount({
      id: `${prefix}-acc-a1`,
      userId: userAId,
      name: 'HDFC Bank',
      type: 'bank',
      openingBalance: 10000,
    })
    assert.strictEqual(accA1.name, 'HDFC Bank')
    assert.strictEqual(accA1.normalizedName, 'hdfc bank')
    console.log('  ✓ Pass: Account created with normalizedName="hdfc bank"')

    // Test 3: Exact duplicate rejection
    console.log('\n3. Testing exact duplicate rejection for same user...')
    let exactRejected = false
    try {
      await accountService.createAccount({
        id: `${prefix}-acc-a2`,
        userId: userAId,
        name: 'HDFC Bank',
        type: 'bank',
        openingBalance: 5000,
      })
    } catch (err) {
      assert.ok(err instanceof AccountNameExistsError)
      assert.strictEqual(err.statusCode, 409)
      assert.strictEqual(err.code, 'ACCOUNT_NAME_EXISTS')
      assert.strictEqual(err.message, 'An account with this name already exists.')
      exactRejected = true
      console.log(`  ✓ Pass: Exact duplicate rejected with HTTP 409 ACCOUNT_NAME_EXISTS: "${err.message}"`)
    }
    assert.strictEqual(exactRejected, true)

    // Test 4: Case-insensitive duplicate rejection
    console.log('\n4. Testing case-insensitive duplicate rejection ("hdfc bank")...')
    let caseRejected = false
    try {
      await accountService.createAccount({
        id: `${prefix}-acc-a3`,
        userId: userAId,
        name: 'hdfc bank',
        type: 'bank',
        openingBalance: 2000,
      })
    } catch (err) {
      assert.ok(err instanceof AccountNameExistsError)
      assert.strictEqual(err.statusCode, 409)
      assert.strictEqual(err.code, 'ACCOUNT_NAME_EXISTS')
      caseRejected = true
      console.log(`  ✓ Pass: Case-insensitive duplicate rejected: "${err.message}"`)
    }
    assert.strictEqual(caseRejected, true)

    // Test 5: Whitespace duplicate rejection ("  HDFC   Bank  ")
    console.log('\n5. Testing whitespace-padded duplicate rejection ("  HDFC   Bank  ")...')
    let wsRejected = false
    try {
      await accountService.createAccount({
        id: `${prefix}-acc-a4`,
        userId: userAId,
        name: '  HDFC   Bank  ',
        type: 'bank',
        openingBalance: 1000,
      })
    } catch (err) {
      assert.ok(err instanceof AccountNameExistsError)
      assert.strictEqual(err.statusCode, 409)
      assert.strictEqual(err.code, 'ACCOUNT_NAME_EXISTS')
      wsRejected = true
      console.log(`  ✓ Pass: Whitespace variation duplicate rejected: "${err.message}"`)
    }
    assert.strictEqual(wsRejected, true)

    // Test 6: Duplicate update rejection
    console.log('\n6. Testing account update duplicate rejection...')
    const accA2 = await accountService.createAccount({
      id: `${prefix}-acc-a5`,
      userId: userAId,
      name: 'Cash Wallet',
      type: 'cash',
      openingBalance: 3000,
    })
    // Updating accA2 to its own name is valid
    await accountService.updateAccount(accA2.id, { name: 'Cash Wallet', openingBalance: 3500 })
    console.log('  ✓ Pass: Updating account with same name is allowed')

    // Updating accA2 to accA1's name ('hdfc bank') must fail
    let updateDupRejected = false
    try {
      await accountService.updateAccount(accA2.id, { name: '  hdfc bank ' })
    } catch (err) {
      assert.ok(err instanceof AccountNameExistsError)
      assert.strictEqual(err.statusCode, 409)
      assert.strictEqual(err.code, 'ACCOUNT_NAME_EXISTS')
      updateDupRejected = true
      console.log(`  ✓ Pass: Renaming account to an existing name rejected with 409: "${err.message}"`)
    }
    assert.strictEqual(updateDupRejected, true)

    // Test 7: Multi-user authorization (User B can also have "HDFC Bank")
    console.log('\n7. Testing user isolation: User B independently creating "HDFC Bank"...')
    const accB1 = await accountService.createAccount({
      id: `${prefix}-acc-b1`,
      userId: userBId,
      name: 'HDFC Bank',
      type: 'bank',
      openingBalance: 25000,
    })
    assert.strictEqual(accB1.name, 'HDFC Bank')
    assert.strictEqual(accB1.userId, userBId)
    console.log('  ✓ Pass: User B successfully created "HDFC Bank" (Uniqueness is isolated per user)')

    // Test 8: Deterministic cleanup & idempotency
    console.log('\n8. Testing deterministic duplicate cleanup & idempotency...')
    // Create an isolated user for cleanup testing
    const cleanupUser = `${prefix}-cleanup-user`
    await prisma.user.create({
      data: { id: cleanupUser, email: `${cleanupUser}@test.local`, passwordHash: 'hash', name: 'Cleanup User' },
    })

    // Insert 3 raw duplicates bypassing service
    const now = new Date()
    await prisma.account.createMany({
      data: [
        { id: `${prefix}-c1`, userId: cleanupUser, name: 'Salary Bank', normalizedName: 'temp-1', type: 'bank', openingBalance: 10000, createdAt: new Date(now.getTime() - 30000) },
        { id: `${prefix}-c2`, userId: cleanupUser, name: 'salary bank', normalizedName: 'temp-2', type: 'bank', openingBalance: 5000, createdAt: new Date(now.getTime() - 20000) },
        { id: `${prefix}-c3`, userId: cleanupUser, name: ' Salary   Bank ', normalizedName: 'temp-3', type: 'bank', openingBalance: 2000, createdAt: new Date(now.getTime() - 10000) },
      ],
    })

    // Add transactions and goal to ensure relationships & balances are preserved
    await transactionService.createTransaction({
      id: `${prefix}-c-tx1`,
      userId: cleanupUser,
      type: 'income',
      amount: 4000,
      accountId: `${prefix}-c1`,
      categoryId: 'salary',
      description: 'Income c1',
      date: '2026-09-01',
    })
    await transactionService.createTransaction({
      id: `${prefix}-c-tx2`,
      userId: cleanupUser,
      type: 'expense',
      amount: 1500,
      accountId: `${prefix}-c2`,
      categoryId: 'food',
      description: 'Expense c2',
      date: '2026-09-02',
    })

    const balBeforeC1 = await accountService.calculateAccountBalance(`${prefix}-c1`)
    const balBeforeC2 = await accountService.calculateAccountBalance(`${prefix}-c2`)
    const balBeforeC3 = await accountService.calculateAccountBalance(`${prefix}-c3`)

    // Run deterministic cleanup
    const cleanupResult = await cleanupDuplicateAccountNames(prisma)
    console.log(`  ✓ Cleanup executed. Accounts renamed: ${cleanupResult.duplicatesRenamed}`)

    const c1 = await prisma.account.findUnique({ where: { id: `${prefix}-c1` } })
    const c2 = await prisma.account.findUnique({ where: { id: `${prefix}-c2` } })
    const c3 = await prisma.account.findUnique({ where: { id: `${prefix}-c3` } })

    assert.strictEqual(c1.name, 'Salary Bank')
    assert.strictEqual(c2.name, 'salary bank (2)')
    assert.strictEqual(c3.name, 'Salary Bank (3)')
    console.log(`  ✓ Pass: Names deterministically renamed: "${c1.name}", "${c2.name}", "${c3.name}"`)

    // Verify financial integrity
    const balAfterC1 = await accountService.calculateAccountBalance(`${prefix}-c1`)
    const balAfterC2 = await accountService.calculateAccountBalance(`${prefix}-c2`)
    const balAfterC3 = await accountService.calculateAccountBalance(`${prefix}-c3`)

    assert.strictEqual(balBeforeC1, balAfterC1, 'C1 balance preserved')
    assert.strictEqual(balBeforeC2, balAfterC2, 'C2 balance preserved')
    assert.strictEqual(balBeforeC3, balAfterC3, 'C3 balance preserved')
    assert.strictEqual(balAfterC1, 14000)
    assert.strictEqual(balAfterC2, 3500)
    assert.strictEqual(balAfterC3, 2000)
    console.log('  ✓ Pass: Derived balances and transaction history 100% preserved')

    // Idempotency: Running cleanup again renames 0 accounts
    const cleanupRun2 = await cleanupDuplicateAccountNames(prisma)
    assert.strictEqual(cleanupRun2.duplicatesRenamed, 0, 'Second run must rename 0 accounts')
    assert.strictEqual(cleanupRun2.userBreakdown[cleanupUser], 0)
    console.log('  ✓ Pass: Cleanup is completely idempotent (second run changed 0 accounts)')

    // ─────────────────────────────────────────────────────────────────────────
    // PART B: NOTIFICATION CENTER TESTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- PART B: NOTIFICATION CENTER PERSISTENCE & LIFECYCLE ---')

    // Test 9: Get initial notification states
    console.log('9. Testing notification state retrieval...')
    const statesA = await notificationService.getNotificationStates(userAId)
    assert.strictEqual(Array.isArray(statesA), true)
    assert.strictEqual(statesA.length, 0)
    console.log('  ✓ Pass: Initial states retrieved cleanly (empty list)')

    // Test 10: Mark notifications as read
    console.log('\n10. Testing mark notifications as read...')
    const alertIds = ['budget-warn-1', 'rec-due-1', 'acc-neg-1']
    await notificationService.markAsRead(userAId, alertIds)

    const statesAAfterRead = await notificationService.getNotificationStates(userAId)
    assert.strictEqual(statesAAfterRead.length, 3)
    statesAAfterRead.forEach((s) => {
      assert.strictEqual(s.isRead, true)
      assert.strictEqual(s.isDismissed, false)
      assert.ok(s.readAt instanceof Date)
    })
    console.log('  ✓ Pass: Notifications marked as read and persisted in PostgreSQL')

    // Test 11: Dismiss single notification
    console.log('\n11. Testing individual notification dismissal...')
    await notificationService.dismissNotification(userAId, 'budget-warn-1')
    const statesAAfterDismiss = await notificationService.getNotificationStates(userAId)
    const dismissedAlert = statesAAfterDismiss.find((s) => s.alertId === 'budget-warn-1')
    assert.strictEqual(dismissedAlert.isDismissed, true)
    assert.ok(dismissedAlert.dismissedAt instanceof Date)
    console.log('  ✓ Pass: Alert "budget-warn-1" individually dismissed with timestamp')

    // Test 12: Clear All notifications (dismissAll)
    console.log('\n12. Testing Clear All (dismissAll)...')
    await notificationService.dismissAll(userAId, ['rec-due-1', 'acc-neg-1'])
    const statesAAfterClearAll = await notificationService.getNotificationStates(userAId)
    statesAAfterClearAll.forEach((s) => {
      assert.strictEqual(s.isDismissed, true)
      assert.ok(s.dismissedAt instanceof Date)
    })
    console.log('  ✓ Pass: Clear All dismissed all active alerts')

    // Test 13: Notification User Isolation
    console.log('\n13. Testing notification user isolation (User A vs User B)...')
    const statesB = await notificationService.getNotificationStates(userBId)
    assert.strictEqual(statesB.length, 0, 'User B must have 0 notification records')
    console.log('  ✓ Pass: Notification states are strictly isolated per authenticated user')

    // ─────────────────────────────────────────────────────────────────────────
    // CLEANUP TEST FIXTURES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Cleaning Up Test Fixtures ---')
    await prisma.notificationState.deleteMany({
      where: { userId: { in: [userAId, userBId, cleanupUser] } },
    })
    await prisma.transaction.deleteMany({
      where: { userId: { in: [userAId, userBId, cleanupUser] } },
    })
    await prisma.account.deleteMany({
      where: { userId: { in: [userAId, userBId, cleanupUser] } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId, cleanupUser] } },
    })
    console.log('✓ All test fixtures cleanly removed from PostgreSQL.')

    console.log('\n======================================================================')
    console.log('🎉 ALL 13/13 ACCOUNT UNIQUENESS & NOTIFICATION TESTS PASSED!')
    console.log('======================================================================\n')
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runTests()

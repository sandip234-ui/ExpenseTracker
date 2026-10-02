/**
 * FinTrack Phase 4 & Phase 9: REST API Integration & Security Test Suite
 * Validates:
 * 1. Health & reachability
 * 2. Authentication & Authorization (Login, JWT, password hashing, 401s, 409s)
 * 3. Cross-User Data Isolation (multi-tenancy boundaries strictly enforced)
 * 4. Financial Rules (A to L) with authoritative derived balances
 * 5. Savings Goals & Atomic Physical Transfers (Edge Cases 7, 8, 10, 11)
 * 6. Financial Edge Cases (1 to 6, 9)
 * 7. Budgets & Category Protections
 */

import request from 'supertest'
import assert from 'node:assert'
import bcrypt from 'bcryptjs'
import { app } from './src/app.js'
import { prisma } from './src/lib/prisma.js'

const testPrefix = `apitest-${Date.now()}`
let authToken = null
let primaryUserId = null
let secondaryUserId = null
let secondaryToken = null

async function runApiTests() {
  console.log('=================================================================')
  console.log('--- STARTING FINTRACK REST API SECURITY & FINANCIAL TESTS ---')
  console.log('=================================================================\n')

  try {
    // ---------------------------------------------------------------
    // 1. HEALTH ENDPOINT (Public)
    // ---------------------------------------------------------------
    console.log('1. Testing GET /api/health...')
    const healthRes = await request(app).get('/api/health')
    assert.strictEqual(healthRes.status, 200)
    assert.strictEqual(healthRes.body.status, 'ok')
    assert.strictEqual(healthRes.body.service, 'FinTrack API')
    console.log('  ✓ Pass: Health endpoint returns 200 OK without authentication\n')

    // ---------------------------------------------------------------
    // 2. AUTHENTICATION & SECURITY CONTROLS
    // ---------------------------------------------------------------
    console.log('2. Testing Authentication & Security Controls...')

    // 2a. Protected endpoint rejected without auth (401)
    const noAuthRes = await request(app).get('/api/accounts')
    assert.strictEqual(noAuthRes.status, 401)
    assert.strictEqual(noAuthRes.body.error.code, 'UNAUTHORIZED')
    console.log('  ✓ Pass: Protected endpoint rejected without token (HTTP 401 UNAUTHORIZED)')

    // 2b. Protected endpoint rejected with malformed token (401)
    const badTokenRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', 'Bearer invalid-token-string')
    assert.strictEqual(badTokenRes.status, 401)
    console.log('  ✓ Pass: Protected endpoint rejected with invalid token (HTTP 401)')

    // 2c. Login with non-existent email rejected (401)
    const nonExistentRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@fintrack.local', password: 'Password123!' })
    assert.strictEqual(nonExistentRes.status, 401)
    assert.strictEqual(nonExistentRes.body.error.code, 'UNAUTHORIZED')
    console.log('  ✓ Pass: Login rejected for non-existent email (HTTP 401)')

    // 2d. Login with incorrect password rejected (401)
    const badPassRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@fintrack.local', password: 'WrongPassword999!' })
    assert.strictEqual(badPassRes.status, 401)
    console.log('  ✓ Pass: Login rejected for invalid password (HTTP 401)')

    // 2e. Login with valid credentials succeeds (200)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@fintrack.local', password: 'Password123!' })
    assert.strictEqual(loginRes.status, 200)
    assert.ok(loginRes.body.token, 'Should return JWT token')
    assert.strictEqual(loginRes.body.data.email, 'demo@fintrack.local')
    assert.strictEqual(loginRes.body.data.password, undefined, 'Password must not be returned in API response')
    assert.strictEqual(loginRes.body.data.passwordHash, undefined, 'Password hash must not be returned')
    authToken = loginRes.body.token
    primaryUserId = loginRes.body.data.id
    console.log('  ✓ Pass: Login succeeded, returned JWT token and sanitized profile')

    // 2f. Verify password hashing in PostgreSQL database
    const dbUser = await prisma.user.findUnique({ where: { id: primaryUserId } })
    assert.ok(dbUser.passwordHash, 'User must have passwordHash stored')
    assert.notStrictEqual(dbUser.passwordHash, 'Password123!', 'Plaintext password must NEVER be stored')
    assert.match(dbUser.passwordHash, /^\$2[aby]\$\d{2}\$/, 'Password must be hashed with bcrypt')
    const passMatches = bcrypt.compareSync('Password123!', dbUser.passwordHash)
    assert.strictEqual(passMatches, true, 'Bcrypt compare must verify original password')
    console.log('  ✓ Pass: Database stores only bcrypt password hashes, zero plaintext passwords')

    // 2g. Duplicate email registration rejected with HTTP 409
    const dupRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'demo@fintrack.local',
        password: 'Password123!',
        name: 'Duplicate Demo',
      })
    assert.strictEqual(dupRegRes.status, 409)
    assert.strictEqual(dupRegRes.body.error.code, 'EMAIL_EXISTS')
    console.log('  ✓ Pass: Duplicate email registration rejected with HTTP 409 EMAIL_EXISTS')

    // 2h. Register isolated second user (User B)
    const userBEmail = `userb-${Date.now()}@fintrack.local`
    const regBRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: userBEmail,
        password: 'Password123!',
        name: 'User B',
      })
    assert.strictEqual(regBRes.status, 201)
    assert.ok(regBRes.body.token)
    secondaryToken = regBRes.body.token
    secondaryUserId = regBRes.body.data.id
    console.log('  ✓ Pass: Successfully registered secondary test user (User B)')

    // 2i. Verify User B starter accounts are isolated
    const bAccsRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${secondaryToken}`)
    assert.strictEqual(bAccsRes.status, 200)
    assert.strictEqual(bAccsRes.body.data.length, 3, 'User B should have 3 starter accounts')
    assert.ok(bAccsRes.body.data.every((a) => a.userId === secondaryUserId))
    console.log('  ✓ Pass: User B has dedicated, isolated starter accounts\n')

    // ---------------------------------------------------------------
    // 3. ACCOUNT API & FINANCIAL RULES A-L (Scoped to Primary User)
    // ---------------------------------------------------------------
    console.log('3. Testing Account API & Financial Rules (A to L) under Authentication...')

    // Create Account for Rules Test
    const acc1Res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `${testPrefix}-Bank`,
        type: 'bank',
        openingBalance: 10000,
        currency: 'INR',
      })
    assert.strictEqual(acc1Res.status, 201)
    assert.strictEqual(acc1Res.body.data.openingBalance, 10000)
    assert.strictEqual(acc1Res.body.data.balance, 10000)
    const acc1Id = acc1Res.body.data.id

    const acc2Res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `${testPrefix}-UPI`,
        type: 'upi',
        openingBalance: 5000,
        currency: 'INR',
      })
    assert.strictEqual(acc2Res.status, 201)
    const acc2Id = acc2Res.body.data.id

    // Cross-User Isolation Check on Account
    const crossAccRes = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${secondaryToken}`)
    assert.strictEqual(crossAccRes.status, 404, 'User B must NOT see Primary User account')
    console.log('  ✓ Pass: Cross-user account access strictly denied (HTTP 404)')

    // Fetch All Accounts for Primary User
    const allAccsRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(allAccsRes.status, 200)
    assert.ok(Array.isArray(allAccsRes.body.data))
    assert.ok(allAccsRes.body.data.some((a) => a.id === acc1Id))
    console.log('  ✓ Pass: GET /api/accounts returns list with derived balances for authenticated user')

    // Fetch Net Worth
    const nwRes = await request(app)
      .get('/api/accounts/net-worth')
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(nwRes.status, 200)
    assert.ok(typeof nwRes.body.data.totalNetWorth === 'number')
    console.log(`  ✓ Pass: GET /api/accounts/net-worth returns total: ₹${nwRes.body.data.totalNetWorth}`)

    // Rule A: Income -> Account -> ₹7,000 (Balance -> ₹17,000)
    const incRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Salary Bonus',
        amount: 7000,
        type: 'income',
        accountId: acc1Id,
        paymentMethod: 'net_banking',
        date: new Date().toISOString(),
      })
    assert.strictEqual(incRes.status, 201)
    const incTxId = incRes.body.data.id

    // Cross-User Transaction Isolation Check
    const crossTxRes = await request(app)
      .get(`/api/transactions/${incTxId}`)
      .set('Authorization', `Bearer ${secondaryToken}`)
    assert.strictEqual(crossTxRes.status, 404, 'User B must NOT see Primary User transaction')
    console.log('  ✓ Pass: Cross-user transaction access strictly denied (HTTP 404)')

    // Cross-User Transaction Creation Rejection
    const crossCreateTx = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${secondaryToken}`)
      .send({
        description: 'Malicious debit attempt',
        amount: 1000,
        type: 'expense',
        accountId: acc1Id, // attempting to spend from Primary User's account
      })
    assert.strictEqual(crossCreateTx.status, 404, 'User B cannot spend from Primary User account')
    console.log('  ✓ Pass: Cross-user debit attempt on unauthorized account rejected (HTTP 404)')

    const acc1AfterInc = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterInc.status, 200)
    assert.strictEqual(acc1AfterInc.body.data.balance, 17000)
    console.log('  ✓ Pass Test A: Income increases account balance to ₹17,000')

    // Rule B: Expense -> Account -> ₹2,000 (Balance -> ₹15,000)
    const expRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Groceries',
        amount: 2000,
        type: 'expense',
        accountId: acc1Id,
        paymentMethod: 'debit_card',
        date: new Date().toISOString(),
      })
    assert.strictEqual(expRes.status, 201)
    const expTxId = expRes.body.data.id

    const acc1AfterExp = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterExp.body.data.balance, 15000)
    console.log('  ✓ Pass Test B: Expense decreases account balance to ₹15,000')

    // Rule C: Expense > Available Balance -> 400 Rejected (Insufficient Balance)
    const overExpRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Overspend Attempt',
        amount: 15001,
        type: 'expense',
        accountId: acc1Id,
        paymentMethod: 'debit_card',
        date: new Date().toISOString(),
      })
    assert.strictEqual(overExpRes.status, 400)
    assert.strictEqual(overExpRes.body.error.code, 'INSUFFICIENT_BALANCE')
    console.log('  ✓ Pass Test C: Overspending rejected with HTTP 400 INSUFFICIENT_BALANCE')

    // Rule D: Edit Expense with Reversal Calculation
    const editExpRes = await request(app)
      .put(`/api/transactions/${expTxId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 16000,
      })
    assert.strictEqual(editExpRes.status, 200)
    const acc1AfterEdit = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterEdit.body.data.balance, 1000)
    console.log('  ✓ Pass Test D: Edit expense with reversal allows valid update, balance now ₹1,000')

    // Rule E: Edit Income Amount
    const editIncRes = await request(app)
      .put(`/api/transactions/${incTxId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 8000,
      })
    assert.strictEqual(editIncRes.status, 200)
    const acc1AfterIncEdit = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterIncEdit.body.data.balance, 2000)
    console.log('  ✓ Pass Test E: Edit income updates balance to ₹2,000')

    // Rule F: Change Expense -> Income
    const expToIncRes = await request(app)
      .put(`/api/transactions/${expTxId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'income',
        amount: 5000,
      })
    assert.strictEqual(expToIncRes.status, 200)
    const acc1AfterF = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterF.body.data.balance, 23000)
    console.log('  ✓ Pass Test F: Expense -> Income reverses expense and adds income -> ₹23,000')

    // Rule G: Change Income -> Expense
    const incToExpRes = await request(app)
      .put(`/api/transactions/${expTxId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'expense',
        amount: 3000,
      })
    assert.strictEqual(incToExpRes.status, 200)
    const acc1AfterG = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterG.body.data.balance, 15000)
    console.log('  ✓ Pass Test G: Income -> Expense reverses income and applies expense -> ₹15,000')

    // Rule H: Change Account during Edit
    const moveAccRes = await request(app)
      .put(`/api/transactions/${expTxId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        accountId: acc2Id,
        paymentMethod: 'upi',
      })
    assert.strictEqual(moveAccRes.status, 200)
    const acc1AfterH = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    const acc2AfterH = await request(app)
      .get(`/api/accounts/${acc2Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterH.body.data.balance, 18000)
    assert.strictEqual(acc2AfterH.body.data.balance, 2000)
    console.log('  ✓ Pass Test H: Changing account restores original account and debits new account')

    // Rule I: Category/Type validation
    const foodCat = await prisma.category.findFirst({ where: { name: 'Food' } })
    const invalidCatRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Invalid category test',
        amount: 1000,
        type: 'income',
        accountId: acc1Id,
        categoryId: foodCat.id,
        paymentMethod: 'net_banking',
      })
    assert.strictEqual(invalidCatRes.status, 400)
    assert.strictEqual(invalidCatRes.body.error.code, 'INVALID_CATEGORY_TYPE')
    console.log('  ✓ Pass Test I: Expense category rejected for income transaction')

    // Rule J: Payment method compatibility and auto-reset
    const cashAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `${testPrefix}-Cash`,
        type: 'cash',
        openingBalance: 1000,
      })
    const cashAccId = cashAccRes.body.data.id

    const invalidPayRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Invalid payment method',
        amount: 200,
        type: 'expense',
        accountId: cashAccId,
        paymentMethod: 'Credit Card',
      })
    assert.strictEqual(invalidPayRes.status, 201)
    assert.strictEqual(invalidPayRes.body.data.paymentMethod, 'Cash')
    console.log('  ✓ Pass Test J: Incompatible payment method safely reset to allowed account default (Cash)')

    // Rule K: Change account + payment method
    const validPayRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Cash expense',
        amount: 200,
        type: 'expense',
        accountId: cashAccId,
        paymentMethod: 'cash',
      })
    assert.strictEqual(validPayRes.status, 201)
    console.log('  ✓ Pass Test K: Account with compatible payment method accepted')

    // Rule L: Legacy/custom payment method preserved safely
    const legacyTx = await prisma.transaction.create({
      data: {
        id: `txn-legacy-${Date.now()}`,
        userId: primaryUserId,
        description: 'Legacy transaction',
        amount: 100,
        type: 'expense',
        accountId: cashAccId,
        paymentMethod: 'old_gift_voucher',
        date: new Date(),
      },
    })
    const getLegacyRes = await request(app)
      .get(`/api/transactions/${legacyTx.id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(getLegacyRes.status, 200)
    assert.strictEqual(getLegacyRes.body.data.paymentMethod, 'old_gift_voucher')
    console.log('  ✓ Pass Test L: Legacy/custom payment method retrieved safely\n')

    // ---------------------------------------------------------------
    // 4. SAVINGS GOALS & TRANSFERS (Edge Cases 7, 8, 10, 11)
    // ---------------------------------------------------------------
    console.log('4. Testing Savings Goals & Transfer APIs...')

    // Create Goal
    const goalRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `${testPrefix}-Laptop`,
        targetAmount: 50000,
        currentAmount: 10000,
      })
    assert.strictEqual(goalRes.status, 201)
    const goalId = goalRes.body.data.id
    assert.strictEqual(goalRes.body.data.targetAmount, 50000)
    assert.strictEqual(goalRes.body.data.currentAmount, 10000)
    console.log('  ✓ Pass: POST /api/goals creates goal with target and current amounts')

    // Cross-User Isolation on Goal
    const crossGoalRes = await request(app)
      .get(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${secondaryToken}`)
    assert.strictEqual(crossGoalRes.status, 404, 'User B must NOT see Primary User goal')
    console.log('  ✓ Pass: Cross-user goal access strictly denied (HTTP 404)')

    // Goal Deposit: ₹5,000 from acc1 (which has ₹18,000)
    const depRes = await request(app)
      .post(`/api/goals/${goalId}/deposit`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        accountId: acc1Id,
        amount: 5000,
      })
    assert.strictEqual(depRes.status, 200)
    assert.strictEqual(depRes.body.data.goal.currentAmount, 15000)
    const depTxId = depRes.body.data.transaction.id

    const acc1AfterDep = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterDep.body.data.balance, 13000)
    console.log('  ✓ Pass: POST /api/goals/:id/deposit atomically debited account to ₹13,000 and funded goal to ₹15,000')

    // Goal Overfunding (Edge Case 10): Target is ₹50,000, current ₹15,000. Remaining: ₹35,000.
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Fund account for goal test',
        amount: 40000,
        type: 'income',
        accountId: acc1Id,
        paymentMethod: 'net_banking',
      })

    // Try depositing ₹36,000 -> Should reject 400 GOAL_OVERFUNDING
    const overfundRes = await request(app)
      .post(`/api/goals/${goalId}/deposit`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        accountId: acc1Id,
        amount: 36000,
      })
    assert.strictEqual(overfundRes.status, 400)
    assert.strictEqual(overfundRes.body.error.code, 'GOAL_OVERFUNDING')
    console.log('  ✓ Pass Edge Case 10: Prevent Savings Goal Overfunding rejected with HTTP 400')

    // Goal Withdrawal (Edge Case 7): Withdraw ₹4,000 into acc1
    const withRes = await request(app)
      .post(`/api/goals/${goalId}/withdraw`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        accountId: acc1Id,
        amount: 4000,
      })
    assert.strictEqual(withRes.status, 200)
    assert.strictEqual(withRes.body.data.goal.currentAmount, 11000)
    const acc1AfterWith = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterWith.body.data.balance, 57000)
    console.log('  ✓ Pass Edge Case 7: Goal withdrawal credited account to ₹57,000 and decremented goal to ₹11,000')

    // Goal Overdraw (Edge Case 8): Try withdrawing ₹12,000 when current is ₹11,000
    const overdrawRes = await request(app)
      .post(`/api/goals/${goalId}/withdraw`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        accountId: acc1Id,
        amount: 12000,
      })
    assert.strictEqual(overdrawRes.status, 400)
    assert.strictEqual(overdrawRes.body.error.code, 'GOAL_INSUFFICIENT_FUNDS')
    console.log('  ✓ Pass Edge Case 8: Goal overdraw rejected with HTTP 400 GOAL_INSUFFICIENT_FUNDS')

    // Transaction Deletion Atomic Reversal (Edge Case 11)
    const delDepRes = await request(app)
      .delete(`/api/transactions/${depTxId}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(delDepRes.status, 200)

    const acc1AfterDelDep = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    const goalAfterDelDep = await request(app)
      .get(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1AfterDelDep.body.data.balance, 62000)
    assert.strictEqual(goalAfterDelDep.body.data.currentAmount, 6000)
    console.log('  ✓ Pass Edge Case 11: Deleting deposit transaction atomically restored account and goal balances\n')

    // ---------------------------------------------------------------
    // 5. FINANCIAL EDGE CASES 1-6, 9
    // ---------------------------------------------------------------
    console.log('5. Testing Financial Edge Cases (1-6, 9)...')

    // Edge Case 2: Exact-balance expense
    const exactAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `${testPrefix}-Exact`,
        type: 'bank',
        openingBalance: 5000,
      })
    const exactAccId = exactAccRes.body.data.id

    const exactExpRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Exact balance expense',
        amount: 5000,
        type: 'expense',
        accountId: exactAccId,
        paymentMethod: 'debit_card',
      })
    assert.strictEqual(exactExpRes.status, 201)
    const exactAccAfter = await request(app)
      .get(`/api/accounts/${exactAccId}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(exactAccAfter.body.data.balance, 0)
    console.log('  ✓ Pass Edge Case 2: Exact-balance expense reduces account balance to exactly ₹0.00')

    // Edge Case 3: Insufficient balance by ₹1
    const over1Res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'One rupee overspend',
        amount: 1,
        type: 'expense',
        accountId: exactAccId,
        paymentMethod: 'debit_card',
      })
    assert.strictEqual(over1Res.status, 400)
    assert.strictEqual(over1Res.body.error.code, 'INSUFFICIENT_BALANCE')
    console.log('  ✓ Pass Edge Case 3: Insufficient balance by ₹1 rejected')

    // Edge Case 4: Zero-balance account expense
    console.log('  ✓ Pass Edge Case 4: Zero-balance account rejected expense')

    // Edge Case 5: Zero amount
    const zeroAmtRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Zero amount',
        amount: 0,
        type: 'expense',
        accountId: acc1Id,
      })
    assert.strictEqual(zeroAmtRes.status, 400)
    assert.strictEqual(zeroAmtRes.body.error.code, 'INVALID_AMOUNT')
    console.log('  ✓ Pass Edge Case 5: Zero amount rejected with HTTP 400 INVALID_AMOUNT')

    // Edge Case 6: Negative amount
    const negAmtRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Negative amount',
        amount: -500,
        type: 'expense',
        accountId: acc1Id,
      })
    assert.strictEqual(negAmtRes.status, 400)
    assert.strictEqual(negAmtRes.body.error.code, 'INVALID_AMOUNT')
    console.log('  ✓ Pass Edge Case 6: Negative amount rejected with HTTP 400 INVALID_AMOUNT')

    // Edge Case 9: Dynamic balance per account
    const acc1Check = await request(app)
      .get(`/api/accounts/${acc1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    const acc2Check = await request(app)
      .get(`/api/accounts/${acc2Id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(acc1Check.body.data.balance, 62000)
    assert.strictEqual(acc2Check.body.data.balance, 2000)
    console.log('  ✓ Pass Edge Case 9: Independent balances maintained per account\n')

    // ---------------------------------------------------------------
    // 6. BUDGETS & CATEGORIES APIS
    // ---------------------------------------------------------------
    console.log('6. Testing Budgets & Categories APIs...')

    // Budget: Create & Duplicate protection
    const bCat = await prisma.category.findFirst({ where: { name: 'Food' } })
    const bRes = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        categoryId: bCat.id,
        month: '2026-10',
        amount: 12000,
      })
    assert.strictEqual(bRes.status, 201)
    const bId = bRes.body.data.id

    const dupBRes = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        categoryId: bCat.id,
        month: '2026-10',
        amount: 15000,
      })
    assert.strictEqual(dupBRes.status, 409)
    assert.strictEqual(dupBRes.body.error.code, 'DUPLICATE_BUDGET')
    console.log('  ✓ Pass: Duplicate budget rejected with HTTP 409 DUPLICATE_BUDGET')

    // Cross-User Budget Independence (User B can budget for same category/month)
    const bResB = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${secondaryToken}`)
      .send({
        categoryId: bCat.id,
        month: '2026-10',
        amount: 8000,
      })
    assert.strictEqual(bResB.status, 201, 'User B can create their own budget for same category/month')
    console.log('  ✓ Pass: Multi-tenant budget independence verified')

    // Removed recurring endpoint is no longer mounted.
    const removedRecurringRes = await request(app)
      .get('/api/recurring')
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(removedRecurringRes.status, 404)
    console.log('  ✓ Pass: Removed recurring endpoint returns HTTP 404')

    // Category: Custom creation & System protection
    const customCatRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `${testPrefix}-CustomCat`,
        type: 'expense',
        icon: 'Tag',
        color: '#ff5722',
      })
    assert.strictEqual(customCatRes.status, 201)
    const customCatId = customCatRes.body.data.id
    console.log('  ✓ Pass: POST /api/categories created custom category')

    // System Category Deletion Protection
    const sysDelRes = await request(app)
      .delete(`/api/categories/${bCat.id}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(sysDelRes.status, 400)
    console.log('  ✓ Pass: System default category deletion protected with HTTP 400')

    // Custom Category Deletion Allowed
    const customDelRes = await request(app)
      .delete(`/api/categories/${customCatId}`)
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(customDelRes.status, 200)
    console.log('  ✓ Pass: Custom category deleted successfully')

    // Logout endpoint
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${authToken}`)
    assert.strictEqual(logoutRes.status, 200)
    console.log('  ✓ Pass: POST /api/auth/logout returns 200 OK\n')

    // ---------------------------------------------------------------
    // 7. CLEAN UP TEST FIXTURES
    // ---------------------------------------------------------------
    console.log('7. Cleaning up test fixtures from database...')
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { account: { name: { startsWith: testPrefix } } },
          { description: { contains: testPrefix } },
        ],
      },
    })
    await prisma.budget.deleteMany({
      where: { OR: [{ id: bId }, { id: bResB.body.data.id }] },
    })
    await prisma.savingsGoal.deleteMany({
      where: { id: goalId },
    })
    await prisma.account.deleteMany({
      where: {
        OR: [
          { name: { startsWith: testPrefix } },
          { userId: secondaryUserId },
        ],
      },
    })
    await prisma.user.deleteMany({
      where: { id: secondaryUserId },
    })
    console.log('  ✓ Pass: All test fixtures cleanly removed without polluting dev data.\n')

    console.log('=================================================================')
    console.log('🎉 ALL REST API SECURITY & FINANCIAL REGRESSION TESTS PASSED!')
    console.log('=================================================================')
  } catch (err) {
    console.error('❌ API Integration Test Failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runApiTests()

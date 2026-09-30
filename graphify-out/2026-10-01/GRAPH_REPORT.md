# Graph Report - ExpenseTracker  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 755 nodes · 1898 edges · 28 communities (25 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7985d7be`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TransactionContext.jsx
- domainErrors.js
- api/index.js
- storage.js
- routes/index.js
- frontend/package.json
- test_transaction_rules.js
- Dashboard.jsx
- migrator.js
- FinTrack
- server/package.json
- authService.js
- app.js
- dependencies
- notificationService.js
- seed.js
- test_production_security.js
- goalController.js
- prisma.js
- accountController.js
- scripts/package.json
- authController.js
- budgetController.js
- categoryController.js
- recurringController.js
- transactionController.js
- frontend_src_services_storage_migratestorage

## God Nodes (most connected - your core abstractions)
1. `react` - 36 edges
2. `safeWrite()` - 35 edges
3. `useTransactions()` - 29 edges
4. `formatCurrency()` - 26 edges
5. `DomainError` - 25 edges
6. `InvalidAmountError` - 21 edges
7. `lucide-react` - 21 edges
8. `findCategory()` - 19 edges
9. `calculateAccountBalance()` - 18 edges
10. `react-router-dom` - 18 edges

## Surprising Connections (you probably didn't know these)
- `runMigration()` --calls--> `normalizeAccountName()`  [EXTRACTED]
  scripts/migration/migrator.js → server/src/utils/accountUtils.js
- `CustomTooltip()` --calls--> `formatCurrency()`  [EXTRACTED]
  frontend/src/components/dashboard/CategoryChart.jsx → frontend/src/utils/formatters.js
- `runTests()` --calls--> `cleanupDuplicateAccountNames()`  [EXTRACTED]
  test_duplicates_and_notifications.js → server/src/utils/accountUtils.js
- `runTests()` --calls--> `normalizeAccountName()`  [EXTRACTED]
  test_duplicates_and_notifications.js → server/src/utils/accountUtils.js
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  server/src/app.js → server/src/middleware/errorHandler.js

## Import Cycles
- None detected.

## Communities (28 total, 3 thin omitted)

### Community 0 - "TransactionContext.jsx"
Cohesion: 0.06
Nodes (67): App(), ProtectedRoute(), AnimatedGradientBorder(), Badge(), VARIANTS, Button(), HOVER, VARIANTS (+59 more)

### Community 1 - "domainErrors.js"
Cohesion: 0.07
Nodes (54): AccountNameExistsError, AccountNotFoundError, BudgetNotFoundError, CategoryNotFoundError, DomainError, DuplicateBudgetError, ForbiddenError, GoalInsufficientFundsError (+46 more)

### Community 2 - "api/index.js"
Cohesion: 0.06
Nodes (62): AuthProvider(), initAuth(), accountApi, createAccount(), getAccount(), getAccounts(), normalizeAccount(), updateAccount() (+54 more)

### Community 3 - "storage.js"
Cohesion: 0.07
Nodes (72): errorStyle, INITIAL_STATE, inputStyle, labelStyle, TransactionForm(), reducer(), TransactionProvider(), getPaymentMethodsForAccount() (+64 more)

### Community 4 - "routes/index.js"
Cohesion: 0.06
Nodes (43): express, zod, getHealth(), ValidationError, authRateLimiter, validate(), router, router (+35 more)

### Community 5 - "frontend/package.json"
Cohesion: 0.05
Nodes (41): dependencies, lucide-react, motion, react, react-dom, react-router-dom, recharts, tailwindcss (+33 more)

### Community 6 - "test_transaction_rules.js"
Cohesion: 0.06
Nodes (35): CategoryChart(), CustomTooltip(), CURRENCIES, EXPENSE_CATEGORIES, getCategoriesForType(), getCategoryById(), INCOME_CATEGORIES, PAYMENT_METHODS (+27 more)

### Community 7 - "Dashboard.jsx"
Cohesion: 0.17
Nodes (29): CustomTooltip(), MonthlyChart(), SummaryCard(), Analytics(), CustomTooltip(), Budgets(), Dashboard(), addBudget() (+21 more)

### Community 8 - "migrator.js"
Cohesion: 0.12
Nodes (27): ref_fs, ref_path, detectDatabaseConflicts(), DEFAULT_CATEGORY_IDS, ENTITY_TYPES, SCHEMA_VERSION, SOURCE_IDENTIFIER, VALID_ACCOUNT_TYPES (+19 more)

### Community 9 - "FinTrack"
Cohesion: 0.07
Nodes (28): 1. Categories, 2. Expense Balance Check, 3. Edit Reversal Workflow, 4. Payment Method Decoupling, 5. Descriptions, Architecture & Accounting Principles, Automated Testing, Available Scripts (+20 more)

### Community 10 - "server/package.json"
Cohesion: 0.11
Nodes (18): dotenv, express-rate-limit, prisma, supertest, description, devDependencies, prisma, supertest (+10 more)

### Community 11 - "authService.js"
Cohesion: 0.22
Nodes (10): bcryptjs, ref_crypto, jsonwebtoken, EmailAlreadyExistsError, UnauthorizedError, authenticate(), generateToken(), getUserProfile() (+2 more)

### Community 12 - "app.js"
Cohesion: 0.21
Nodes (8): cookie-parser, cors, helmet, app, createApp(), notFoundHandler(), server, server

### Community 13 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit, helmet (+3 more)

### Community 14 - "notificationService.js"
Cohesion: 0.20
Nodes (4): dismissAll(), dismissNotification(), getNotificationStates(), markAsRead()

### Community 15 - "seed.js"
Cohesion: 0.22
Nodes (7): @prisma/client, DEFAULT_ACCOUNTS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_SYSTEM_CATEGORIES, prisma

### Community 16 - "test_production_security.js"
Cohesion: 0.53
Nodes (5): config, validateEnvironmentConfig(), errorHandler(), createTestRateLimiter(), runProductionSecurityTests()

### Community 17 - "goalController.js"
Cohesion: 0.25
Nodes (7): createGoal(), deleteGoal(), depositToGoal(), getGoalById(), getGoals(), updateGoal(), withdrawFromGoal()

### Community 19 - "accountController.js"
Cohesion: 0.29
Nodes (5): createAccount(), deleteAccount(), getAccountById(), getAllAccounts(), updateAccount()

### Community 20 - "scripts/package.json"
Cohesion: 0.33
Nodes (5): description, name, private, type, version

### Community 21 - "authController.js"
Cohesion: 0.47
Nodes (3): getCookieOptions(), login(), register()

### Community 22 - "budgetController.js"
Cohesion: 0.33
Nodes (5): createBudget(), deleteBudget(), getBudgetById(), getBudgets(), updateBudget()

### Community 23 - "categoryController.js"
Cohesion: 0.33
Nodes (5): createCategory(), deleteCategory(), getCategories(), getCategoryById(), updateCategory()

### Community 24 - "recurringController.js"
Cohesion: 0.33
Nodes (5): createRecurring(), deleteRecurring(), getRecurring(), getRecurringById(), updateRecurring()

### Community 25 - "transactionController.js"
Cohesion: 0.33
Nodes (5): createTransaction(), deleteTransaction(), getTransactionById(), getTransactions(), updateTransaction()

## Knowledge Gaps
- **167 isolated node(s):** `VARIANTS`, `CONFIG`, `PAGE_TITLES`, `MOBILE_NAV_ITEMS`, `NAV_ITEMS` (+162 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 238 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `routes/index.js` to `test_production_security.js`, `server/package.json`, `app.js`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `react` connect `TransactionContext.jsx` to `storage.js`, `frontend/package.json`, `test_transaction_rules.js`, `Dashboard.jsx`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `calculateAccountBalance()` connect `storage.js` to `TransactionContext.jsx`, `test_transaction_rules.js`, `Dashboard.jsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `VARIANTS`, `CONFIG`, `PAGE_TITLES` to the rest of the system?**
  _167 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TransactionContext.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.060182488837119005 - nodes in this community are weakly interconnected._
- **Should `domainErrors.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06541822721598002 - nodes in this community are weakly interconnected._
- **Should `api/index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05574229691876751 - nodes in this community are weakly interconnected._
# Graph Report - ExpenseTracker  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 757 nodes · 1893 edges · 27 communities (25 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6bb55386`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TransactionContext.jsx
- domainErrors.js
- api/index.js
- storage.js
- routes/index.js
- Dashboard.jsx
- frontend/package.json
- test_transaction_rules.js
- migrator.js
- FinTrack
- server/package.json
- authService.js
- app.js
- budgetController.js
- dependencies
- notificationService.js
- prisma.js
- seed.js
- test_production_security.js
- goalController.js
- accountController.js
- scripts/package.json
- authController.js
- categoryController.js
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
- `runTests()` --calls--> `cleanupDuplicateAccountNames()`  [EXTRACTED]
  test_duplicates_and_notifications.js → server/src/utils/accountUtils.js
- `runTests()` --calls--> `normalizeAccountName()`  [EXTRACTED]
  test_duplicates_and_notifications.js → server/src/utils/accountUtils.js
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  server/src/app.js → server/src/middleware/errorHandler.js
- `createGoal()` --calls--> `InvalidAmountError`  [EXTRACTED]
  server/src/services/goalService.js → server/src/errors/domainErrors.js

## Import Cycles
- None detected.

## Communities (27 total, 2 thin omitted)

### Community 0 - "TransactionContext.jsx"
Cohesion: 0.05
Nodes (70): App(), ProtectedRoute(), AnimatedGradientBorder(), Badge(), VARIANTS, Button(), HOVER, VARIANTS (+62 more)

### Community 1 - "domainErrors.js"
Cohesion: 0.06
Nodes (57): AccountNameExistsError, AccountNotFoundError, BudgetNotFoundError, CategoryNotFoundError, DomainError, DuplicateBudgetError, ForbiddenError, GoalInsufficientFundsError (+49 more)

### Community 2 - "api/index.js"
Cohesion: 0.06
Nodes (62): AuthProvider(), initAuth(), accountApi, createAccount(), getAccount(), getAccounts(), normalizeAccount(), updateAccount() (+54 more)

### Community 3 - "storage.js"
Cohesion: 0.08
Nodes (60): Accounts(), Goals(), Settings(), addAccount(), deleteAccount(), getAccounts(), getTotalNetWorth(), saveAccounts() (+52 more)

### Community 4 - "routes/index.js"
Cohesion: 0.06
Nodes (43): express, zod, getHealth(), ValidationError, authRateLimiter, validate(), router, router (+35 more)

### Community 5 - "Dashboard.jsx"
Cohesion: 0.11
Nodes (41): CategoryChart(), CustomTooltip(), CustomTooltip(), MonthlyChart(), RecentTransactions(), SummaryCard(), getCategoryById(), Analytics() (+33 more)

### Community 6 - "frontend/package.json"
Cohesion: 0.05
Nodes (41): dependencies, lucide-react, motion, react, react-dom, react-router-dom, recharts, tailwindcss (+33 more)

### Community 7 - "test_transaction_rules.js"
Cohesion: 0.07
Nodes (32): CURRENCIES, EXPENSE_CATEGORIES, getCategoriesForType(), INCOME_CATEGORIES, PAYMENT_METHODS, accChangeTxns, accChangeTxnsEdited, accounts (+24 more)

### Community 8 - "migrator.js"
Cohesion: 0.12
Nodes (27): ref_fs, ref_path, detectDatabaseConflicts(), DEFAULT_CATEGORY_IDS, ENTITY_TYPES, SCHEMA_VERSION, SOURCE_IDENTIFIER, VALID_ACCOUNT_TYPES (+19 more)

### Community 9 - "FinTrack"
Cohesion: 0.07
Nodes (28): 1. Categories, 2. Expense Balance Check, 3. Edit Reversal Workflow, 4. Payment Method Decoupling, 5. Descriptions, Architecture & Accounting Principles, Automated Testing, Available Scripts (+20 more)

### Community 10 - "server/package.json"
Cohesion: 0.11
Nodes (17): dotenv, express-rate-limit, prisma, description, devDependencies, prisma, supertest, name (+9 more)

### Community 11 - "authService.js"
Cohesion: 0.24
Nodes (9): ref_crypto, jsonwebtoken, EmailAlreadyExistsError, UnauthorizedError, authenticate(), generateToken(), getUserProfile(), loginUser() (+1 more)

### Community 12 - "app.js"
Cohesion: 0.21
Nodes (8): cookie-parser, cors, helmet, app, createApp(), notFoundHandler(), server, server

### Community 13 - "budgetController.js"
Cohesion: 0.15
Nodes (10): createBudget(), deleteBudget(), getBudgetById(), getBudgets(), updateBudget(), createRecurring(), deleteRecurring(), getRecurring() (+2 more)

### Community 14 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit, helmet (+3 more)

### Community 15 - "notificationService.js"
Cohesion: 0.20
Nodes (4): dismissAll(), dismissNotification(), getNotificationStates(), markAsRead()

### Community 16 - "prisma.js"
Cohesion: 0.28
Nodes (4): bcryptjs, ref_node_assert, supertest, prisma

### Community 17 - "seed.js"
Cohesion: 0.22
Nodes (7): @prisma/client, DEFAULT_ACCOUNTS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_SYSTEM_CATEGORIES, prisma

### Community 18 - "test_production_security.js"
Cohesion: 0.53
Nodes (5): config, validateEnvironmentConfig(), errorHandler(), createTestRateLimiter(), runProductionSecurityTests()

### Community 19 - "goalController.js"
Cohesion: 0.25
Nodes (7): createGoal(), deleteGoal(), depositToGoal(), getGoalById(), getGoals(), updateGoal(), withdrawFromGoal()

### Community 20 - "accountController.js"
Cohesion: 0.29
Nodes (5): createAccount(), deleteAccount(), getAccountById(), getAllAccounts(), updateAccount()

### Community 21 - "scripts/package.json"
Cohesion: 0.33
Nodes (5): description, name, private, type, version

### Community 22 - "authController.js"
Cohesion: 0.47
Nodes (3): getCookieOptions(), login(), register()

### Community 23 - "categoryController.js"
Cohesion: 0.33
Nodes (5): createCategory(), deleteCategory(), getCategories(), getCategoryById(), updateCategory()

### Community 24 - "transactionController.js"
Cohesion: 0.33
Nodes (5): createTransaction(), deleteTransaction(), getTransactionById(), getTransactions(), updateTransaction()

## Knowledge Gaps
- **168 isolated node(s):** `VARIANTS`, `HOVER`, `VARIANTS`, `CONFIG`, `PAGE_TITLES` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 238 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `routes/index.js` to `server/package.json`, `test_production_security.js`, `app.js`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `react` connect `TransactionContext.jsx` to `Dashboard.jsx`, `frontend/package.json`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `calculateAccountBalance()` connect `TransactionContext.jsx` to `storage.js`, `Dashboard.jsx`, `test_transaction_rules.js`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `VARIANTS`, `HOVER`, `VARIANTS` to the rest of the system?**
  _168 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TransactionContext.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.053775965831877305 - nodes in this community are weakly interconnected._
- **Should `domainErrors.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06426182513139035 - nodes in this community are weakly interconnected._
- **Should `api/index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05574229691876751 - nodes in this community are weakly interconnected._
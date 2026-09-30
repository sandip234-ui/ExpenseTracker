# Graph Report - ExpenseTracker  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 731 nodes · 1828 edges · 31 communities (29 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2e899a73`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TransactionContext.jsx
- domainErrors.js
- api/index.js
- storage.js
- frontend/package.json
- test_transaction_rules.js
- Dashboard.jsx
- migrator.js
- FinTrack
- app.js
- accountController.js
- server/package.json
- routes/index.js
- authService.js
- dependencies
- test_api.js
- validate.js
- seed.js
- recurringRoutes.js
- goalController.js
- goalRoutes.js
- budgetRoutes.js
- categoryRoutes.js
- transactionRoutes.js
- scripts/package.json
- authController.js
- budgetController.js
- recurringController.js
- scripts
- frontend_src_services_storage_migratestorage

## God Nodes (most connected - your core abstractions)
1. `react` - 36 edges
2. `safeWrite()` - 35 edges
3. `useTransactions()` - 29 edges
4. `formatCurrency()` - 26 edges
5. `DomainError` - 24 edges
6. `InvalidAmountError` - 21 edges
7. `lucide-react` - 21 edges
8. `findCategory()` - 19 edges
9. `calculateAccountBalance()` - 18 edges
10. `react-router-dom` - 18 edges

## Surprising Connections (you probably didn't know these)
- `CustomTooltip()` --calls--> `formatCurrency()`  [EXTRACTED]
  frontend/src/components/dashboard/CategoryChart.jsx → frontend/src/utils/formatters.js
- `registerUser()` --calls--> `EmailAlreadyExistsError`  [EXTRACTED]
  server/src/services/authService.js → server/src/errors/domainErrors.js
- `createGoal()` --calls--> `InvalidAmountError`  [EXTRACTED]
  server/src/services/goalService.js → server/src/errors/domainErrors.js
- `deleteTransaction()` --calls--> `TransactionNotFoundError`  [EXTRACTED]
  server/src/services/transactionService.js → server/src/errors/domainErrors.js
- `getUserProfile()` --calls--> `UnauthorizedError`  [EXTRACTED]
  server/src/services/authService.js → server/src/errors/domainErrors.js

## Import Cycles
- None detected.

## Communities (31 total, 2 thin omitted)

### Community 0 - "TransactionContext.jsx"
Cohesion: 0.05
Nodes (78): App(), ProtectedRoute(), AnimatedGradientBorder(), Badge(), VARIANTS, Button(), HOVER, VARIANTS (+70 more)

### Community 1 - "domainErrors.js"
Cohesion: 0.07
Nodes (50): AccountNotFoundError, BudgetNotFoundError, CategoryNotFoundError, DomainError, DuplicateBudgetError, EmailAlreadyExistsError, ForbiddenError, GoalInsufficientFundsError (+42 more)

### Community 2 - "api/index.js"
Cohesion: 0.06
Nodes (61): AuthProvider(), initAuth(), accountApi, createAccount(), getAccount(), getAccounts(), normalizeAccount(), updateAccount() (+53 more)

### Community 3 - "storage.js"
Cohesion: 0.09
Nodes (59): Accounts(), Budgets(), Goals(), Settings(), addAccount(), deleteAccount(), getAccounts(), saveAccounts() (+51 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.05
Nodes (41): dependencies, lucide-react, motion, react, react-dom, react-router-dom, recharts, tailwindcss (+33 more)

### Community 5 - "test_transaction_rules.js"
Cohesion: 0.06
Nodes (35): CategoryChart(), CustomTooltip(), CURRENCIES, EXPENSE_CATEGORIES, getCategoriesForType(), getCategoryById(), INCOME_CATEGORIES, PAYMENT_METHODS (+27 more)

### Community 6 - "Dashboard.jsx"
Cohesion: 0.13
Nodes (31): CustomTooltip(), MonthlyChart(), SummaryCard(), Analytics(), CustomTooltip(), Dashboard(), calculateAccountBalance(), getTotalNetWorth() (+23 more)

### Community 7 - "migrator.js"
Cohesion: 0.12
Nodes (27): ref_fs, ref_path, detectDatabaseConflicts(), DEFAULT_CATEGORY_IDS, ENTITY_TYPES, SCHEMA_VERSION, SOURCE_IDENTIFIER, VALID_ACCOUNT_TYPES (+19 more)

### Community 8 - "FinTrack"
Cohesion: 0.07
Nodes (28): 1. Categories, 2. Expense Balance Check, 3. Edit Reversal Workflow, 4. Payment Method Decoupling, 5. Descriptions, Architecture & Accounting Principles, Automated Testing, Available Scripts (+20 more)

### Community 9 - "app.js"
Cohesion: 0.22
Nodes (12): cookie-parser, cors, helmet, createApp(), config, validateEnvironmentConfig(), errorHandler(), notFoundHandler() (+4 more)

### Community 10 - "accountController.js"
Cohesion: 0.09
Nodes (15): createAccount(), deleteAccount(), getAccountById(), getAllAccounts(), updateAccount(), createCategory(), deleteCategory(), getCategories() (+7 more)

### Community 11 - "server/package.json"
Cohesion: 0.14
Nodes (13): dotenv, express-rate-limit, prisma, description, devDependencies, prisma, supertest, name (+5 more)

### Community 12 - "routes/index.js"
Cohesion: 0.23
Nodes (8): express, getHealth(), router, router, apiRouter, getHealthStatus(), loginSchema, registerSchema

### Community 13 - "authService.js"
Cohesion: 0.29
Nodes (8): ref_crypto, jsonwebtoken, UnauthorizedError, authenticate(), generateToken(), getUserProfile(), loginUser(), registerUser()

### Community 14 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit, helmet (+3 more)

### Community 15 - "test_api.js"
Cohesion: 0.22
Nodes (5): bcryptjs, ref_node_assert, supertest, app, server

### Community 16 - "validate.js"
Cohesion: 0.31
Nodes (6): ValidationError, validate(), router, accountIdParamSchema, createAccountSchema, updateAccountSchema

### Community 17 - "seed.js"
Cohesion: 0.22
Nodes (7): @prisma/client, DEFAULT_ACCOUNTS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_SYSTEM_CATEGORIES, prisma

### Community 18 - "recurringRoutes.js"
Cohesion: 0.39
Nodes (6): zod, router, createRecurringSchema, getRecurringSchema, recurringIdParamSchema, updateRecurringSchema

### Community 19 - "goalController.js"
Cohesion: 0.25
Nodes (7): createGoal(), deleteGoal(), depositToGoal(), getGoalById(), getGoals(), updateGoal(), withdrawFromGoal()

### Community 20 - "goalRoutes.js"
Cohesion: 0.43
Nodes (6): router, createGoalSchema, goalDepositSchema, goalIdParamSchema, goalWithdrawSchema, updateGoalSchema

### Community 21 - "budgetRoutes.js"
Cohesion: 0.48
Nodes (5): router, budgetIdParamSchema, createBudgetSchema, getBudgetsSchema, updateBudgetSchema

### Community 22 - "categoryRoutes.js"
Cohesion: 0.48
Nodes (5): router, categoryIdParamSchema, createCategorySchema, getCategoriesSchema, updateCategorySchema

### Community 23 - "transactionRoutes.js"
Cohesion: 0.48
Nodes (5): router, createTransactionSchema, getTransactionsSchema, transactionIdParamSchema, updateTransactionSchema

### Community 24 - "scripts/package.json"
Cohesion: 0.33
Nodes (5): description, name, private, type, version

### Community 25 - "authController.js"
Cohesion: 0.47
Nodes (3): getCookieOptions(), login(), register()

### Community 26 - "budgetController.js"
Cohesion: 0.33
Nodes (5): createBudget(), deleteBudget(), getBudgetById(), getBudgets(), updateBudget()

### Community 27 - "recurringController.js"
Cohesion: 0.33
Nodes (5): createRecurring(), deleteRecurring(), getRecurring(), getRecurringById(), updateRecurring()

### Community 28 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, dev, start, test

## Knowledge Gaps
- **166 isolated node(s):** `VARIANTS`, `HOVER`, `VARIANTS`, `CONFIG`, `errorStyle` (+161 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 231 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `routes/index.js` to `app.js`, `server/package.json`, `validate.js`, `recurringRoutes.js`, `goalRoutes.js`, `budgetRoutes.js`, `categoryRoutes.js`, `transactionRoutes.js`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `react` connect `TransactionContext.jsx` to `frontend/package.json`, `test_transaction_rules.js`, `Dashboard.jsx`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `calculateAccountBalance()` connect `Dashboard.jsx` to `TransactionContext.jsx`, `storage.js`, `test_transaction_rules.js`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `VARIANTS`, `HOVER`, `VARIANTS` to the rest of the system?**
  _166 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TransactionContext.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.054835651074589126 - nodes in this community are weakly interconnected._
- **Should `domainErrors.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06694677871148459 - nodes in this community are weakly interconnected._
- **Should `api/index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05700852189244784 - nodes in this community are weakly interconnected._
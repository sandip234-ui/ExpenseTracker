# Graph Report - ExpenseTracker  (2026-10-02)

## Corpus Check
- 132 files · ~72,822 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .example 2, .css 1)

## Summary
- 727 nodes · 1833 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bcfce213`
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
- ref_node_crypto
- dependencies
- server.js
- seed.js
- app.js
- goalController.js
- scripts/package.json
- authController.js
- FinTrack Production Deployment Guide
- transactionController.js
- frontend_src_services_storage_migratestorage
- budgetController.js
- frontend_src_services_api_index_authapi
- frontend_src_services_api_index_clearauthtoken
- frontend_src_services_api_index_getauthtoken
- categoryController.js
- scripts

## God Nodes (most connected - your core abstractions)
1. `react` - 35 edges
2. `safeWrite()` - 30 edges
3. `useTransactions()` - 27 edges
4. `formatCurrency()` - 24 edges
5. `DomainError` - 24 edges
6. `lucide-react` - 20 edges
7. `react-router-dom` - 18 edges
8. `calculateAccountBalance()` - 18 edges
9. `InvalidAmountError` - 18 edges
10. `findCategory()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `runMigration()` --calls--> `normalizeAccountName()`  [EXTRACTED]
  scripts/migration/migrator.js → server/src/utils/accountUtils.js
- `CustomTooltip()` --calls--> `formatCurrency()`  [EXTRACTED]
  frontend/src/components/dashboard/CategoryChart.jsx → frontend/src/utils/formatters.js
- `runTests()` --calls--> `normalizeAccountName()`  [EXTRACTED]
  test_duplicates_and_notifications.js → server/src/utils/accountUtils.js
- `runTests()` --calls--> `cleanupDuplicateAccountNames()`  [EXTRACTED]
  test_duplicates_and_notifications.js → server/src/utils/accountUtils.js
- `CustomTooltip()` --calls--> `formatShortCurrency()`  [EXTRACTED]
  frontend/src/components/dashboard/MonthlyChart.jsx → frontend/src/utils/formatters.js

## Import Cycles
- None detected.

## Communities (30 total, 6 thin omitted)

### Community 0 - "TransactionContext.jsx"
Cohesion: 0.06
Nodes (73): App(), ProtectedRoute(), AnimatedGradientBorder(), Badge(), VARIANTS, Button(), HOVER, VARIANTS (+65 more)

### Community 1 - "domainErrors.js"
Cohesion: 0.06
Nodes (54): ref_node_assert, AccountNameExistsError, AccountNotFoundError, BudgetNotFoundError, CategoryNotFoundError, DomainError, DuplicateBudgetError, ForbiddenError (+46 more)

### Community 2 - "api/index.js"
Cohesion: 0.06
Nodes (56): AuthProvider(), initAuth(), accountApi, createAccount(), getAccount(), getAccounts(), normalizeAccount(), updateAccount() (+48 more)

### Community 3 - "storage.js"
Cohesion: 0.11
Nodes (50): Accounts(), Budgets(), Goals(), Settings(), addAccount(), deleteAccount(), getAccounts(), saveAccounts() (+42 more)

### Community 4 - "routes/index.js"
Cohesion: 0.05
Nodes (47): express, zod, createAccount(), deleteAccount(), getAccountById(), getAllAccounts(), updateAccount(), getHealth() (+39 more)

### Community 5 - "Dashboard.jsx"
Cohesion: 0.13
Nodes (31): CustomTooltip(), MonthlyChart(), SummaryCard(), Analytics(), CustomTooltip(), Dashboard(), calculateAccountBalance(), getTotalNetWorth() (+23 more)

### Community 6 - "frontend/package.json"
Cohesion: 0.05
Nodes (42): dependencies, lucide-react, motion, react, react-dom, react-router-dom, recharts, tailwindcss (+34 more)

### Community 7 - "test_transaction_rules.js"
Cohesion: 0.06
Nodes (35): CategoryChart(), CustomTooltip(), CURRENCIES, EXPENSE_CATEGORIES, getCategoriesForType(), getCategoryById(), INCOME_CATEGORIES, PAYMENT_METHODS (+27 more)

### Community 8 - "migrator.js"
Cohesion: 0.12
Nodes (26): ref_fs, ref_path, detectDatabaseConflicts(), DEFAULT_CATEGORY_IDS, ENTITY_TYPES, SCHEMA_VERSION, SOURCE_IDENTIFIER, VALID_ACCOUNT_TYPES (+18 more)

### Community 9 - "FinTrack"
Cohesion: 0.07
Nodes (28): 1. Categories, 2. Expense Balance Check, 3. Edit Reversal Workflow, 4. Payment Method Decoupling, 5. Descriptions, Architecture & Accounting Principles, Automated Testing, Available Scripts (+20 more)

### Community 10 - "server/package.json"
Cohesion: 0.13
Nodes (14): cookie-parser, cors, helmet, prisma, description, devDependencies, prisma, supertest (+6 more)

### Community 11 - "authService.js"
Cohesion: 0.24
Nodes (9): ref_crypto, jsonwebtoken, EmailAlreadyExistsError, UnauthorizedError, authenticate(), generateToken(), getUserProfile(), loginUser() (+1 more)

### Community 14 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit, helmet (+3 more)

### Community 16 - "server.js"
Cohesion: 0.20
Nodes (5): bcryptjs, supertest, app, server, server

### Community 17 - "seed.js"
Cohesion: 0.22
Nodes (7): @prisma/client, DEFAULT_ACCOUNTS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_SYSTEM_CATEGORIES, prisma

### Community 18 - "app.js"
Cohesion: 0.34
Nodes (9): dotenv, express-rate-limit, createApp(), config, validateEnvironmentConfig(), errorHandler(), notFoundHandler(), createTestRateLimiter() (+1 more)

### Community 19 - "goalController.js"
Cohesion: 0.25
Nodes (7): createGoal(), deleteGoal(), depositToGoal(), getGoalById(), getGoals(), updateGoal(), withdrawFromGoal()

### Community 21 - "scripts/package.json"
Cohesion: 0.33
Nodes (5): description, name, private, type, version

### Community 22 - "authController.js"
Cohesion: 0.47
Nodes (3): getCookieOptions(), login(), register()

### Community 23 - "FinTrack Production Deployment Guide"
Cohesion: 0.15
Nodes (12): 1. Hosting Architecture Overview, 2. Environment Variables, 3. Deployment Pipeline & Execution Steps, 4. Health Check & Observability, 5. Security Controls Implemented, 6. Rollback Considerations, Backend (`server/`), FinTrack Production Deployment Guide (+4 more)

### Community 24 - "transactionController.js"
Cohesion: 0.33
Nodes (5): createTransaction(), deleteTransaction(), getTransactionById(), getTransactions(), updateTransaction()

### Community 27 - "budgetController.js"
Cohesion: 0.33
Nodes (5): createBudget(), deleteBudget(), getBudgetById(), getBudgets(), updateBudget()

### Community 31 - "categoryController.js"
Cohesion: 0.33
Nodes (5): createCategory(), deleteCategory(), getCategories(), getCategoryById(), updateCategory()

### Community 32 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, dev, start, test

## Knowledge Gaps
- **165 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 232 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `routes/index.js` to `server/package.json`, `app.js`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `react` connect `TransactionContext.jsx` to `Dashboard.jsx`, `frontend/package.json`, `test_transaction_rules.js`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `calculateAccountBalance()` connect `Dashboard.jsx` to `TransactionContext.jsx`, `storage.js`, `test_transaction_rules.js`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TransactionContext.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05871980250396756 - nodes in this community are weakly interconnected._
- **Should `domainErrors.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `api/index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06322624743677376 - nodes in this community are weakly interconnected._
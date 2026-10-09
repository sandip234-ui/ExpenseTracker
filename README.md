# FinTrack — Personal Finance Tracker & Expense Management System

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![React Router](https://img.shields.io/badge/React_Router-7.18-CA4245?logo=react-router&logoColor=white)](https://reactrouter.com/)
[![Recharts](https://img.shields.io/badge/Recharts-3.10-22B5BF)](https://recharts.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A modern, full-stack personal finance application built with **React 19**, **Vite**, **Tailwind CSS v4**, **Node.js/Express**, and **PostgreSQL (Prisma ORM)**, enforcing deterministic ledger accounting and strict user data privacy.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Objectives & Problem Statement](#project-objectives--problem-statement)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [System Architecture](#system-architecture)
6. [Project Directory Structure](#project-directory-structure)
7. [Application Workflows](#application-workflows)
   - [Authentication & Session Flow](#authentication--session-flow)
   - [Transaction Mutation & Balance Validation](#transaction-mutation--balance-validation)
   - [Savings Goal Allocation Flow](#savings-goal-allocation-flow)
8. [Database Schema & Financial Ledger Design](#database-schema--financial-ledger-design)
   - [Core Financial Invariants](#core-financial-invariants)
   - [Entity Relationship Overview](#entity-relationship-overview)
   - [Database Models & Constraints](#database-models--constraints)
   - [Database Migrations History](#database-migrations-history)
9. [Prerequisites & Installation](#prerequisites--installation)
10. [Local Development Setup](#local-development-setup)
11. [Environment Variable Configuration](#environment-variable-configuration)
12. [Database Setup & Migrations](#database-setup--migrations)
13. [Running the Application](#running-the-application)
14. [Available Scripts & Commands](#available-scripts--commands)
15. [REST API Documentation](#rest-api-documentation)
16. [Controlled Data Migration Utility](#controlled-data-migration-utility)
17. [Authentication & Security Architecture](#authentication--security-architecture)
18. [Automated Testing & Verification](#automated-testing--verification)
19. [Production Deployment Architecture](#production-deployment-architecture)
20. [Current Limitations](#current-limitations)
21. [Future Enhancements](#future-enhancements)
22. [Contributing](#contributing)

---

## Overview

**FinTrack** is a decoupled full-stack personal finance management system designed for accuracy, speed, and privacy. The application combines a responsive React single-page application (SPA) with a hardened Node.js/Express REST API backed by PostgreSQL through Prisma ORM.

Unlike traditional budget apps that maintain mutable balance counters susceptible to arithmetic drift and race conditions, FinTrack implements **deterministic ledger accounting**: account balances are never stored as mutable scalar values. Every balance is mathematically derived on-the-fly from opening balances and immutable ledger transactions.

FinTrack provides dual data source flexibility via a transparent **Data Provider Architecture**:
- **API Mode (`api`)**: Primary authoritative mode backed by PostgreSQL with multi-user authentication, ACID transactions, and row-level locking.
- **Local Mode (`local`)**: Client-side storage fallback powered by browser `localStorage` for offline development and testing.

---

## Project Objectives & Problem Statement

Personal finance tools frequently suffer from several critical shortcomings:
1. **Mutable Balance Inaccuracies**: Incrementing or decrementing balance counters on record mutations often causes desynchronization when transactions are edited, deleted, or reassigned across accounts.
2. **Missing Transaction Reversal Math**: Editing an existing expense should temporarily credit back the previous amount before validating whether the updated amount is affordable.
3. **Data Loss During Architecture Transitions**: Transitioning from client-side storage to a relational database often results in corrupted ledger balances, duplicate IDs, or dropped categories.
4. **Weak Multi-Tenant Isolation**: Insecure session handling or weak authorization rules risk leaking financial data between users.

FinTrack addresses these challenges through:
- **Immutable Ledger Derivation**: Strict mathematical consistency where balances are calculated directly from transaction records.
- **Atomic Reversal Semantics**: Pre-flight balance headroom calculations during transaction updates.
- **Audited Migration Tooling**: Transactional migration utility (`scripts/migration/migrate.js`) with zero-downtime dry-run audits, schema validation, and double-entry reconciliation.
- **Defense-in-Depth Security**: HttpOnly encrypted session cookies, JWT authentication, rate limiting, Helmet security headers, and strict multi-tenant scoping.

---

## Key Features

### 1. Financial Dashboard & Analytics
- **Executive Net Worth Summary**: Real-time aggregation of total assets across all active accounts and savings allocations.
- **Income vs. Expense Comparisons**: Interactive monthly cash flow charts powered by Recharts.
- **Category Spending Distribution**: Interactive donut charts highlighting category-wise expense breakdowns.
- **Cash Flow Calendar Heatmap**: Monthly view displaying daily income, expense, and net cashflow totals with single-day transaction inspection.
- **Trend Analysis**: 3-month, 6-month, and 12-month expense-to-income ratios and savings rate trajectories.

### 2. Multi-Account Management
- **Account Types**: Support for `Cash`, `Bank`, `UPI / Wallet`, `Credit Card`, and custom accounts.
- **Opening Balance Attribution**: Configurable opening balances with independent currency symbols.
- **Normalized Name Uniqueness**: Case-insensitive and whitespace-normalized name enforcement per user to prevent duplicate accounts (e.g., `HDFC Bank` vs. `hdfc  bank`).

### 3. Transaction Management
- **Transaction Types**: External `Income`, external `Expense`, and internal `Transfer` (Savings Goal transfers).
- **Available Balance Enforcement**: Expenses exceeding the available account balance are rejected with clear, descriptive error messages.
- **Atomic Edit Reversals**: Modifying an existing transaction's amount, category, type, or account automatically reverses the original financial impact before validating the new state.
- **Payment Method Decoupling**: Payment methods (`UPI`, `Cash`, `Debit Card`, `Net Banking`, `Wallet`, `Cheque`, `Other`) serve as auditable metadata without affecting balance arithmetic. Form inputs automatically filter valid payment methods according to account type.
- **Unrestricted Descriptions**: Free-text transaction descriptions and notes without arbitrary keyword restrictions.

### 4. Atomic Savings Goals (Model B Allocation)
- **Physical Balance Allocation**: Depositing into a goal removes funds from the source account's spendable balance and places them into the goal's protected balance, preventing accidental overspending.
- **Overfunding Prevention**: Deposit validations prevent funding beyond the remaining goal target.
- **Overdraw Protection**: Withdrawals cannot exceed the goal's accumulated balance.
- **Automatic Reversal on Deletion**: Deleting a goal deposit or withdrawal transaction rolls back the savings goal balance.

### 5. Monthly Category Budgets
- **Per-Month Spending Caps**: Define category-specific spending limits for any month (`YYYY-MM`).
- **Utilization Thresholds**: Real-time status indicators classifying spending into `Normal` (<80%), `Warning` (80%–99%), and `Critical` (≥100%).
- **Unique Constraint**: Enforces one budget per category per month per user.

### 6. Smart Financial Insights & Persistent Notifications
- **Automated Anomaly Detection**: Generates proactive alerts for negative account balances, high category budget burn rates, and overdue savings goals.
- **User-Isolated Notification States**: Read, unread, and dismissed states are tracked in PostgreSQL (`NotificationState` model) with support for single dismissals and bulk "Clear All".

### 7. Data Portability & Controlled Migration
- **JSON Backup & Restore**: Client-side full export and import with strict schema validation.
- **CSV Transaction Export**: Download transaction history formatted for spreadsheet analysis.
- **CLI Migration Utility**: Controlled migration script (`scripts/migration/migrate.js`) with `--dry-run` and `--execute` modes to migrate legacy backups directly into PostgreSQL.

---

## Technology Stack

### Frontend Architecture
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | `19.2.8` | Declarative component UI library |
| **Vite** | `8.3.0` | Fast development server and production bundler |
| **Tailwind CSS** | `4.3.3` | Utility-first styling engine with `@tailwindcss/vite` |
| **React Router** | `7.18.4` | Client-side routing and layout management |
| **Recharts** | `3.10.1` | SVG chart components (Bar, Pie, Area) |
| **Motion** | `13.4.1` | UI animations, modal transitions, and micro-interactions |
| **Lucide React** | `1.47.0` | Accessible iconography set |
| **UUID** | `14.0.2` | Client-side unique identifier generation |

### Backend Architecture
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | JavaScript runtime (ES Modules) |
| **Express.js** | `4.21.2` | HTTP REST API server framework |
| **Prisma ORM** | `6.4.1` | Type-safe database client and schema migrations |
| **PostgreSQL** | `>= 15.0` | Relational database (Local / Neon Serverless) |
| **jsonwebtoken** | `9.0.3` | Cryptographically signed JWT token generation & verification |
| **bcryptjs** | `3.0.3` | Password hashing with salt rounds |
| **Zod** | `4.6.5` | Request validation schemas |
| **Helmet** | `8.3.0` | HTTP security response headers |
| **express-rate-limit** | `8.7.0` | Rate limiting for public authentication endpoints |
| **CORS** | `2.8.5` | Cross-origin resource sharing policy enforcement |
| **cookie-parser** | `1.4.7` | Signed/HttpOnly session cookie parsing |

---

## System Architecture

```mermaid
graph TD
    subgraph Client ["Frontend Client (React 19 + Vite 8)"]
        UI["Presentation Layer (Pages & Components)"]
        Ctx["State Management (AuthContext & TransactionContext)"]
        Facade["Data Provider Facade (dataProvider)"]
        ApiProv["API Provider (apiProvider.js)"]
        LocProv["Local Provider (localProvider.js)"]
    end

    subgraph Gateway ["Express 4 Backend Gateway"]
        MW_Sec["Security Middleware (Helmet, CORS, RateLimiter)"]
        MW_Auth["Authentication Middleware (JWT / HttpOnly Cookie)"]
        MW_Val["Request Validation (Zod Schemas)"]
        Router["API Router (/api/*)"]
    end

    subgraph CoreServices ["Backend Domain Services Layer"]
        AccSvc["accountService (Ledger Balances & Headroom)"]
        TxnSvc["transactionService (ACID Mutations & Reversals)"]
        GoalSvc["goalService (Atomic Transfers & Overfunding Guards)"]
        BdgSvc["budgetService (Monthly Caps & Burn Rates)"]
        CatSvc["categoryService (Taxonomy & Custom Categories)"]
        NotifSvc["notificationService (Isolated Alert Lifecycle)"]
        AuthSvc["authService (Password Hashing & Token Signing)"]
    end

    subgraph DataStore ["Persistence Layer"]
        PrismaClient["Prisma Client (v6.4.1)"]
        DB[(PostgreSQL 15+ / Neon DB)]
        LStorage[("Browser localStorage (Fallback)")]
    end

    UI --> Ctx
    Ctx --> Facade
    Facade -->|VITE_DATA_SOURCE=api| ApiProv
    Facade -->|VITE_DATA_SOURCE=local| LocProv
    LocProv --> LStorage

    ApiProv -->|REST / JSON / Cookies| MW_Sec
    MW_Sec --> MW_Auth
    MW_Auth --> MW_Val
    MW_Val --> Router

    Router --> AccSvc
    Router --> TxnSvc
    Router --> GoalSvc
    Router --> BdgSvc
    Router --> CatSvc
    Router --> NotifSvc
    Router --> AuthSvc

    AccSvc --> PrismaClient
    TxnSvc --> PrismaClient
    GoalSvc --> PrismaClient
    BdgSvc --> PrismaClient
    CatSvc --> PrismaClient
    NotifSvc --> PrismaClient
    AuthSvc --> PrismaClient

    PrismaClient --> DB
```

---

## Project Directory Structure

```
ExpenseTracker/
├── DEPLOYMENT.md                            # Production deployment & operations guide
├── README.md                                # Project documentation
├── test_duplicates_and_notifications.js     # Multi-tenant account & notification test suite
├── frontend/                                # React 19 Client Application
│   ├── index.html                           # HTML entry point with metadata & Google Fonts
│   ├── package.json                         # Frontend dependencies and scripts
│   ├── vite.config.js                       # Vite configuration (Tailwind & React plugins)
│   ├── eslint.config.js                     # ESLint linting rules
│   ├── test_transaction_rules.js            # Business rules & accounting test suite (A to L)
│   ├── test_edge_cases.js                   # Financial edge-case & integrity test suite
│   ├── test_api_adapter.js                  # Frontend-to-backend API integration suite
│   ├── test_phase7_api_first.js             # API-first cutover verification test
│   ├── public/                              # Public assets (icons.svg, favicon.svg)
│   └── src/
│       ├── App.jsx                          # Route definitions & application shell
│       ├── main.jsx                         # React DOM bootstrap
│       ├── index.css                        # CSS design tokens, reset, and dark theme variables
│       ├── assets/                          # Static images and vector logos
│       ├── components/                      # Reusable React components
│       │   ├── auth/                        # ProtectedRoute component
│       │   ├── common/                      # Button, Card, Modal, Badge, Toast, GradientBorder
│       │   ├── dashboard/                   # SummaryCard, MonthlyChart, CategoryChart, RecentTxns
│       │   ├── forms/                       # TransactionForm with live headroom validation
│       │   ├── layout/                      # AppLayout, Sidebar, Header, MobileNav
│       │   └── notifications/               # NotificationBell and alert popovers
│       ├── context/                         # AuthContext and TransactionContext state providers
│       ├── data/                            # Default category definitions, currencies, payment methods
│       ├── pages/                           # Application page views
│       │   ├── Accounts.jsx                 # Multi-account management
│       │   ├── AddTransaction.jsx           # Transaction creation view
│       │   ├── Analytics.jsx                # Detailed financial charts and breakdown
│       │   ├── Budgets.jsx                  # Monthly category budgeting
│       │   ├── Calendar.jsx                 # Daily cashflow calendar heatmap
│       │   ├── Dashboard.jsx                # Financial overview and summary widgets
│       │   ├── EditTransaction.jsx          # Transaction edit view with reversal logic
│       │   ├── Goals.jsx                    # Savings goals with deposit/withdraw transfers
│       │   ├── Landing.jsx                  # Public feature showcase landing page
│       │   ├── Login.jsx                    # Authentication form (Login / Register)
│       │   ├── Settings.jsx                 # Currency, theme, and JSON backup/restore
│       │   └── Transactions.jsx             # Transaction history with filtering & CSV export
│       ├── services/                        # Business logic and client API adapters
│       │   ├── accountService.js            # Balance calculations & edit headroom
│       │   ├── budgetService.js             # Budget utilization formulas
│       │   ├── categoryService.js           # Category lookups and metadata
│       │   ├── goalService.js               # Savings goal progress & transfers
│       │   ├── insightService.js            # Smart financial warning generator
│       │   ├── storage.js                   # Storage facade & CSV export helper
│       │   ├── storageService.js            # LocalStorage reader/writer with schema migrations
│       │   ├── api/                         # REST API client modules
│       │   │   ├── accountApi.js            # Account HTTP endpoints
│       │   │   ├── apiClient.js             # Fetch wrapper with cookie/token handling
│       │   │   ├── authApi.js               # Auth HTTP endpoints
│       │   │   ├── budgetApi.js             # Budget HTTP endpoints
│       │   │   ├── categoryApi.js           # Category HTTP endpoints
│       │   │   ├── goalApi.js               # Goal HTTP endpoints
│       │   │   ├── index.js                 # Unified API client exports
│       │   │   ├── notificationApi.js       # Notification HTTP endpoints
│       │   │   └── transactionApi.js        # Transaction HTTP endpoints
│       │   └── dataProvider/                # Transparent data layer abstraction
│       │       ├── apiProvider.js           # Remote API implementation
│       │       ├── config.js                # Data source mode switch ('api' | 'local')
│       │       ├── index.js                 # Transparent dataProvider facade
│       │       └── localProvider.js         # Browser localStorage implementation
│       └── utils/                           # Formatting, calculation, and validation utilities
├── server/                                  # Node.js / Express REST API Server
│   ├── Dockerfile                           # Multi-stage production container image
│   ├── package.json                         # Server dependencies and test scripts
│   ├── test_api.js                          # REST API endpoint integration tests
│   ├── test_db.js                           # Database connectivity & CRUD test suite
│   ├── test_health.js                       # API health check test
│   ├── test_production_security.js          # Security, CORS, rate-limiting, and cookie tests
│   ├── test_services.js                     # Domain services & transaction locking tests
│   ├── prisma/                              # Prisma schema and database migrations
│   │   ├── schema.prisma                    # PostgreSQL relational schema
│   │   ├── seed.js                          # Database seeder script
│   │   └── migrations/                      # Committed SQL migrations
│   └── src/
│       ├── app.js                           # Express application factory & middleware stack
│       ├── server.js                        # HTTP server listener & graceful shutdown
│       ├── config/                          # Configuration loader & production environment validator
│       ├── controllers/                     # HTTP request handlers
│       ├── errors/                          # Domain error classes
│       ├── lib/                             # Prisma client singleton instance
│       ├── middleware/                      # Auth, rate limiting, error handling, validation
│       ├── routes/                          # Express route definitions
│       ├── services/                        # Domain business logic & transaction handling
│       ├── utils/                           # Account name normalization & formatters
│       └── validations/                     # Zod request validation schemas
└── scripts/                                 # Controlled Migration Tooling
    ├── package.json                         # Migration utility package metadata
    └── migration/
        ├── conflictDetector.js              # Database conflict & duplicate detector
        ├── constants.js                     # Migration defaults & error codes
        ├── financialAuditor.js              # Double-entry balance reconciliation
        ├── migrate.js                       # CLI entry point (--dry-run / --execute)
        ├── migrator.js                      # Transactional migration orchestrator
        ├── parser.js                        # JSON payload structure parser
        ├── validator.js                     # Schema and type safety validator
        ├── test_migration.js                # Migration validation test suite
        └── examples/
            └── sample_localStorage_backup.json # Sample test payload
```

---

## Application Workflows

### Authentication & Session Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant Auth as /api/auth/login
    participant Svc as authService
    participant DB as PostgreSQL
    participant Client as AuthContext (React)

    User->>Auth: POST /api/auth/login (email, password)
    Auth->>Svc: loginUser({ email, password })
    Svc->>DB: findUnique(email)
    DB-->>Svc: User Record + passwordHash
    Svc->>Svc: bcrypt.compare(password, passwordHash)
    Svc->>Svc: generateToken(user) [Signed JWT]
    Svc-->>Auth: { user, token }
    Auth-->>User: Set-Cookie: fintrack_token (HttpOnly, Secure, SameSite) + JSON { user, token }
    User->>Client: Store user in AuthContext state
    User->>User: Navigate to ProtectedRoute (/dashboard)
```

### Transaction Mutation & Balance Validation

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Form as TransactionForm
    participant API as /api/transactions
    participant TxnSvc as transactionService
    participant AccSvc as accountService
    participant DB as PostgreSQL (ACID Tx)

    User->>Form: Submit Transaction (Type: expense, Amount: ₹3,000, Account: Bank)
    Form->>API: POST /api/transactions
    API->>TxnSvc: createTransaction(data)
    TxnSvc->>DB: BEGIN Transaction
    TxnSvc->>DB: SELECT id FROM accounts WHERE id = accountId FOR UPDATE
    TxnSvc->>AccSvc: calculateAccountBalance(account, tx)
    AccSvc->>DB: Aggregate (Opening + Inflows - Outflows)
    DB-->>AccSvc: Balance = ₹5,000
    AccSvc-->>TxnSvc: Available Balance: ₹5,000
    Note over TxnSvc: Validate ₹3,000 <= ₹5,000 (Passed)
    TxnSvc->>DB: INSERT INTO transactions (...)
    TxnSvc->>DB: COMMIT Transaction
    DB-->>API: Transaction Created Record
    API-->>Form: 201 Created { transaction }
    Form-->>User: Update UI & Refresh Derived Account Balances
```

### Savings Goal Allocation Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant View as Goals Page (Modal)
    participant GoalAPI as /api/goals/:id/deposit
    participant GoalSvc as goalService
    participant DB as PostgreSQL (ACID Tx)

    User->>View: Deposit ₹5,000 into "Emergency Fund" from Bank Account
    View->>GoalAPI: POST /api/goals/goal-1/deposit { amount: 5000, sourceAccountId: "acc-bank" }
    GoalAPI->>GoalSvc: depositToGoal(...)
    GoalSvc->>DB: BEGIN Transaction
    GoalSvc->>DB: Lock Account & Goal (FOR UPDATE)
    GoalSvc->>GoalSvc: Check available balance >= ₹5,000
    GoalSvc->>GoalSvc: Check amount <= remaining target (prevent overfunding)
    GoalSvc->>DB: UPDATE savings_goals SET currentAmount = currentAmount + 5000
    GoalSvc->>DB: INSERT INTO transactions (type: "transfer", transferType: "goal_deposit", amount: 5000)
    GoalSvc->>DB: COMMIT Transaction
    DB-->>GoalAPI: Transfer Complete
    GoalAPI-->>View: 200 OK { updatedGoal, transaction }
    View-->>User: Display updated goal progress & reduced spendable account balance
```

---

## Database Schema & Financial Ledger Design

### Core Financial Invariants

FinTrack enforces an immutable double-entry accounting rule across all accounts:

$$\text{Account Balance} = \text{Opening Balance} + \sum \text{Inflows} - \sum \text{Outflows}$$

Where:
- **Inflows** = External Income Transactions $+$ Savings Goal Withdrawals deposited to the account.
- **Outflows** = External Expense Transactions $+$ Savings Goal Deposits transferred from the account.

```
Total Net Worth = ∑ (Derived Account Balances)
```

Savings Goal current balances are backed by corresponding transfer transactions in the ledger.

### Entity Relationship Overview

```mermaid
erDiagram
    User ||--o{ Account : owns
    User ||--o{ Transaction : executes
    User ||--o{ SavingsGoal : creates
    User ||--o{ Budget : sets
    User ||--o{ Category : defines
    User ||--o{ Setting : configures
    User ||--o{ NotificationState : tracks

    Account ||--o{ Transaction : debited_or_credited
    Category ||--o{ Transaction : categorizes
    Category ||--o{ Budget : targets
    SavingsGoal ||--o{ Transaction : transfers_with

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        datetime createdAt
        datetime updatedAt
    }

    Account {
        string id PK
        string userId FK
        string name
        string normalizedName
        string type
        float openingBalance
        string currency
        string icon
        string color
        datetime createdAt
        datetime updatedAt
    }

    Transaction {
        string id PK
        string userId FK
        string type
        float amount
        string description
        datetime date
        string paymentMethod
        string notes
        string transferType
        string goalName
        string accountId FK
        string categoryId FK
        string goalId FK
        datetime createdAt
        datetime updatedAt
    }

    SavingsGoal {
        string id PK
        string userId FK
        string name
        float targetAmount
        float currentAmount
        datetime targetDate
        string category
        string color
        string icon
        string notes
        datetime createdAt
        datetime updatedAt
    }

    Budget {
        string id PK
        string userId FK
        string categoryId FK
        string month
        float amount
        datetime createdAt
        datetime updatedAt
    }

    Category {
        string id PK
        string userId FK
        string name
        string type
        string icon
        string color
        boolean isCustom
        datetime createdAt
        datetime updatedAt
    }

    Setting {
        string userId FK
        string key PK
        string value
        datetime createdAt
        datetime updatedAt
    }

    NotificationState {
        string id PK
        string userId FK
        string alertId
        boolean isRead
        boolean isDismissed
        datetime readAt
        datetime dismissedAt
        datetime createdAt
        datetime updatedAt
    }
```

### Database Models & Constraints

1. **`users`**:
   - Primary user table. Password stored as bcrypt hash.
   - Enforces unique email via `@unique`.
2. **`accounts`**:
   - `openingBalance` defaults to `0`. No mutable balance column is stored.
   - Enforces unique normalized names per user via `@@unique([userId, normalizedName])`.
3. **`categories`**:
   - System categories have `userId = null` and `isCustom = false`. Custom categories belong to a specific `userId` with `isCustom = true`.
   - Types: `expense`, `income`, `transfer`, `both`.
4. **`savings_goals`**:
   - Maintains `targetAmount` and `currentAmount`.
   - Transfers to/from goals are recorded in the `transactions` ledger.
5. **`transactions`**:
   - Immutable transaction ledger.
   - Foreign keys to `Account` (`onDelete: Cascade`), `Category` (`onDelete: SetNull`), `SavingsGoal` (`onDelete: SetNull`), and `User` (`onDelete: Cascade`).
   - Indexes on `[userId]`, `[accountId]`, `[categoryId]`, `[goalId]`, and `[date]`.
6. **`budgets`**:
   - Enforces composite uniqueness: `@@unique([userId, categoryId, month])`.
7. **`settings`**:
   - User-scoped key-value preferences via composite primary key `@@id([userId, key])`.
8. **`notification_states`**:
   - Tracks read and dismissal timestamps per alert per user via `@@unique([userId, alertId])`.

### Database Migrations History

Committed migrations in `server/prisma/migrations/`:
1. `20260930100819_initial_fintrack_schema`: Baseline PostgreSQL schema with accounts, categories, transactions, goals, budgets, and settings.
2. `20260930230500_add_user_authentication`: User model, password hashing, and user relation foreign keys.
3. `20261001013000_add_account_normalized_name_and_notification_states`: Added `normalized_name` column and unique constraint on accounts, plus `notification_states` table.
4. `20261002120000_remove_recurring_transactions`: Removed recurring transactions table to maintain a strict ledger accounting structure.

---

## Prerequisites & Installation

### Prerequisites
- **Node.js**: Version `20.0.0` or higher (compatible with Node.js 18+)
- **npm**: Version `9.0.0` or higher
- **PostgreSQL**: Version `15.0` or higher (local PostgreSQL instance or cloud provider such as Neon, Supabase, or AWS RDS)

### Repository Setup
Clone the repository:
```bash
git clone https://github.com/sandip234-ui/ExpenseTracker.git
cd ExpenseTracker
```

---

## Local Development Setup

### 1. Backend Setup (`server/`)
```bash
cd server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Seed default accounts and categories
npm run prisma:seed # or: npx prisma db seed
```

### 2. Frontend Setup (`frontend/`)
```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

---

## Environment Variable Configuration

Use placeholder values only. Never commit production secrets to source control.

### Backend (`server/.env`)
```env
# Server Network Port
PORT=5001

# Runtime Environment ('development' | 'production' | 'test')
NODE_ENV=development

# Allowed Frontend Origins for CORS (comma-separated for multiple)
CLIENT_ORIGIN="http://localhost:5173"

# PostgreSQL Database Connection URL (Prisma)
DATABASE_URL="postgresql://db_user:db_password@localhost:5432/fintrack?schema=public"

# JWT Authentication Secret (Mandatory in production: >= 32 characters)
JWT_SECRET="replace-with-at-least-32-characters-of-random-entropy-in-production"

# Token Expiration Duration
JWT_EXPIRES_IN="7d"
```

### Frontend (`frontend/.env`)
```env
# Data Source Mode: 'api' (Default REST backend) or 'local' (offline fallback)
VITE_DATA_SOURCE=api

# Backend API Base URL
VITE_API_BASE_URL=http://localhost:5001/api
```

---

## Database Setup & Migrations

Prisma CLI commands executed from the `server/` directory:

| Command | Environment | Description |
|---|---|---|
| `npx prisma migrate dev` | Development | Applies pending migrations, updates Prisma Client, and prompts for new migration names. |
| `npx prisma migrate deploy` | Production / CI | Applies unapplied committed migrations idempotently without resetting data. |
| `npx prisma db seed` | Development | Executes `prisma/seed.js` to seed starter accounts, categories, and settings. |
| `npx prisma studio` | Development | Launches an interactive database browser at `http://localhost:5555`. |
| `npx prisma generate` | All | Generates the type-safe Prisma Client from `schema.prisma`. |

---

## Running the Application

### Option A: Separate Terminals

**Terminal 1 — Backend API:**
```bash
cd server
npm run dev
# Starts server with file watcher on http://localhost:5001
```

**Terminal 2 — Frontend Application:**
```bash
cd frontend
npm run dev
# Starts Vite development server on http://localhost:5173
```

Open `http://localhost:5173` in your browser to access FinTrack.

---

## Available Scripts & Commands

### Backend (`server/package.json`)
| Command | Description |
|---|---|
| `npm start` | Starts the production server (`node src/server.js`). |
| `npm run dev` | Starts the development server with file watching (`node --watch src/server.js`). |
| `npm test` | Runs the full backend test pipeline (`test_health.js`, `test_db.js`, `test_services.js`, `test_api.js`, `test_production_security.js`). |

### Frontend (`frontend/package.json`)
| Command | Description |
|---|---|
| `npm run dev` | Launches the Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | Compiles and bundles production-ready static assets into `frontend/dist/`. |
| `npm run preview` | Locally serves the production build from `dist/` for verification. |
| `npm run lint` | Runs ESLint to verify code quality across JSX and JavaScript files. |

---

## REST API Documentation

All protected endpoints require an active session via an HttpOnly cookie (`fintrack_token`) or an `Authorization: Bearer <token>` header.

### 1. Health & Status
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Returns service status and server ISO timestamp. |

### 2. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public (Rate-limited) | Register a new user with `email`, `password`, `name`. Seeds default accounts. |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Authenticate user credentials and issue signed JWT in HttpOnly cookie and JSON response. |
| `GET` | `/api/auth/me` | Protected | Retrieve authenticated user profile (`id`, `email`, `name`). |
| `POST` | `/api/auth/logout` | Protected | Clear the `fintrack_token` session cookie. |

### 3. Accounts (`/api/accounts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/accounts` | Protected | List all accounts with dynamically derived ledger balances. |
| `GET` | `/api/accounts/net-worth` | Protected | Retrieve total net worth aggregated across accounts. |
| `GET` | `/api/accounts/:id` | Protected | Retrieve single account by ID with derived balance. |
| `POST` | `/api/accounts` | Protected | Create a new account. Enforces per-user normalized name uniqueness. |
| `PUT` | `/api/accounts/:id` | Protected | Update account name, type, opening balance, icon, or color. |
| `DELETE` | `/api/accounts/:id` | Protected | Delete account and cascade associated transactions. |

### 4. Transactions (`/api/transactions`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/transactions` | Protected | Query transactions with filters (`accountId`, `type`, `categoryId`, `goalId`, `startDate`, `endDate`, `limit`, `offset`). |
| `GET` | `/api/transactions/:id` | Protected | Retrieve single transaction by ID. |
| `POST` | `/api/transactions` | Protected | Create a transaction with atomic balance validation. |
| `PUT` | `/api/transactions/:id` | Protected | Update transaction with atomic reversal and balance headroom check. |
| `DELETE` | `/api/transactions/:id` | Protected | Delete transaction and roll back linked goal balance if applicable. |

### 5. Savings Goals (`/api/goals`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/goals` | Protected | List all savings goals with calculated progress and target metrics. |
| `GET` | `/api/goals/:id` | Protected | Retrieve single goal by ID with transaction history. |
| `POST` | `/api/goals` | Protected | Create new savings goal (`name`, `targetAmount`, `targetDate`, `category`, `color`, `icon`). |
| `PUT` | `/api/goals/:id` | Protected | Update goal metadata or target amount. |
| `DELETE` | `/api/goals/:id` | Protected | Delete savings goal. |
| `POST` | `/api/goals/:id/deposit` | Protected | Atomic transfer from account to goal. Prevents overfunding. |
| `POST` | `/api/goals/:id/withdraw` | Protected | Atomic transfer from goal to account. Prevents overdraw. |

### 6. Budgets (`/api/budgets`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/budgets` | Protected | List monthly budgets with spending status (optional `?month=YYYY-MM`). |
| `GET` | `/api/budgets/:id` | Protected | Retrieve single budget by ID. |
| `POST` | `/api/budgets` | Protected | Create monthly budget (enforces unique category per month). |
| `PUT` | `/api/budgets/:id` | Protected | Update budget amount or target month. |
| `DELETE` | `/api/budgets/:id` | Protected | Delete budget. |

### 7. Categories (`/api/categories`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/categories` | Protected | List categories (system defaults + custom categories) with optional `?type=` filter. |
| `GET` | `/api/categories/:id` | Protected | Retrieve single category by ID. |
| `POST` | `/api/categories` | Protected | Create a custom category (`name`, `type`, `icon`, `color`). |
| `PUT` | `/api/categories/:id` | Protected | Update a custom category (system default categories are protected). |
| `DELETE` | `/api/categories/:id` | Protected | Delete a custom category (system default categories are protected). |

### 8. Notifications (`/api/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Protected | Retrieve all notification read and dismissed states for the user. |
| `POST` | `/api/notifications/read` | Protected | Mark an array of alert IDs as read (`alertIds: string[]`). |
| `POST` | `/api/notifications/dismiss` | Protected | Dismiss a single alert ID (`alertId: string`). |
| `POST` | `/api/notifications/dismiss-all` | Protected | Dismiss multiple alert IDs in bulk (`alertIds: string[]`). |

---

## Controlled Data Migration Utility

FinTrack includes a controlled migration CLI in `scripts/migration/migrate.js` for importing JSON backups into PostgreSQL without data corruption.

```bash
# Display help and options
node scripts/migration/migrate.js --help

# 1. Perform a zero-write DRY-RUN audit (Validates schema, checks conflicts, verifies balance math)
node scripts/migration/migrate.js --file scripts/migration/examples/sample_localStorage_backup.json --dry-run

# 2. Execute atomic migration into PostgreSQL
node scripts/migration/migrate.js --file scripts/migration/examples/sample_localStorage_backup.json --execute

# 3. Output results in machine-readable JSON format
node scripts/migration/migrate.js --file scripts/migration/examples/sample_localStorage_backup.json --dry-run --json
```

### Safety Guarantees
- **No Overwriting**: Halts immediately if conflicting primary keys or unique constraints exist in the database.
- **No Table Truncation**: Never executes `TRUNCATE` or `DELETE` on existing tables.
- **Atomic Rollback**: Wraps all record insertions in a single Prisma transaction; any failure rolls back 100% of inserted records.
- **Financial Reconciliation**: Computes total net worth, category sums, and opening balances before and after migration to verify exact numerical parity.

---

## Authentication & Security Architecture

1. **HttpOnly Session Cookies**: Browser tokens are issued as HttpOnly, Secure (in production), SameSite cookies (`fintrack_token`), protecting against client-side XSS credential harvesting.
2. **Bearer Token Fallback**: Supports `Authorization: Bearer <token>` headers for automated integration tests and programmatic API clients.
3. **Password Security**: Passwords are hashed using bcrypt with a salt work factor of 10.
4. **Helmet Security Headers**: Enforces strict browser protections including `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (anti-clickjacking), and DNS prefetch controls.
5. **Strict CORS Whitelist**: Only authorized origins configured in `CLIENT_ORIGIN` can make cross-origin requests.
6. **Authentication Rate Limiting**: Sensitive routes (`/api/auth/login`, `/api/auth/register`) are restricted to 20 attempts per 15-minute window per IP address via `express-rate-limit`.
7. **Request Payload Limits**: Request bodies are capped at 1MB to prevent memory exhaustion attacks.
8. **Production Error Masking**: `500 Internal Server Error` responses return sanitized generic messages; raw SQL queries, schema details, and database stack traces are never exposed in production responses.
9. **Multi-Tenant Isolation**: Every database query on user-scoped resources enforces `where: { userId }`.

---

## Automated Testing & Verification

The repository contains standalone and integration test suites covering financial invariants, backend security, API endpoints, and business rules:

### 1. Root Multi-Tenant & Notification Test Suite
```bash
# Verifies account normalized name uniqueness, duplicate prevention, and user notification isolation
node test_duplicates_and_notifications.js
```
*Result: 13/13 tests verified passing.*

### 2. Frontend Business Rules & Accounting Test Suite
```bash
cd frontend

# Verifies transaction rules, headroom calculations, and category validation (Tests A through L)
node test_transaction_rules.js

# Verifies savings goal transfers, overfunding/overdraw prevention, and deletion reversals
node test_edge_cases.js
```
*Result: All 12 business rule suites (A–L) and 11 edge-case tests verified passing.*

### 3. Server Health, Database, and Production Security Suite
```bash
cd server

# Verifies API health endpoint
node test_health.js

# Verifies PostgreSQL connectivity and CRUD operations
node test_db.js

# Verifies Helmet headers, CORS restrictions, rate limiting, and error sanitization
node test_production_security.js
```
*Result: All production hardening and security tests verified passing.*

### 4. Migration Tooling Verification
```bash
# Validates migration parser, financial auditor, and dry-run execution
node scripts/migration/migrate.js --file scripts/migration/examples/sample_localStorage_backup.json --dry-run
```
*Result: Verified dry-run execution with zero write errors.*

---

## Production Deployment Architecture

FinTrack is designed to deploy as a decoupled application:

| Component | Target Environments | Runtime | Build & Run Command |
|---|---|---|---|
| **Frontend SPA** | Vercel, Cloudflare Pages, Netlify, AWS S3+CloudFront | Static HTML / JS / CSS | Build: `npm run build`<br>Output: `dist/` |
| **Backend API** | Render, Railway, Fly.io, AWS App Runner, VPS | Node.js (v20+ Alpine) | Build: `npm ci --omit=dev && npx prisma generate`<br>Start: `npm start` |
| **Database** | Managed PostgreSQL (Neon, Supabase, AWS RDS) | PostgreSQL 15+ | Migrations: `npx prisma migrate deploy` |

### Production Container (Docker)
The backend includes a production-ready `server/Dockerfile`:
```bash
cd server

# Build Docker container
docker build -t fintrack-server .

# Run container with environment variables
docker run -p 5001:5001 \
  -e NODE_ENV=production \
  -e PORT=5001 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/fintrack?sslmode=require" \
  -e JWT_SECRET="your-32-char-random-entropy-production-key" \
  -e CLIENT_ORIGIN="https://fintrack.example.com" \
  fintrack-server
```

For complete production deployment instructions, domain configurations, and rollback procedures, refer to [DEPLOYMENT.md](file:///Users/sandipbiswal/Desktop/ExpenseTracker/DEPLOYMENT.md).

---

## Current Limitations

- **Single Active Display Currency**: While multiple international currencies are supported (`INR`, `USD`, `EUR`, `GBP`, `JPY`), currency conversion rates are not fetched dynamically from a live forex API. The selected currency symbol applies across account displays.
- **Backend Dependency in API Mode**: When `VITE_DATA_SOURCE=api` is set, an active backend server and PostgreSQL connection are required. Offline operation is supported when configured with `VITE_DATA_SOURCE=local`.
- **Single-User Account Sharing**: Accounts belong to a single authenticated user; collaborative shared wallets across multiple user accounts are not currently supported.

---

## Future Enhancements

The following enhancements represent potential architectural roadmap items:
- [ ] **PWA (Progressive Web App)**: Offline service worker caching and background sync for local-to-remote reconciliation.
- [ ] **Dynamic Exchange Rate Engine**: Automated currency conversion with real-time exchange rates per account.
- [ ] **Receipt & Invoice Attachments**: Document and receipt upload capabilities linked to transaction records.
- [ ] **Multi-User Shared Accounts**: Role-based access control for shared family or organizational wallets.
- [ ] **Split Transactions**: Allocating a single payment across multiple categories and budgets.

---

## Contributing

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Ensure code passes linting and tests:
   ```bash
   # In frontend/
   npm run lint
   node test_transaction_rules.js
   node test_edge_cases.js

   # In server/
   node test_health.js
   node test_db.js
   node test_production_security.js
   ```
3. Commit your changes with clear, descriptive commit messages.
4. Push your branch and open a Pull Request.

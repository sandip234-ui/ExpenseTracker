-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Insert Primary Default User for Existing Migrated Data
INSERT INTO "users" ("id", "email", "passwordHash", "name", "createdAt", "updatedAt")
VALUES (
    'user_default_primary',
    'demo@fintrack.local',
    '$2b$10$T3oHEkFQfRFoO.AKuTeMyeiTkNW2gpE7nsyY.gEwR4G.WydEPwYA.',
    'Default User',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable Accounts
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT 'user_default_primary';
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");
DO $$ BEGIN
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE INDEX IF NOT EXISTS "categories_userId_idx" ON "categories"("userId");
DO $$ BEGIN
  ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Savings Goals
ALTER TABLE "savings_goals" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT 'user_default_primary';
CREATE INDEX IF NOT EXISTS "savings_goals_userId_idx" ON "savings_goals"("userId");
DO $$ BEGIN
  ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT 'user_default_primary';
CREATE INDEX IF NOT EXISTS "transactions_userId_idx" ON "transactions"("userId");
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Budgets
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT 'user_default_primary';
DROP INDEX IF EXISTS "budgets_categoryId_month_key";
CREATE UNIQUE INDEX IF NOT EXISTS "budgets_userId_categoryId_month_key" ON "budgets"("userId", "categoryId", "month");
CREATE INDEX IF NOT EXISTS "budgets_userId_month_idx" ON "budgets"("userId", "month");
DO $$ BEGIN
  ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Recurring Transactions
ALTER TABLE "recurring_transactions" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT 'user_default_primary';
CREATE INDEX IF NOT EXISTS "recurring_transactions_userId_idx" ON "recurring_transactions"("userId");
DO $$ BEGIN
  ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Settings
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT 'user_default_primary';
DO $$ BEGIN
  ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_pkey";
  ALTER TABLE "settings" ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("userId", "key");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "settings" ADD CONSTRAINT "settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

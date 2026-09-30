-- AlterTable
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "normalized_name" TEXT NOT NULL DEFAULT '';

-- Backfill normalized_name for existing accounts from name
UPDATE "accounts"
SET "normalized_name" = LOWER(TRIM(REGEXP_REPLACE("name", '\s+', ' ', 'g')))
WHERE "normalized_name" = '' OR "normalized_name" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_userId_normalized_name_key" ON "accounts"("userId", "normalized_name");

-- CreateTable
CREATE TABLE IF NOT EXISTS "notification_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'user_default_primary',
    "alertId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notification_states_userId_idx" ON "notification_states"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notification_states_userId_alertId_key" ON "notification_states"("userId", "alertId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "notification_states" ADD CONSTRAINT "notification_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

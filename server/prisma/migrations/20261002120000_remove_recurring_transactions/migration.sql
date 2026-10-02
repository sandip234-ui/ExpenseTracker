-- Remove rule metadata without deleting any transaction ledger rows.
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_recurringId_fkey";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "recurringId";
DROP TABLE "recurring_transactions";
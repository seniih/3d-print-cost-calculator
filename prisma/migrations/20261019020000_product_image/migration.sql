-- Products keep a small thumbnail in the database instead of a storage key:
-- no object storage or volume needed to self-host. The old columns were never used.
ALTER TABLE "product" DROP COLUMN "imageKey",
DROP COLUMN "sourceFileKey",
DROP COLUMN "sourceFileName",
ADD COLUMN "imageData" TEXT;

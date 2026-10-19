-- Profit can be a markup or a margin; the old column becomes `profitPct`.
CREATE TYPE "ProfitMode" AS ENUM ('MARKUP', 'MARGIN');

ALTER TABLE "user_settings" RENAME COLUMN "profitMarginPct" TO "profitPct";
ALTER TABLE "user_settings"
  ADD COLUMN "profitMode" "ProfitMode" NOT NULL DEFAULT 'MARKUP',
  ADD COLUMN "filamentWastePct" DECIMAL(6,2) NOT NULL DEFAULT 0;

-- Resale value lowers the depreciation spread over the printer's lifetime.
ALTER TABLE "printer" ADD COLUMN "resaleValue" DECIMAL(12,4) NOT NULL DEFAULT 0;

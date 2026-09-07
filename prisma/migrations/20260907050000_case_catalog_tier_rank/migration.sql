ALTER TABLE "PricingTier" ADD COLUMN "rank" INTEGER;
UPDATE "PricingTier" SET "rank" = CASE "name" WHEN 'Tier 1' THEN 1 WHEN 'Tier 2' THEN 2 END
WHERE "name" IN ('Tier 1', 'Tier 2');
-- Preserve any additional pre-existing tiers and their relationships. Reserve 1/2.
WITH remaining AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "name", "id") + 2 AS rank
  FROM "PricingTier" WHERE "rank" IS NULL
)
UPDATE "PricingTier" SET "rank" = remaining.rank FROM remaining WHERE "PricingTier"."id" = remaining."id";
ALTER TABLE "PricingTier" ALTER COLUMN "rank" SET NOT NULL;
ALTER TABLE "PricingTier" ADD CONSTRAINT "PricingTier_rank_positive" CHECK ("rank" > 0);
CREATE UNIQUE INDEX "PricingTier_rank_key" ON "PricingTier"("rank");
ALTER TABLE "OrderItem" ADD COLUMN "brandSnapshot" VARCHAR(100), ADD COLUMN "packingSnapshot" VARCHAR(100);

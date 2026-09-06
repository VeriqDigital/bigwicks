-- CreateTable
CREATE TABLE "ProductPrice" (
    "catalogKey" UUID NOT NULL,
    "pricingTierId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("catalogKey","pricingTierId")
);

-- Prisma cannot express this PostgreSQL constraint. Defense in depth for every
-- writer, including scripts: reject negatives and PostgreSQL's numeric NaN.
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_nonnegative_finite_price"
CHECK ("price" >= 0 AND "price" <> 'NaN'::numeric);

-- CreateIndex
CREATE INDEX "ProductPrice_pricingTierId_idx" ON "ProductPrice"("pricingTierId");

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "PricingTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

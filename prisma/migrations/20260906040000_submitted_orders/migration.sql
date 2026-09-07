-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('SUBMITTED');

-- CreateEnum
CREATE TYPE "OrderNotificationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'FAILED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "reference" VARCHAR(23) NOT NULL,
    "submissionId" UUID NOT NULL,
    "reviewHash" VARCHAR(64) NOT NULL,
    "customerId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'SUBMITTED',
    "companyNameSnapshot" VARCHAR(200) NOT NULL,
    "customerNumberSnapshot" VARCHAR(100),
    "emailSnapshot" VARCHAR(254) NOT NULL,
    "pricingTierIdSnapshot" TEXT NOT NULL,
    "pricingTierNameSnapshot" VARCHAR(100) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationStatus" "OrderNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "notificationAcceptedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "catalogKey" UUID NOT NULL,
    "skuSnapshot" VARCHAR(100) NOT NULL,
    "productNameSnapshot" VARCHAR(200) NOT NULL,
    "unitPriceSnapshot" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalSnapshot" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE INDEX "Order_createdAt_id_idx" ON "Order"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_customerId_submissionId_key" ON "Order"("customerId", "submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_catalogKey_key" ON "OrderItem"("orderId", "catalogKey");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defensive bounds, including PostgreSQL's special numeric NaN value.
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_valid" CHECK ("total" >= 0 AND "total" <> 'NaN'::numeric);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_valid" CHECK ("quantity" BETWEEN 1 AND 999);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_amounts_valid" CHECK (
  "unitPriceSnapshot" >= 0 AND "unitPriceSnapshot" <> 'NaN'::numeric AND
  "lineTotalSnapshot" = "unitPriceSnapshot" * "quantity"
);

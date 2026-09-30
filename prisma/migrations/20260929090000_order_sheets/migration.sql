CREATE TYPE "OrderExportState" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');
CREATE TYPE "OrderExportKind" AS ENUM ('TEMPLATE', 'SNAPSHOT');
ALTER TABLE "Order" ADD COLUMN "notificationHasAttachment" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "OrderSheetVersion" (
  "id" TEXT PRIMARY KEY, "tierId" TEXT NOT NULL REFERENCES "PricingTier"("id") ON DELETE RESTRICT,
  "original" BYTEA NOT NULL, "checksum" VARCHAR(64) NOT NULL, "filename" VARCHAR(120) NOT NULL,
  "parserVersion" VARCHAR(40) NOT NULL, "configuration" JSONB NOT NULL,
  "uploadedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "uploadedAt" TIMESTAMP(3) NOT NULL, "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("id", "tierId"), CHECK (octet_length("original") BETWEEN 1 AND 2097152)
);
CREATE INDEX "OrderSheetVersion_tierId_activatedAt_idx" ON "OrderSheetVersion"("tierId", "activatedAt");
CREATE TABLE "OrderSheetActive" (
  "tierId" TEXT PRIMARY KEY REFERENCES "PricingTier"("id") ON DELETE RESTRICT,
  "versionId" TEXT UNIQUE, "revision" INTEGER NOT NULL DEFAULT 0 CHECK ("revision" >= 0),
  "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE ("versionId", "tierId"),
  FOREIGN KEY ("versionId", "tierId") REFERENCES "OrderSheetVersion"("id", "tierId") ON DELETE RESTRICT
);
CREATE TABLE "OrderSheetDraft" (
  "id" TEXT PRIMARY KEY, "tierId" TEXT NOT NULL REFERENCES "PricingTier"("id") ON DELETE RESTRICT,
  "original" BYTEA NOT NULL, "checksum" VARCHAR(64) NOT NULL, "filename" VARCHAR(120) NOT NULL,
  "inspection" JSONB NOT NULL, "stateHash" VARCHAR(64) NOT NULL, "expectedRevision" INTEGER NOT NULL,
  "uploadedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT, "sessionVersion" INTEGER NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
  CHECK (octet_length("original") BETWEEN 1 AND 2097152)
);
CREATE INDEX "OrderSheetDraft_expiresAt_idx" ON "OrderSheetDraft"("expiresAt");
CREATE TABLE "OrderExport" (
  "orderId" TEXT PRIMARY KEY REFERENCES "Order"("id") ON DELETE RESTRICT,
  "templateId" TEXT REFERENCES "OrderSheetVersion"("id") ON DELETE RESTRICT, "templateAbsence" VARCHAR(40),
  "state" "OrderExportState" NOT NULL DEFAULT 'PENDING', "kind" "OrderExportKind",
  "diagnostic" VARCHAR(40), "bytes" BYTEA, "checksum" VARCHAR(64), "generatorVersion" VARCHAR(40),
  "claimId" UUID, "claimedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedAt" TIMESTAMP(3),
  CHECK ("bytes" IS NULL OR octet_length("bytes") BETWEEN 1 AND 4194304),
  CHECK ("state" <> 'READY' OR ("bytes" IS NOT NULL AND "checksum" IS NOT NULL AND "kind" IS NOT NULL AND "generatedAt" IS NOT NULL))
);
CREATE INDEX "OrderExport_state_claimedAt_idx" ON "OrderExport"("state", "claimedAt");
CREATE FUNCTION order_sheet_version_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Order sheet versions are immutable'; END $$;
CREATE TRIGGER order_sheet_version_immutable BEFORE UPDATE ON "OrderSheetVersion" FOR EACH ROW EXECUTE FUNCTION order_sheet_version_immutable();
CREATE FUNCTION order_export_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."state" = 'READY' OR NEW."templateId" IS DISTINCT FROM OLD."templateId" OR NEW."templateAbsence" IS DISTINCT FROM OLD."templateAbsence" THEN
    RAISE EXCEPTION 'Pinned export inputs and ready artifacts are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_export_immutable BEFORE UPDATE ON "OrderExport" FOR EACH ROW EXECUTE FUNCTION order_export_immutable();

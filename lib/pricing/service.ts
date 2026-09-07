import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { readPublishedCatalogContent } from "@/lib/catalog/content";
import { parsePricingCsv, exportPricingCsv, MAX_CSV_BYTES, PricingError } from "./csv";
import { ensureWritable, planImport, pricingSnapshot } from "./plan";
import { openPreview, sealPreview } from "./preview-token";

export const pricingUnavailable = "Pricing data is temporarily unavailable. Please try again later.";
export function pricingMessage(error: unknown) { return error instanceof PricingError ? error.message : pricingUnavailable; }
async function readSql(tx: Prisma.TransactionClient, raw: unknown) {
  const [prices, tiers] = await Promise.all([
    tx.productPrice.findMany({ select: { catalogKey: true, pricingTierId: true, price: true, updatedAt: true } }),
    tx.pricingTier.findMany({ select: { id: true, name: true, rank: true }, orderBy: { rank: "asc" } }),
  ]);
  return pricingSnapshot(raw, prices, tiers);
}
async function readSnapshot() {
  const raw = await readPublishedCatalogContent();
  return getDb().$transaction((tx) => readSql(tx, raw), { isolationLevel: "RepeatableRead" });
}
export async function getAdminPricing() {
  await requireAdmin();
  try {
    const snapshot = await readSnapshot();
    return { status: "ready" as const, rows: snapshot.rows, tiers: snapshot.tiers, counts: snapshot.counts, issues: snapshot.audit.issues, blocked: snapshot.blocked };
  } catch { return { status: "unavailable" as const, message: pricingUnavailable }; }
}
export async function getAdminPricingExport() {
  await requireAdmin();
  const snapshot = await readSnapshot(); ensureWritable(snapshot);
  return exportPricingCsv(snapshot.rows, snapshot.tiers);
}
export async function previewPricingImport(file: unknown) {
  const admin = await requireAdmin();
  try {
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_CSV_BYTES) throw new PricingError("Choose a nonempty CSV file no larger than 256 KiB.");
    const snapshot = await readSnapshot(); ensureWritable(snapshot);
    const parsed = parsePricingCsv(new Uint8Array(await file.arrayBuffer()), snapshot.tiers);
    if (parsed.errors.length) return { status: "invalid" as const, message: "No prices changed. Correct the CSV errors and upload again.", errors: parsed.errors, rowsRead: parsed.rowsRead };
    const preview = planImport(parsed.rows, snapshot);
    if (preview.errors.length) return { status: "invalid" as const, message: "No prices changed. Correct the CSV errors and upload again.", errors: preview.errors, rowsRead: parsed.rowsRead };
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const token = sealPreview({ adminId: admin.id, sessionVersion: admin.sessionVersion, expiresAt, snapshot: snapshot.fingerprint,
      rows: parsed.rows.map(({ catalogKey, prices }) => ({ catalogKey, prices })),
    });
    return { status: "preview" as const, preview, token, expiresAt };
  } catch (error) { return { status: "invalid" as const, message: pricingMessage(error), errors: [] }; }
}
export async function confirmPricingImport(token: unknown, acknowledgeRemovals: boolean) {
  const admin = await requireAdmin();
  try {
    const staged = openPreview(token, admin);
    // Fresh Sanity read before any transaction/writes; failure never guesses identity.
    const raw = await readPublishedCatalogContent();
    await getDb().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${admin.id} FOR SHARE`;
      const currentAdmin = await tx.user.findUnique({ where: { id: admin.id }, select: { role: true, active: true, sessionVersion: true, customer: { select: { id: true } } } });
      if (!currentAdmin?.active || currentAdmin.role !== "ADMIN" || currentAdmin.customer || currentAdmin.sessionVersion !== admin.sessionVersion) throw new PricingError("Your account changed. Sign in again before importing.");
      if (staged.expiresAt <= Date.now()) throw new PricingError("This preview expired. Upload the CSV again.");
      const snapshot = await readSql(tx, raw); ensureWritable(snapshot);
      if (snapshot.fingerprint !== staged.snapshot) throw new PricingError("Catalog or pricing data changed after this preview. No prices changed. Upload the CSV again to review current values.");
      const rows = staged.rows.map((row) => {
        const current = snapshot.rows.find((product) => product.catalogKey === row.catalogKey);
        if (!current) throw new PricingError("Catalog identity changed. Upload the CSV again.");
        return { ...row, sku: current.sku, productName: current.name };
      });
      const plan = planImport(rows, snapshot);
      if (plan.errors.length) throw new PricingError("The import no longer validates. Upload the CSV again.");
      const writes = plan.changes.flatMap((change) => change.prices.map((price) => ({ catalogKey: change.catalogKey, ...price })));
      const removals = writes.filter((change) => change.kind === "remove");
      if (removals.length && acknowledgeRemovals !== true) throw new PricingError("Confirm that blank cells remove existing prices before applying this import.");
      if (removals.length) await tx.productPrice.deleteMany({ where: { OR: removals.map(({ catalogKey, pricingTierId }) => ({ catalogKey, pricingTierId })) } });
      const upserts = writes.filter((change) => change.kind === "create" || change.kind === "update");
      if (upserts.length) {
        // One parameterized bulk upsert, not hundreds of database round trips.
        await tx.$executeRaw(Prisma.sql`INSERT INTO "ProductPrice" ("catalogKey", "pricingTierId", "price", "createdAt", "updatedAt") VALUES
          ${Prisma.join(upserts.map((change) => Prisma.sql`(${change.catalogKey}::uuid, ${change.pricingTierId}, ${change.after}::numeric, NOW(), NOW())`))}
          ON CONFLICT ("catalogKey", "pricingTierId") DO UPDATE SET "price" = EXCLUDED."price", "updatedAt" = EXCLUDED."updatedAt"`);
      }
    }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 });
    return { status: "success" as const, message: "Pricing import applied. Customers see the new prices on their next catalog refresh." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return { status: "invalid" as const, message: "Pricing changed during confirmation. No prices changed. Upload the CSV again." };
    return { status: "invalid" as const, message: pricingMessage(error) };
  }
}

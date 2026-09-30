import { afterAll, beforeEach, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  content: vi.fn(),
  email: vi.fn(),
  generate: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/catalog/content", () => ({
  readPublishedCatalogContent: mock.content,
}));
vi.mock("@/lib/orders/email", () => ({ sendOrderEmail: mock.email }));
vi.mock("@/lib/order-sheets/worker", async (original) => ({
  ...(await original<typeof import("@/lib/order-sheets/worker")>()),
  generateOrderSheet: mock.generate,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Error(`redirect:${url}`);
  },
  notFound: () => {
    throw Error("notFound");
  },
}));
import { getDb } from "@/lib/db";
import {
  uploadOrderSheet,
  previewOrderSheet,
  activateOrderSheet,
  deactivateOrderSheet,
  listOrderSheets,
} from "@/lib/order-sheets/service";
import {
  retryOrderExport,
  generateCommittedExport,
} from "@/lib/order-sheets/exports";
import {
  downloadOrderExport,
  downloadOriginalTemplate,
} from "@/lib/order-sheets/downloads";
import { reviewOrder, submitOrder } from "@/lib/orders/service";
import { getAdminOrder, getCustomerConfirmation } from "@/lib/orders/reads";
import { fictionalProduct } from "../fixtures/catalog";
import {
  fictionalSheet,
  sheetKey,
  compositeKey,
} from "../fixtures/order-sheets";
const actualWorker = await vi.importActual<
  typeof import("@/lib/order-sheets/worker")
>("@/lib/order-sheets/worker");
const db = getDb();
let tier1: string,
  tier2: string,
  admin: { id: string; sessionVersion: number },
  buyer: typeof admin;
const users = { email: { startsWith: "test-sheet-" } };
const catalog = () => [
  fictionalProduct({
    _id: "sheet-first",
    catalogKey: sheetKey,
    sku: "DEMO-ONE",
  }),
  fictionalProduct({
    _id: "sheet-last",
    catalogKey: compositeKey,
    sku: "DEMO-A,B,C",
  }),
];
async function cleanup() {
  await db.orderExport.deleteMany({
    where: { order: { submittedByUser: users } },
  });
  await db.orderItem.deleteMany({
    where: { order: { submittedByUser: users } },
  });
  await db.order.deleteMany({ where: { submittedByUser: users } });
  await db.orderSheetActive.deleteMany({
    where: { tierId: { in: [tier1, tier2].filter(Boolean) } },
  });
  await db.orderSheetDraft.deleteMany({ where: { uploadedBy: users } });
  await db.orderSheetVersion.deleteMany({ where: { uploadedBy: users } });
  await db.productPrice.deleteMany({
    where: { catalogKey: { in: [sheetKey, compositeKey] } },
  });
  await db.customer.deleteMany({ where: { user: users } });
  await db.user.deleteMany({ where: users });
}
beforeEach(async () => {
  tier1 = (
    await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })
  ).id;
  tier2 = (
    await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } })
  ).id;
  await cleanup();
  await db.loginRateLimit.deleteMany();
  admin = await db.user.create({
    data: {
      email: "test-sheet-admin@example.test",
      role: "ADMIN",
      active: true,
    },
  });
  buyer = await db.user.create({
    data: {
      email: "test-sheet-buyer@example.test",
      role: "CUSTOMER",
      active: true,
      customer: {
        create: {
          companyName: "Fictional Sheet Buyer",
          customerNumber: "SHEET-001",
          pricingTierId: tier2,
          active: true,
        },
      },
    },
  });
  await db.productPrice.createMany({
    data: [
      { catalogKey: sheetKey, pricingTierId: tier2, price: "19.99" },
      { catalogKey: compositeKey, pricingTierId: tier2, price: "0.10" },
      { catalogKey: sheetKey, pricingTierId: tier1, price: "4.00" },
    ],
  });
  mock.auth.mockResolvedValue({ user: admin });
  mock.content.mockReset();
  mock.content.mockResolvedValue(catalog());
  mock.email.mockReset();
  mock.email.mockResolvedValue(undefined);
  mock.generate.mockReset();
  mock.generate.mockImplementation(actualWorker.generateOrderSheet);
});
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});
async function stage(
  tier = tier2,
  options: Parameters<typeof fictionalSheet>[0] = {},
) {
  const bytes = await fictionalSheet(options);
  const upload = await uploadOrderSheet(
    new File([new Uint8Array(bytes)], "fictional.xlsx"),
    tier,
  );
  expect(upload.status).toBe("uploaded");
  const column = upload.inspection!.priceColumns.find(
    (p) => p.label === "TIER BLUE",
  )!.column;
  const preview = await previewOrderSheet(upload.draftId, String(column));
  expect(preview.status).toBe("preview");
  return { preview, bytes };
}
async function activate() {
  const { preview, bytes } = await stage();
  expect(
    (
      await activateOrderSheet(
        preview.draftId,
        preview.priceColumn,
        preview.token,
        true,
      )
    ).status,
  ).toBe("success");
  return {
    id: (
      await db.orderSheetActive.findUniqueOrThrow({ where: { tierId: tier2 } })
    ).versionId!,
    bytes,
  };
}
async function submit() {
  mock.auth.mockResolvedValue({ user: buyer });
  const r = await reviewOrder([
    { catalogKey: sheetKey, quantity: 3 },
    { catalogKey: compositeKey, quantity: 1 },
  ]);
  if (r.status !== "review") throw Error("Fixture review failed");
  const result = await submitOrder(r.review.token);
  expect(result.status).toBe("submitted");
  if (result.status !== "submitted") throw Error("Fixture submit failed");
  return { reference: result.reference, token: r.review.token };
}
it("pins tier template, saves artifact before notification and serves identical staff download bytes", async () => {
  const template = await activate();
  mock.email.mockImplementation(async (email) => {
    const row = await db.order.findUniqueOrThrow({
      where: { reference: email.reference },
      include: { excelExport: true },
    });
    expect(row.excelExport?.state).toBe("READY");
    expect(Buffer.from(row.excelExport!.bytes!).toString("base64")).toBe(
      email.attachment.content,
    );
  });
  const { reference, token } = await submit();
  expect(mock.email).toHaveBeenCalledTimes(1);
  expect(await getCustomerConfirmation(reference)).not.toHaveProperty(
    "excelExport",
  );
  mock.auth.mockResolvedValue({ user: admin });
  const response = await downloadOrderExport(reference);
  const bytes = Buffer.from(await response.arrayBuffer());
  expect(bytes.toString("base64")).toBe(
    mock.email.mock.calls[0][0].attachment.content,
  );
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("Content-Disposition")).toContain(reference);
  expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  expect(
    Buffer.from(
      await (await downloadOriginalTemplate(template.id)).arrayBuffer(),
    ),
  ).toEqual(template.bytes);
  const view = await getAdminOrder(reference);
  expect(view.excelExport).toMatchObject({
    state: "READY",
    kind: "TEMPLATE",
    templateId: template.id,
  });
  expect(view.notificationHasAttachment).toBe(true);
  await retryOrderExport(reference);
  expect(mock.generate).toHaveBeenCalledTimes(1);
  expect(mock.email).toHaveBeenCalledTimes(1);
  mock.auth.mockResolvedValue({ user: buyer });
  await submitOrder(token);
  expect(mock.email).toHaveBeenCalledTimes(1);
});
it("replacement leaves old files immutable across catalog, SKU, prices, customer tier and Sanity outage", async () => {
  const first = await activate();
  const a = await submit();
  mock.auth.mockResolvedValue({ user: admin });
  const before = await (await downloadOrderExport(a.reference)).arrayBuffer();
  const second = await activate();
  expect(first.id).not.toBe(second.id);
  const b = await submit();
  expect(
    (
      await db.order.findUniqueOrThrow({
        where: { reference: b.reference },
        include: { excelExport: true },
      })
    ).excelExport!.templateId,
  ).toBe(second.id);
  await db.customer.update({
    where: { userId: buyer.id },
    data: { pricingTierId: tier1 },
  });
  await db.productPrice.deleteMany({ where: { catalogKey: sheetKey } });
  mock.content.mockRejectedValue(Error("offline"));
  mock.auth.mockResolvedValue({ user: admin });
  expect(await (await downloadOrderExport(a.reference)).arrayBuffer()).toEqual(
    before,
  );
  await retryOrderExport(a.reference);
  expect(mock.email).toHaveBeenCalledTimes(2);
});
it("template-only activation does not invalidate a customer's commercial review", async () => {
  mock.auth.mockResolvedValue({ user: buyer });
  const r = await reviewOrder([{ catalogKey: sheetKey, quantity: 1 }]);
  if (r.status !== "review") throw Error();
  mock.auth.mockResolvedValue({ user: admin });
  const template = await activate();
  mock.auth.mockResolvedValue({ user: buyer });
  const saved = await submitOrder(r.review.token);
  expect(saved.status).toBe("submitted");
  expect((await db.orderExport.findFirstOrThrow()).templateId).toBe(
    template.id,
  );
});
it("missing Tier 1 uses full fallback instead of the active Tier 2 template", async () => {
  await activate();
  await db.customer.update({
    where: { userId: buyer.id },
    data: { pricingTierId: tier1 },
  });
  mock.auth.mockResolvedValue({ user: buyer });
  const r = await reviewOrder([{ catalogKey: sheetKey, quantity: 2 }]);
  if (r.status !== "review") throw Error();
  const result = await submitOrder(r.review.token);
  expect(result.status).toBe("submitted");
  expect(await db.orderExport.findFirstOrThrow()).toMatchObject({
    templateId: null,
    templateAbsence: "NO_TEMPLATE",
    kind: "SNAPSHOT",
    diagnostic: "NO_TEMPLATE",
  });
});
it("missing mapping triggers complete fallback and never a partial success", async () => {
  mock.content.mockResolvedValue([catalog()[0]]);
  await activate();
  mock.content.mockResolvedValue(catalog());
  const order = await submit();
  const row = await db.orderExport.findFirstOrThrow();
  expect(row).toMatchObject({
    kind: "SNAPSHOT",
    diagnostic: "MISSING_MAPPING",
  });
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(new Uint8Array(row.bytes!).buffer);
  expect(w.worksheets).toHaveLength(1);
  expect(w.worksheets[0].lastRow!.getCell(7).value).toBe(60.07);
  expect(mock.email.mock.calls[0][0].reference).toBe(order.reference);
});
it.each([
  "catalog",
  "price",
  "tier",
  "session",
  "expiry",
  "tamper",
  "unacknowledged",
])("rejects stale or invalid confirmation: %s", async (kind) => {
  const { preview } = await stage();
  if (kind === "catalog")
    mock.content.mockResolvedValue(
      catalog().map((p) => ({ ...p, sku: p.sku + "-CHANGED" })),
    );
  if (kind === "price")
    await db.productPrice.updateMany({
      where: { catalogKey: sheetKey },
      data: { price: "1.23" },
    });
  if (kind === "tier")
    await db.pricingTier.update({
      where: { id: tier2 },
      data: { name: "Temporary fictional tier" },
    });
  if (kind === "session")
    await db.user.update({
      where: { id: admin.id },
      data: { sessionVersion: { increment: 1 } },
    });
  if (kind === "expiry")
    await db.orderSheetDraft.update({
      where: { id: preview.draftId },
      data: { expiresAt: new Date(0) },
    });
  try {
    const call = activateOrderSheet(
      preview.draftId,
      preview.priceColumn,
      kind === "tamper" ? "wrong" : preview.token,
      kind !== "unacknowledged",
    );
    if (kind === "session") await expect(call).rejects.toThrow("redirect");
    else expect((await call).status).toBe("invalid");
    expect(await db.orderSheetVersion.count()).toBe(0);
  } finally {
    if (kind === "tier")
      await db.pricingTier.update({
        where: { id: tier2 },
        data: { name: "Tier 2" },
      });
  }
});
it("simultaneous activations produce one winner; invalid replacement retains current original", async () => {
  const a = await stage(),
    b = await stage();
  const results = await Promise.all(
    [a, b].map(({ preview: p }) =>
      activateOrderSheet(p.draftId, p.priceColumn, p.token, true),
    ),
  );
  expect(results.filter((r) => r.status === "success")).toHaveLength(1);
  const before = await db.orderSheetActive.findUniqueOrThrow({
    where: { tierId: tier2 },
  });
  const invalid = await uploadOrderSheet(
    new File(
      [new Uint8Array(await fictionalSheet({ duplicate: true }))],
      "duplicates.xlsx",
    ),
    tier2,
  );
  expect(invalid.status).toBe("invalid");
  expect(
    await db.orderSheetActive.findUniqueOrThrow({ where: { tierId: tier2 } }),
  ).toEqual(before);
  expect((await deactivateOrderSheet(tier2, before.versionId)).status).toBe(
    "success",
  );
  expect(await db.orderSheetVersion.count()).toBe(1);
});
it.each(["anonymous", "customer", "disabled", "revoked"])(
  "protects all admin services from %s",
  async (kind) => {
    const { preview } = await stage();
    const template = await activate();
    const order = await submit();
    mock.auth.mockResolvedValue({ user: admin });
    if (kind === "anonymous") mock.auth.mockResolvedValue(null);
    if (kind === "customer") mock.auth.mockResolvedValue({ user: buyer });
    if (kind === "disabled")
      await db.user.update({
        where: { id: admin.id },
        data: { active: false },
      });
    if (kind === "revoked")
      await db.user.update({
        where: { id: admin.id },
        data: { sessionVersion: { increment: 1 } },
      });
    for (const call of [
      () => listOrderSheets(),
      () => uploadOrderSheet(null, tier2),
      () => previewOrderSheet(preview.draftId, 7),
      () => activateOrderSheet(preview.draftId, 7, preview.token, true),
      () => deactivateOrderSheet(tier2, template.id),
      () => downloadOriginalTemplate(template.id),
      () => downloadOrderExport(order.reference),
      () => retryOrderExport(order.reference),
    ])
      await expect(call()).rejects.toThrow(
        kind === "customer" ? "notFound" : "redirect",
      );
  },
);
it("generation failure keeps order and text notification; retry does not resend and lease recovery is atomic", async () => {
  await activate();
  mock.generate.mockRejectedValueOnce(Error("PRIVATE_MARKER"));
  const { reference, token } = await submit();
  let row = await db.orderExport.findFirstOrThrow();
  expect(row.state).toBe("FAILED");
  expect(mock.email.mock.calls[0][0].attachment).toBeUndefined();
  expect(mock.email.mock.calls[0][0].exportNote).toContain("not ready");
  await submitOrder(token);
  expect(mock.generate).toHaveBeenCalledTimes(1);
  expect(mock.email).toHaveBeenCalledTimes(1);
  await db.orderExport.update({
    where: { orderId: row.orderId },
    data: {
      state: "GENERATING",
      claimId: "11111111-1111-4111-8111-111111111111",
      claimedAt: new Date(),
    },
  });
  mock.auth.mockResolvedValue({ user: admin });
  await retryOrderExport(reference);
  expect(mock.generate).toHaveBeenCalledTimes(1);
  await db.orderExport.update({
    where: { orderId: row.orderId },
    data: { claimedAt: new Date(Date.now() - 180000) },
  });
  await Promise.all([retryOrderExport(reference), retryOrderExport(reference)]);
  row = await db.orderExport.findFirstOrThrow();
  expect(row.state).toBe("READY");
  expect(mock.generate).toHaveBeenCalledTimes(2);
  expect(mock.email).toHaveBeenCalledTimes(1);
  expect(await getAdminOrder(reference)).toMatchObject({
    notificationStatus: "ACCEPTED",
    notificationHasAttachment: false,
  });
});
it("legacy order recovery pins explicit absence even with an active template", async () => {
  await activate();
  const { reference } = await submit();
  const order = await db.order.findUniqueOrThrow({ where: { reference } });
  await db.orderExport.delete({ where: { orderId: order.id } });
  mock.auth.mockResolvedValue({ user: admin });
  mock.content.mockRejectedValue(Error("offline"));
  await retryOrderExport(reference);
  expect(
    await db.orderExport.findUniqueOrThrow({ where: { orderId: order.id } }),
  ).toMatchObject({
    templateId: null,
    templateAbsence: "LEGACY_ORDER",
    kind: "SNAPSHOT",
    diagnostic: "LEGACY_ORDER",
  });
});
it("download GET never generates and email failure leaves the persisted artifact ready", async () => {
  mock.email.mockRejectedValue(Error("provider"));
  const { reference } = await submit();
  mock.auth.mockResolvedValue({ user: admin });
  expect(await getAdminOrder(reference)).toMatchObject({
    notificationStatus: "FAILED",
    excelExport: { state: "READY" },
  });
  const row = await db.orderExport.findFirstOrThrow();
  await db.orderExport.delete({ where: { orderId: row.orderId } });
  await expect(downloadOrderExport(reference)).rejects.toThrow("notFound");
  expect(mock.generate).toHaveBeenCalledTimes(1);
});
it("rejects unsafe uploads without drafts or versions and rechecks admin before file writes", async () => {
  for (const file of [
    new File([new Uint8Array(2097153)], "large.xlsx"),
    new File(["private marker"], "bad.xlsx"),
    new File(
      [new Uint8Array(await fictionalSheet({ unsafe: true }))],
      "unsafe.xlsx",
    ),
  ])
    expect((await uploadOrderSheet(file, tier2)).status).toBe("invalid");
  expect(await db.orderSheetDraft.count()).toBe(0);
  mock.content.mockImplementation(async () => {
    await db.user.update({ where: { id: admin.id }, data: { active: false } });
    return catalog();
  });
  expect(
    (
      await uploadOrderSheet(
        new File([new Uint8Array(await fictionalSheet())], "valid.xlsx"),
        tier2,
      )
    ).status,
  ).toBe("invalid");
  expect(await db.orderSheetDraft.count()).toBe(0);
});
it("never overwrites a ready export or its pinned template", async () => {
  await activate();
  await submit();
  const row = await db.orderExport.findFirstOrThrow();
  await expect(
    db.orderExport.update({
      where: { orderId: row.orderId },
      data: { state: "FAILED" },
    }),
  ).rejects.toThrow();
  await expect(
    db.orderSheetVersion.update({
      where: { id: row.templateId! },
      data: { filename: "changed.xlsx" },
    }),
  ).rejects.toThrow();
  await generateCommittedExport(row.orderId);
  expect(mock.generate).toHaveBeenCalledTimes(1);
});
it("supports an arbitrary configured tier name and enforces same-tier active pointers", async () => {
  const tier = await db.pricingTier.create({
    data: { name: "Fictional special terms", rank: 99 },
  });
  try {
    const { preview } = await stage(tier.id);
    expect(
      (
        await activateOrderSheet(
          preview.draftId,
          preview.priceColumn,
          preview.token,
          true,
        )
      ).status,
    ).toBe("success");
    const active = await db.orderSheetActive.findUniqueOrThrow({
      where: { tierId: tier.id },
    });
    expect(
      (await listOrderSheets()).find((t) => t.id === tier.id)?.orderSheetActive
        ?.versionId,
    ).toBe(active.versionId);
    await expect(
      db.orderSheetActive.create({
        data: { tierId: tier1, versionId: active.versionId },
      }),
    ).rejects.toThrow();
  } finally {
    await db.orderSheetActive.deleteMany({ where: { tierId: tier.id } });
    await db.orderSheetVersion.deleteMany({ where: { tierId: tier.id } });
    await db.orderSheetDraft.deleteMany({ where: { tierId: tier.id } });
    await db.pricingTier.delete({ where: { id: tier.id } });
  }
});
it("an abandoned generator cannot replace the newer claim's ready bytes", async () => {
  mock.generate.mockRejectedValueOnce(Error("interrupted"));
  const { reference } = await submit();
  const row = await db.orderExport.findFirstOrThrow();
  let release!: (
    value: Awaited<ReturnType<typeof actualWorker.generateOrderSheet>>,
  ) => void;
  let entered!: () => void;
  const started = new Promise<void>((done) => {
    entered = done;
  });
  mock.generate.mockImplementationOnce(() => {
    entered();
    return new Promise((done) => {
      release = done;
    });
  });
  mock.auth.mockResolvedValue({ user: admin });
  const abandoned = retryOrderExport(reference);
  await started;
  await db.orderExport.update({
    where: { orderId: row.orderId },
    data: { claimedAt: new Date(Date.now() - 180000) },
  });
  await retryOrderExport(reference);
  const ready = await db.orderExport.findUniqueOrThrow({
    where: { orderId: row.orderId },
  });
  expect(ready.state).toBe("READY");
  release({
    bytes: Buffer.from("not a workbook").toString("base64"),
    kind: "SNAPSHOT",
    diagnostic: "NO_TEMPLATE",
    version: "fake-old-claim",
  });
  await abandoned;
  expect(
    await db.orderExport.findUniqueOrThrow({ where: { orderId: row.orderId } }),
  ).toEqual(ready);
  expect(mock.email).toHaveBeenCalledTimes(1);
});

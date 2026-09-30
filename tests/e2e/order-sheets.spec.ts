import { expect, test, type Page } from "@playwright/test";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  fictionalSheet,
  sheetKey,
  compositeKey,
} from "../fixtures/order-sheets";
import { fictionalProduct } from "../fixtures/catalog";

test.skip(
  !process.env.TEST_CATALOG_CONTENT_FILE,
  "Requires isolated intercepted catalog.",
);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
let tierId: string, customerId: string, adminId: string;
async function login(page: Page, who: "admin" | "tier2") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${who}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env[`SEED_${who.toUpperCase()}_PASSWORD`]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(who === "admin" ? /\/admin$/ : /\/portal$/);
}
async function cleanup() {
  if (!customerId) return;
  await db.orderExport.deleteMany({ where: { order: { customerId } } });
  await db.orderItem.deleteMany({ where: { order: { customerId } } });
  await db.order.deleteMany({ where: { customerId } });
  await db.orderSheetActive.deleteMany({ where: { tierId } });
  await db.orderSheetDraft.deleteMany({ where: { uploadedById: adminId } });
  await db.orderSheetVersion.deleteMany({ where: { uploadedById: adminId } });
  await db.productPrice.deleteMany({
    where: { catalogKey: { in: [sheetKey, compositeKey] } },
  });
}
test.beforeEach(async () => {
  tierId = (
    await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } })
  ).id;
  customerId = (
    await db.customer.findFirstOrThrow({
      where: { user: { email: "tier2@example.test" } },
    })
  ).id;
  adminId = (
    await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } })
  ).id;
  await cleanup();
  await db.loginRateLimit.deleteMany();
  await db.productPrice.createMany({
    data: [
      { catalogKey: sheetKey, pricingTierId: tierId, price: "19.99" },
      { catalogKey: compositeKey, pricingTierId: tierId, price: "0.10" },
    ],
  });
  await writeFile(
    process.env.TEST_CATALOG_CONTENT_FILE!,
    JSON.stringify({
      products: [
        fictionalProduct({
          _id: "sheet-one",
          catalogKey: sheetKey,
          sku: "DEMO-ONE",
          name: "Sheet fictional first",
          image: null,
        }),
        fictionalProduct({
          _id: "sheet-last",
          catalogKey: compositeKey,
          sku: "DEMO-A,B,C",
          name: "Sheet fictional last",
          image: null,
        }),
      ],
    }),
  );
});
test.afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});
test("staff template workflow, attachment/download equality and responsive views", async ({
  page,
  browser,
}, info) => {
  await login(page, "admin");
  await page.getByRole("link", { name: "Order sheets", exact: true }).click();
  const bytes = await fictionalSheet();
  await page.getByLabel("Target pricing tier").selectOption(tierId);
  await page
    .getByLabel("Excel order-sheet template")
    .setInputFiles({
      name: "fictional.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: bytes,
    });
  await page
    .getByRole("button", { name: "Upload and validate", exact: true })
    .click();
  await expect(page.getByText("Worksheet:", { exact: false })).toBeVisible();
  await page
    .getByLabel("Effective case-price column for Tier 2")
    .selectOption("7");
  await page
    .getByRole("button", { name: "Preview selected column", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review mappings for Tier 2" }),
  ).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`sheet-preview-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Activate reviewed version", exact: true })
    .click();
  await expect(
    page.getByText("Order sheet activated for future orders.", {
      exact: false,
    }),
  ).toBeVisible();
  const version = await db.orderSheetActive.findUniqueOrThrow({
    where: { tierId },
  });
  const original = await page.request.get(
    `/admin/order-sheets/${version.versionId}/original`,
  );
  expect(original.ok()).toBe(true);
  expect(await original.body()).toEqual(bytes);
  const customerContext = await browser.newContext(),
    customer = await customerContext.newPage();
  await login(customer, "tier2");
  await customer
    .getByLabel("Cases for Sheet fictional first", { exact: true })
    .fill("3");
  await customer
    .getByLabel("Cases for Sheet fictional last", { exact: true })
    .fill("1");
  await customer
    .getByRole("button", { name: "Review order", exact: true })
    .click();
  await expect(
    customer.getByRole("heading", { name: "Review order request" }),
  ).toBeVisible();
  await customer
    .getByRole("button", { name: "Submit order request", exact: true })
    .click();
  await expect(customer).toHaveURL(/\/portal\/confirmation\/BW-/);
  const reference = customer.url().split("/").pop()!;
  const exportResponse = await page.request.get(
    `/admin/orders/${reference}/excel`,
  );
  expect(exportResponse.ok()).toBe(true);
  expect(exportResponse.headers()["cache-control"]).toBe("private, no-store");
  const exported = await exportResponse.body();
  const captures = await readdir(process.env.TEST_ACCOUNT_MAIL_DIR!);
  let captured = false;
  for (const name of captures.filter((n) => n.endsWith(".json"))) {
    const email = JSON.parse(
      await readFile(join(process.env.TEST_ACCOUNT_MAIL_DIR!, name), "utf8"),
    );
    if (email.subject?.includes(reference)) {
      expect(email.to).toEqual(["orders@example.test"]);
      expect(email.attachments).toHaveLength(1);
      expect(Buffer.from(email.attachments[0].content, "base64")).toEqual(
        exported,
      );
      expect(
        await readFile(
          join(
            process.env.TEST_ACCOUNT_MAIL_DIR!,
            name.replace(".json", "-0.xlsx"),
          ),
        ),
      ).toEqual(exported);
      captured = true;
    }
  }
  expect(captured).toBe(true);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(exported).buffer);
  expect(
    workbook.getWorksheet("Wholesale")!.getCell("H635").value,
  ).toMatchObject({ result: 60.07 });
  expect(
    (await customer.request.get(`/admin/orders/${reference}/excel`)).status(),
  ).toBe(404);
  expect(
    (
      await customer.request.get(
        `/admin/order-sheets/${version.versionId}/original`,
      )
    ).status(),
  ).toBe(404);
  const anon = await browser.newContext();
  expect(
    (
      await anon.request.get(`/admin/orders/${reference}/excel`, {
        maxRedirects: 0,
      })
    ).status(),
  ).toBe(307);
  await anon.close();
  await page.goto(`/admin/orders/${reference}`);
  await expect(
    page.getByRole("link", { name: "Download saved Excel" }),
  ).toBeVisible();
  await expect(
    page.getByText("The accepted notification included an Excel attachment."),
  ).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`sheet-order-${width}.png`),
      fullPage: true,
    });
  }
  await customerContext.close();
});
test("duplicate source reports locations and leaves active state unchanged", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin/order-sheets");
  await page.getByLabel("Target pricing tier").selectOption(tierId);
  await page
    .getByLabel("Excel order-sheet template")
    .setInputFiles({
      name: "duplicate.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: await fictionalSheet({ duplicate: true }),
    });
  await page.getByRole("button", { name: "Upload and validate" }).click();
  await expect(
    page.getByText(/rows 5, 540: duplicate normalized PRODUCT ID/),
  ).toBeVisible();
  expect(await db.orderSheetVersion.count()).toBe(0);
});

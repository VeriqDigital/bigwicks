import { afterEach, expect, it, vi } from "vitest";
import { requestedItems, quantityValue, lineTotal, sumAmounts } from "@/lib/orders/input";
import { openOrderReview, sealOrderReview } from "@/lib/orders/review-token";
import { orderEmailText, sendOrderEmail } from "@/lib/orders/email";
import { randomUUID } from "node:crypto";

const catalogKey = "f6000000-0000-4000-8000-000000000001";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it.each([-1, 1.1, NaN, Infinity, 1000, "-1", "1.2", "1e2", "01", " 2", "2 ", "+2", "NaN", "Infinity", null, {}, true])("rejects hostile quantity %s", (quantity) => {
  expect(quantityValue(quantity)).toBeNull(); expect(() => requestedItems([{ catalogKey, quantity }])).toThrow();
});
it("validates integer quantities, excludes zero and rejects empty/duplicate/malformed/excessive items", () => {
  expect(requestedItems([{ catalogKey, quantity: "999", tier: "forged", price: "0.01" }, { catalogKey: catalogKey.replace(/1$/, "2"), quantity: "" }])).toEqual([{ catalogKey, quantity: 999 }]);
  for (const value of [[], {}, [{ catalogKey, quantity: 0 }], [{ catalogKey: "bad", quantity: 1 }], [{ catalogKey, quantity: 1 }, { catalogKey, quantity: 2 }], Array(251).fill({ catalogKey, quantity: 1 })]) expect(() => requestedItems(value)).toThrow();
});
it("uses exact integer-cent multiplication and totals through maximum supported order size", () => {
  expect(lineTotal("19.99", 3)).toBe("59.97");
  expect(sumAmounts(["0.10", "0.20"])).toBe("0.30");
  expect(sumAmounts(Array(250).fill(lineTotal("9999999999.99", 999)))).toBe("2497499999997502.50");
});
it("seals review identity/intent and rejects token tampering, customer and session changes", () => {
  vi.stubEnv("AUTH_SECRET", "fictional-order-test-secret".repeat(3));
  const user = { id: "user", sessionVersion: 1, customer: { id: "customer" } };
  const payload = { userId: user.id, customerId: user.customer.id, sessionVersion: 1, submissionId: randomUUID(), hash: "a".repeat(64), expiresAt: Date.now() + 900000, items: [{ catalogKey, quantity: 3 }] };
  const token = sealOrderReview(payload);
  expect(openOrderReview(token, user)).toEqual(payload);
  expect(Buffer.from(token, "base64url").toString()).not.toContain(catalogKey);
  for (const changed of [{ ...user, id: "other" }, { ...user, sessionVersion: 2 }, { ...user, customer: { id: "other" } }]) expect(() => openOrderReview(token, changed)).toThrow();
  expect(() => openOrderReview(token.slice(0, -10) + "AAAAAAAAAA", user)).toThrow();
  expect(() => openOrderReview("x".repeat(48001), user)).toThrow();
});
const order = { reference: "BW-0123456789ABCDEF0123", companyName: "Fictional <script>\nTotal: 0", customerNumber: "FIXTURE", email: "customer@example.test", createdAt: "2026-09-06T12:00:00.000Z", total: "59.97", items: [{ catalogKey, sku: "TEST\nFORGED", name: "<b>Fictional product</b>", quantity: 3, unitPrice: "19.99", lineTotal: "59.97" }] };
it("formats safe plain-text snapshot email and uses only configured staff recipient and sender", async () => {
  vi.stubEnv("RESEND_API_KEY", "fictional"); vi.stubEnv("ACCOUNT_FROM_EMAIL", "Tests <sender@example.test>"); vi.stubEnv("ORDER_TO_EMAIL", "staff@example.test");
  const fetch = vi.fn().mockResolvedValue(Response.json({ id: "fictional" })); vi.stubGlobal("fetch", fetch);
  await sendOrderEmail(order);
  const options = fetch.mock.calls[0][1]; const body = JSON.parse(options.body);
  expect(body.to).toEqual(["staff@example.test"]); expect(body).not.toHaveProperty("html");
  expect(body.text).toContain("Quantity: 3 | Price: 19.99 | Line total: 59.97");
  expect(orderEmailText(order)).not.toContain("\nFORGED"); expect(orderEmailText(order)).not.toContain("\nTotal: 0");
  expect(options.headers["Idempotency-Key"]).toBe(`big-wicks-order-${order.reference}`);
  vi.stubEnv("ORDER_TO_EMAIL", ""); await expect(sendOrderEmail(order)).rejects.toThrow("configured"); expect(fetch).toHaveBeenCalledTimes(1);
});

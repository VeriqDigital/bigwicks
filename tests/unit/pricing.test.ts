import { afterEach, expect, it, vi } from "vitest";
import { parsePricingCsv, csvHeaders, exportPricingCsv, MAX_CSV_BYTES, spreadsheetText } from "@/lib/pricing/csv";
import { pricingSnapshot, planImport } from "@/lib/pricing/plan";
import { sealPreview, openPreview } from "@/lib/pricing/preview-token";
import { fictionalProduct, catalogKeys } from "../fixtures/catalog";

const csv = (price = "12.34", key = catalogKeys.one) => `${csvHeaders.join(",")}\r\n${key},TEST-ONLY-001,Fictional test product one,Fictional category,true,${price},\r\n`;
const parse = (text: string) => parsePricingCsv(new TextEncoder().encode(text));
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
it("parses UTF-8/BOM/CRLF, exact decimals, blank removal and reordered headers", () => {
  expect(parse("\uFEFF" + csv()).rows[0]).toMatchObject({ catalogKey: catalogKeys.one, tier1Price: "12.34", tier2Price: null });
  const lines = csv().trim().split("\r\n").map((line) => line.split(",").reverse().join(","));
  expect(parse(lines.join("\n")).rows[0].tier1Price).toBe("12.34");
  expect(parse(csv("0")).rows[0].tier1Price).toBe("0.00");
  expect(parse(csv("  ")).rows[0].tier1Price).toBeNull();
});
it.each(["-1", "NaN", "Infinity", "1e2", "$12", '"1,234.50"', "1.234", "10000000000", "1.2.3", "+2", "=1+1"])("rejects invalid decimal %s", (price) => {
  expect(parse(csv(price)).errors).toEqual(expect.arrayContaining([expect.objectContaining({ row: 2, message: expect.stringContaining("tier1Price") })]));
});
it.each(["", "wrong", csv().replace("tier2Price", "tier1Price"), csv().replace("catalogKey,", "other,"), csv().replace("12.34,", '"unterminated,')])("rejects empty, malformed and duplicate headers/quotes", (text) => {
  expect(() => parse(text)).toThrow();
});
it("rejects invalid keys and duplicate rows including UUID case aliases", () => {
  expect(parse(csv("1", "bad")).errors[0].message).toContain("UUID");
  expect(parse(csv() + csv("2", catalogKeys.one.toUpperCase()).split("\r\n")[1]).errors).toEqual(expect.arrayContaining([expect.objectContaining({ message: "Duplicate catalogKey in the upload." })]));
});
it("bounds upload bytes, row count, record size and rejects invalid UTF-8/NUL", () => {
  expect(() => parsePricingCsv(new Uint8Array(MAX_CSV_BYTES + 1))).toThrow("256 KiB");
  expect(() => parsePricingCsv(Uint8Array.from([0xc3, 0x28]))).toThrow("UTF-8");
  expect(() => parse(csv() + "\0")).toThrow("invalid text");
  expect(() => parse(csv().split("\r\n")[0] + "\n" + (csv().split("\r\n")[1] + "\n").repeat(501))).toThrow("500");
  expect(() => parse(csv().replace("Fictional category", "a".repeat(5000)))).toThrow("4,096");
});
it.each(["=SUM(A1)", "+1", "-1", "@cmd", " \t=cmd", "\r=cmd", "＝cmd", "'literal"])("neutralizes exported spreadsheet context %s", (value) => {
  expect(spreadsheetText(value)).toBe("'" + value);
});
it("round trips commas, quotes, multiline text and prices without interpreting formulas", () => {
  const output = exportPricingCsv([{ catalogKey: catalogKeys.one, sku: '=CMD("a,b")', name: 'Fictional, "quoted"\nname', category: "@test", available: false, tier1Price: "9999999999.99", tier2Price: "0.00" }]);
  const row = parse(output).rows[0];
  expect(row).toMatchObject({ sku: '\'=CMD("a,b")', productName: 'Fictional, "quoted"\nname', tier1Price: "9999999999.99", tier2Price: "0.00" });
});
it("plans by key, warns about context/hidden products, and counts creates/updates/removals/unchanged", () => {
  const snapshot = pricingSnapshot([fictionalProduct({ available: false })], [{ catalogKey: catalogKeys.one, pricingTierId: "t1", price: "19.95", updatedAt: new Date(0) }], [{ id: "t1", name: "Tier 1" }, { id: "t2", name: "Tier 2" }]);
  const plan = planImport([{ catalogKey: catalogKeys.one, sku: "edited", productName: "edited", tier1Price: null, tier2Price: "9.00" }], snapshot);
  expect(plan.summary).toMatchObject({ tier1: { remove: 1 }, tier2: { create: 1 } });
  expect(plan.warnings).toHaveLength(3);
  expect(snapshot.counts).toEqual({ total: 1, available: 0, fullyPriced: 0, missingTier1: 0, missingTier2: 1 });
  expect(planImport([{ ...parse(csv()).rows[0], catalogKey: catalogKeys.orphan }], snapshot).errors[0].message).toContain("unambiguous");
});
it("blocks duplicate/invalid Sanity identities and unsupported tiers", () => {
  const tiers = [{ id: "t1", name: "Tier 1" }, { id: "t2", name: "Tier 2" }];
  expect(pricingSnapshot([fictionalProduct(), fictionalProduct({ _id: "duplicate" })], [], tiers).blocked).toBe(true);
  expect(pricingSnapshot([fictionalProduct({ catalogKey: "bad" })], [], tiers).blocked).toBe(true);
  expect(pricingSnapshot([fictionalProduct()], [], [...tiers, { id: "t3", name: "Tier 3" }]).blocked).toBe(true);
});
it("encrypts preview prices and rejects tampering, expiry, another admin and changed session", () => {
  vi.stubEnv("AUTH_SECRET", "fictional-preview-secret-".repeat(3));
  const admin = { id: "admin1", sessionVersion: 1 };
  const token = sealPreview({ adminId: admin.id, sessionVersion: 1, expiresAt: Date.now() + 600000, snapshot: "a".repeat(64), rows: [{ catalogKey: catalogKeys.one, tier1Price: "12345.67", tier2Price: null }] });
  expect(Buffer.from(token, "base64url").toString()).not.toContain("12345.67");
  expect(openPreview(token, admin).rows[0].tier1Price).toBe("12345.67");
  expect(() => openPreview("A" + token.slice(1, -3) + "AAA", admin)).toThrow("invalid or expired");
  expect(() => openPreview(token, { ...admin, id: "other" })).toThrow();
  expect(() => openPreview(token, { ...admin, sessionVersion: 2 })).toThrow();
  vi.useFakeTimers(); vi.setSystemTime(Date.now() + 600001);
  expect(() => openPreview(token, admin)).toThrow();
});

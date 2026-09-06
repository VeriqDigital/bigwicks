import "server-only";
import { Prisma } from "@/generated/prisma/client";

// Return decimal text across the server/UI boundary. Never coerce currency to
// Number. Future price imports must validate scale before PostgreSQL can round it.
export function priceText(value: unknown): string | null {
  try {
    if (!Prisma.Decimal.isDecimal(value) && typeof value !== "string") return null;
    if (typeof value === "string" && !/^\d{1,10}(\.\d{1,2})?$/.test(value)) return null;
    const price = new Prisma.Decimal(value);
    return price.isFinite() && price.gte(0) && price.lte("9999999999.99") && price.decimalPlaces() <= 2 ? price.toFixed(2) : null;
  } catch { return null; }
}

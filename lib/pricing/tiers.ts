// Pure column metadata; authoritative tier records are always resolved server-side.
export type TierColumn = { rank: number; name: string };
export type PricingTier = TierColumn & { id: string };
export const priceColumn = (tier: TierColumn) => `price:${tier.rank}:${tier.name}`;
export function validTier(tier: TierColumn) {
  return Number.isSafeInteger(tier.rank) && tier.rank > 0 && tier.rank <= 2147483647 &&
    typeof tier.name === "string" && tier.name.trim() === tier.name && tier.name.length > 0 && tier.name.length <= 100 && !/[\u0000-\u001f\u007f-\u009f]/u.test(tier.name);
}
export function validTiers(tiers: TierColumn[]) {
  return tiers.length > 0 && tiers.every(validTier) && new Set(tiers.map((t) => t.rank)).size === tiers.length && new Set(tiers.map((t) => t.name)).size === tiers.length;
}
export const orderedTiers = <T extends TierColumn>(tiers: T[]) => [...tiers].sort((a, b) => a.rank - b.rank);
// Offline operators may describe columns, but this never configures database tiers.
export function tierColumns(headers: string[]): TierColumn[] {
  const tiers = headers.filter((h) => h.startsWith("price:")).map((header) => {
    const match = /^price:([1-9]\d*):(.+)$/.exec(header);
    return { rank: match ? Number(match[1]) : 0, name: match?.[2] ?? "" };
  });
  if (!validTiers(tiers)) throw new Error("Invalid or duplicate pricing tier columns.");
  return orderedTiers(tiers);
}

import "server-only";
import { normalizeCatalogContent } from "@/lib/catalog/normalize";
import { priceText } from "@/lib/catalog/money";
import { normalizeId } from "./runtime/limits.mjs";
import type { Inspection, MappingPreview } from "./types";

export function mapSheet(
  inspection: Inspection,
  raw: unknown,
  prices: { catalogKey: string; price: unknown }[],
  priceColumn: number,
): MappingPreview {
  const content = normalizeCatalogContent(raw);
  const groups = new Map<string, typeof content.products>();
  for (const p of content.products) {
    const id = normalizeId(p.sku);
    groups.set(id, [...(groups.get(id) ?? []), p]);
  }
  const templateGroups = new Map<string, typeof inspection.products>();
  for (const p of inspection.products) {
    const id = normalizeId(p.id);
    templateGroups.set(id, [...(templateGroups.get(id) ?? []), p]);
  }
  const mapping: Record<string, number> = {};
  const unmatchedRows: MappingPreview["unmatchedRows"] = [],
    discrepancies: MappingPreview["discrepancies"] = [];
  for (const p of inspection.products) {
    const matches = groups.get(normalizeId(p.id));
    if (
      matches?.length === 1 &&
      templateGroups.get(normalizeId(p.id))?.length === 1
    ) {
      const product = matches[0];
      mapping[product.catalogKey] = p.row;
      const source = p.prices[String(priceColumn)] ?? null,
        website = priceText(
          prices.find((v) => v.catalogKey === product.catalogKey)?.price,
        );
      if (source === null || source !== website)
        discrepancies.push({ row: p.row, sku: product.sku, source, website });
    } else {
      unmatchedRows.push({ row: p.row, id: p.id });
      if (p.prices[String(priceColumn)] === null)
        discrepancies.push({
          row: p.row,
          sku: p.id,
          source: null,
          website: null,
        });
    }
  }
  return {
    mapping,
    unmatchedRows,
    missingProducts: content.products
      .filter((p) => !mapping[p.catalogKey])
      .map((p) => ({ catalogKey: p.catalogKey, sku: p.sku })),
    ambiguousSkus: [...groups]
      .filter(([, p]) => p.length > 1)
      .map(([sku]) => sku),
    discrepancies,
  };
}

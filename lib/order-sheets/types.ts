export type SheetColumns = {
  quantity: number;
  id: number;
  name: number;
  packing: number;
  total: number;
  weight?: number;
};
export type SheetProduct = {
  row: number;
  id: string;
  prices: Record<string, string | null>;
};
export type Inspection = {
  version: string;
  worksheet: string;
  headerRow: number;
  columns: SheetColumns;
  priceColumns: { column: number; label: string }[];
  products: SheetProduct[];
  footer: {
    subtotal: string;
    total: string | null;
    adjustments: string[];
    weights: string[];
    caseCounts: string[];
    inputs: string[];
  };
  errors: string[];
  warnings: string[];
};
export type Configuration = Inspection & {
  priceColumn: number;
  mapping: Record<string, number>;
};
export type SavedSheetOrder = {
  reference: string;
  createdAt: string;
  companyName: string;
  customerNumber: string | null;
  email: string;
  tierName: string;
  total: string;
  items: {
    catalogKey: string;
    sku: string;
    name: string;
    brand: string | null;
    packing: string | null;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }[];
};
export type Generation = {
  bytes: string;
  kind: "TEMPLATE" | "SNAPSHOT";
  diagnostic: string | null;
  version: string;
};
export type MappingPreview = {
  mapping: Record<string, number>;
  unmatchedRows: { row: number; id: string }[];
  missingProducts: { catalogKey: string; sku: string }[];
  ambiguousSkus: string[];
  discrepancies: {
    row: number;
    sku: string;
    source: string | null;
    website: string | null;
  }[];
};
export type SheetState = {
  status: "idle" | "invalid" | "uploaded" | "preview" | "success";
  message?: string;
  draftId?: string;
  inspection?: Inspection;
  preview?: MappingPreview;
  token?: string;
  priceColumn?: number;
  tierName?: string;
};

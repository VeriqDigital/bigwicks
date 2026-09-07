export type OrderLine = { catalogKey: string; sku: string; name: string; brand: string | null; packing: string | null; quantity: number; unitPrice: string; lineTotal: string };
export type OrderReview = { items: OrderLine[]; total: string; token: string };
export type OrderState =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | { status: "review"; review: OrderReview; message?: string }
  | { status: "submitted"; reference: string };
export type OrderReceipt = { reference: string; createdAt: string; companyName: string; items: OrderLine[]; total: string };

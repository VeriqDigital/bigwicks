import "server-only";
import { z } from "zod";
import type { OrderReceipt } from "./types";

export type StaffOrderEmail = OrderReceipt & { email: string; customerNumber: string | null };
// Plain text prevents HTML injection. Collapse embedded controls/newlines in
// individual content fields so text cannot impersonate additional order lines.
const field = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, " ");
export function orderEmailText(order: StaffOrderEmail) {
  return ["Big Wicks website wholesale order submission", "", `Reference: ${order.reference}`,
    `Company: ${field(order.companyName)}`, ...(order.customerNumber ? [`Customer number: ${field(order.customerNumber)}`] : []),
    `Login email: ${field(order.email)}`, `Submitted (UTC): ${order.createdAt}`, "",
    ...order.items.map((item) => `${field(item.sku)} | ${field(item.name)} | Quantity: ${item.quantity} | Price: ${item.unitPrice} | Line total: ${item.lineTotal}`),
    "", `Submitted total: ${order.total}`, "",
    "Order request for staff review. Availability and finalization are handled by Big Wicks; payment is handled separately.",
  ].join("\n");
}
export async function sendOrderEmail(order: StaffOrderEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ACCOUNT_FROM_EMAIL?.trim();
  const to = process.env.ORDER_TO_EMAIL?.trim();
  if (!apiKey || !from || /[\r\n]/.test(from) || !z.email().safeParse(to).success) throw new Error("Order email is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `big-wicks-order-${order.reference}` },
    body: JSON.stringify({ from, to: [to], subject: `Wholesale order request ${order.reference}`, text: orderEmailText(order) }),
  });
  if (!response.ok) throw new Error("Order notification was not accepted.");
}

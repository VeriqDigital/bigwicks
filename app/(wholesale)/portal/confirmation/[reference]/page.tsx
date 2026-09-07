import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth/authorization";
import { getCustomerConfirmation } from "@/lib/orders/reads";
import OrderSnapshot from "@/components/orders/OrderSnapshot";

export const metadata: Metadata = { title: "Order request submitted", description: "Wholesale order request confirmation.", robots: { index: false, follow: false } };
export default async function ConfirmationPage({ params }: { params: Promise<{ reference: string }> }) {
  await requireCustomer();
  const order = await getCustomerConfirmation((await params).reference);
  return <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
    <h1 className="font-heading text-4xl font-bold">Order request submitted</h1>
    <p role="status" className="mt-4">Your order request has been saved. Big Wicks will review availability and finalize the order with you. Payment is handled separately.</p>
    <dl className="mt-6 space-y-2"><div><dt className="text-sm text-(--muted)">Order reference</dt><dd className="wrap-anywhere font-semibold" data-testid="order-reference">{order.reference}</dd></div>
      <div><dt className="text-sm text-(--muted)">Submitted (UTC)</dt><dd><time dateTime={order.createdAt}>{order.createdAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}</time></dd></div></dl>
    <h2 className="mt-7 font-heading text-2xl font-bold">Submitted products</h2>
    <OrderSnapshot items={order.items} total={order.total} />
    <a href="/portal" className="mt-8 inline-flex min-h-12 items-center rounded-sm border border-current px-5 font-semibold">Return to catalog</a>
  </div>;
}

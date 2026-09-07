import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminOrder } from "@/lib/orders/reads";
import OrderSnapshot from "@/components/orders/OrderSnapshot";

export const metadata: Metadata = { title: "Order submission", description: "Submitted wholesale order snapshot.", robots: { index: false, follow: false } };
export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  await requireAdmin();
  const order = await getAdminOrder((await params).reference);
  return <>
    <Link href="/admin/orders" className="mb-5 inline-flex min-h-11 items-center underline">Back to orders</Link>
    <h1 className="wrap-anywhere font-heading text-3xl font-bold">Order {order.reference}</h1>
    <dl className="mt-5 space-y-3">
      {[["Company", order.companyName], ["Customer number", order.customerNumber ?? "Not supplied"], ["Login email", order.email], ["Pricing tier at submission", order.tierName], ["Submitted (UTC)", order.createdAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")], ["Email notification", order.notificationStatus.toLowerCase()]].map(([label, value]) => <div key={label}><dt className="text-sm text-(--muted)">{label}</dt><dd className="wrap-anywhere">{value}</dd></div>)}
    </dl>
    <p className="mt-4 text-sm">{order.notificationAcceptedAt ? `Email accepted by provider at ${order.notificationAcceptedAt}. Inbox delivery is not confirmed.` : "Notification needs follow-up. Use this saved request to hand off the order; do not ask the customer to submit it again."}</p>
    <h2 className="mt-7 font-heading text-2xl font-bold">Submitted products</h2>
    <OrderSnapshot items={order.items} total={order.total} />
    <p className="mt-6 text-sm text-(--muted)">These are the original submitted values. Availability review, final pricing, payment and fulfillment take place outside the website.</p>
  </>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminOrders } from "@/lib/orders/reads";

export const metadata: Metadata = { title: "Submitted orders", description: "Wholesale order submissions.", robots: { index: false, follow: false } };
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  await requireAdmin();
  const result = await getAdminOrders((await searchParams).cursor);
  return <>
    <h1 className="font-heading text-4xl font-bold">Submitted orders</h1>
    <p className="mt-3 text-(--muted)">Website order requests, newest first. Review and finalization take place outside the website.</p>
    <p className="mt-3 text-sm">Email accepted means the provider accepted the notification, not confirmed inbox delivery. Pending or failed notifications need staff follow-up using the saved order.</p>
    {!result.orders.length ? <p className="mt-6">No submitted orders.</p> : <ul className="mt-6 divide-y divide-(--border) border-y border-(--border)">
      {result.orders.map((order) => <li key={order.reference} className="py-5">
        <Link href={`/admin/orders/${order.reference}`} className="inline-flex min-h-11 items-center wrap-anywhere font-semibold underline underline-offset-4">{order.reference}</Link>
        <p className="wrap-anywhere">{order.companyName}</p><p className="mt-1 text-sm text-(--muted)">{order.createdAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}</p>
        <p className="mt-2 tabular-nums">Total: {order.total} · Email: {order.notificationStatus.toLowerCase()}</p>
      </li>)}
    </ul>}
    <nav aria-label="Order pages" className="mt-5 flex gap-6"><Link href="/admin/orders" className="inline-flex min-h-11 items-center underline">Newest orders</Link>{result.nextCursor && <Link href={`/admin/orders?cursor=${result.nextCursor}`} className="inline-flex min-h-11 items-center underline">Older orders</Link>}</nav>
  </>;
}

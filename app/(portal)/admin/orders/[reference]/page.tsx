import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminOrder } from "@/lib/orders/reads";
import OrderSnapshot from "@/components/orders/OrderSnapshot";
import ExportForm from "./export-form";
import { exportRecoveryMessage } from "@/lib/order-sheets/metadata";

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
    {order.notificationStatus === "ACCEPTED" && <p className="mt-2 text-sm">{order.notificationHasAttachment ? "The accepted notification included an Excel attachment." : "The accepted notification had no Excel attachment. Export recovery does not resend that email."}</p>}
    <section className="my-6 border border-(--border) bg-white p-5" aria-labelledby="excel-title"><h2 id="excel-title" className="font-heading text-2xl font-bold">Staff Excel export</h2>
      <p className="mt-3">{order.excelExport?.state === "READY" ? order.excelExport.kind === "TEMPLATE" ? "Ready: populated template and submitted snapshot." : `Ready: complete snapshot fallback (${order.excelExport.diagnostic}).` : order.excelExport ? `Export ${order.excelExport.state.toLowerCase()}. ${order.excelExport.diagnostic ?? ""}` : "Historical order: no template was pinned. Generate a complete snapshot fallback."}</p>
      {order.excelExport?.templateId && <a className="mt-2 flex min-h-11 w-fit items-center text-sm underline" href={`/admin/order-sheets/${order.excelExport.templateId}/original`}>Download the original template pinned to this order</a>}
      {order.excelExport?.state === "READY" ? <a className="mt-3 inline-flex min-h-12 items-center rounded-sm border border-current px-5 font-semibold" href={`/admin/orders/${order.reference}/excel`}>Download saved Excel</a> : <><p className="mt-2 text-sm">{exportRecoveryMessage(order.excelExport)} Generating does not resend email.</p><ExportForm reference={order.reference}/></>}
    </section>
    <h2 className="mt-7 font-heading text-2xl font-bold">Submitted products</h2>
    <OrderSnapshot items={order.items} total={order.total} />
    <p className="mt-6 text-sm text-(--muted)">These are the original submitted values. Availability review, final pricing, payment and fulfillment take place outside the website.</p>
  </>;
}

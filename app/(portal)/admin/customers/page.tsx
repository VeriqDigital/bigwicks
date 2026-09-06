import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers } from "@/lib/admin/customers";

export const metadata: Metadata = { title: "Customers", description: "Wholesale customer account management." };

export default async function CustomersPage() {
  const customers = await listCustomers();
  return <>
    <Link href="/admin" className="underline">Administration</Link>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-heading text-4xl font-bold">Customers</h1>
      <Link href="/admin/customers/new" className="rounded bg-[var(--red)] px-5 py-3 font-semibold text-white hover:bg-[var(--red-hover)]">Create customer</Link>
    </div>
    <p className="mt-3 text-[var(--muted)]">Manage wholesale account details, pricing tiers, and access.</p>
    {customers.length === 0 ? <p className="mt-8">No wholesale customers yet.</p> : <div className="mt-7 overflow-x-auto rounded border border-[var(--border)] bg-white" tabIndex={0} role="region" aria-label="Customer accounts">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Wholesale customer accounts. Open a company name to edit.</caption>
        <thead className="border-b border-[var(--border)] bg-[var(--background)]"><tr>
          {["Company / login email", "Customer number", "Pricing tier", "Status"].map((label) => <th key={label} scope="col" className="p-4 font-semibold">{label}</th>)}
        </tr></thead>
        <tbody>{customers.map((customer) => <tr key={customer.id} className="border-b border-[var(--border)] last:border-0">
          <th scope="row" className="max-w-xs p-4 font-normal">
            <Link href={`/admin/customers/${customer.id}`} className="break-words font-semibold underline">{customer.companyName}</Link>
            <div className="mt-1 break-all text-[var(--muted)]">{customer.email}</div>
          </th>
          <td className="max-w-40 break-words p-4">{customer.customerNumber || "—"}</td>
          <td className="whitespace-nowrap p-4">{customer.pricingTierName}</td>
          <td className="p-4">{customer.active ? "Active" : "Disabled"}
            {!customer.passwordSet && <div className="mt-1 text-[var(--muted)]">Password not set</div>}
            {customer.statusMismatch && <div className="mt-1 text-[var(--muted)]">Access flags need review</div>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>}
  </>;
}

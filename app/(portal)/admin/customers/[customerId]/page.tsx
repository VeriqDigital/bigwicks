import type { Metadata } from "next";
import { getCustomer, listCustomerTiers } from "@/lib/admin/customers";
import CustomerForm from "../customer-form";
import StatusForm from "../status-form";

export const metadata: Metadata = { title: "Edit customer", description: "Manage a wholesale customer account." };

export default async function EditCustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const [customer, tiers] = await Promise.all([getCustomer(customerId), listCustomerTiers()]);
  return <>
    <h1 className="font-heading text-4xl font-bold">Edit customer</h1>
    <p className="mt-3 break-words">{customer.companyName}</p>
    <CustomerForm key={customer.id} customer={customer} tiers={tiers} />
    <section className="mt-12 max-w-xl border-t border-[var(--border)] pt-6" aria-labelledby="access-heading">
      <h2 id="access-heading" className="font-heading text-2xl font-bold">Account access</h2>
      <p className="mt-3">Status: <strong>{customer.active ? "Active" : "Disabled"}</strong></p>
      {!customer.passwordSet && <p className="mt-2">Password not set. This account cannot sign in yet. No invitation has been sent.</p>}
      {customer.statusMismatch && <p className="mt-2">Access is blocked because the account flags differ. Use the access control below to set a consistent status.</p>}
      <StatusForm customerId={customer.id} active={customer.active} />
    </section>
  </>;
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createCustomer, editCustomer } from "./actions";
import type { CustomerField, CustomerFormState } from "./form-state";

type Values = { id: string; companyName: string; email: string; customerNumber: string; pricingTierId: string };

export default function CustomerForm({ customer, tiers }: {
  customer?: Values; tiers: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(customer ? editCustomer : createCustomer, {});
  const inputClass = "mt-2 min-h-12 w-full rounded border border-[var(--border)] bg-white px-3";
  const value = (field: keyof Omit<Values, "id">) => state.values?.[field] ?? customer?.[field] ?? "";
  const errors = (field: CustomerField) => state.errors?.[field] && <p id={`${field}-error`} className="mt-1 text-sm text-[var(--red-hover)]">{state.errors[field]?.join(" ")}</p>;
  return <form action={action} className="mt-8 max-w-xl space-y-5">
    {customer && <input type="hidden" name="customerId" value={customer.id} />}
    <div>
      <label htmlFor="companyName" className="font-semibold">Company name</label>
      <input id="companyName" name="companyName" required maxLength={200} defaultValue={value("companyName")} className={inputClass} aria-invalid={!!state.errors?.companyName} aria-describedby={state.errors?.companyName ? "companyName-error" : undefined} />
      {errors("companyName")}
    </div>
    <div>
      <label htmlFor="email" className="font-semibold">Login email</label>
      <input id="email" name="email" type="email" required maxLength={254} autoComplete="off" defaultValue={value("email")} className={inputClass} aria-invalid={!!state.errors?.email} aria-describedby={state.errors?.email ? "email-help email-error" : "email-help"} />
      <p id="email-help" className="mt-1 text-sm text-[var(--muted)]">Changing the login email signs this customer out of all sessions.</p>
      {errors("email")}
    </div>
    <div>
      <label htmlFor="customerNumber" className="font-semibold">Customer number (optional)</label>
      <input id="customerNumber" name="customerNumber" maxLength={100} defaultValue={value("customerNumber")} className={inputClass} aria-invalid={!!state.errors?.customerNumber} aria-describedby={state.errors?.customerNumber ? "customerNumber-error" : undefined} />
      {errors("customerNumber")}
    </div>
    <div>
      <label htmlFor="pricingTierId" className="font-semibold">Pricing tier</label>
      <select key={value("pricingTierId")} id="pricingTierId" name="pricingTierId" required defaultValue={value("pricingTierId")} className={inputClass} aria-invalid={!!state.errors?.pricingTierId} aria-describedby={state.errors?.pricingTierId ? "pricingTierId-error" : undefined}>
        <option value="" disabled>Select a tier</option>
        {tiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
      </select>
      {errors("pricingTierId")}
      {tiers.length === 0 && <p className="mt-2">No pricing tiers are configured. Customer changes require Tier 1 or Tier 2.</p>}
    </div>
    {!customer && <div>
      <label htmlFor="status" className="font-semibold">Account status</label>
      <select key={state.values?.status ?? "disabled"} id="status" name="status" defaultValue={state.values?.status ?? "disabled"} className={inputClass} aria-invalid={!!state.errors?.status}>
        <option value="disabled">Disabled</option><option value="active">Active</option>
      </select>
      {errors("status")}
      <p className="mt-2 text-sm text-[var(--muted)]">New accounts cannot sign in until they set a password. After saving, send a setup link from the customer page.</p>
    </div>}
    <p role="status" aria-live="polite" className={state.success ? "" : "text-[var(--red-hover)]"}>{state.message}</p>
    <div className="flex flex-wrap items-center gap-5">
      <button disabled={pending || tiers.length === 0} className="min-h-12 rounded bg-[var(--red)] px-6 font-semibold text-white hover:bg-[var(--red-hover)] disabled:opacity-60">{pending ? "Saving…" : customer ? "Save customer" : "Create customer"}</button>
      <Link href="/admin/customers" className="py-3 underline">Back to customers</Link>
    </div>
  </form>;
}

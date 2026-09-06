"use client";

import { useActionState } from "react";
import { setCustomerStatus } from "./actions";
import type { CustomerFormState } from "./form-state";

export default function StatusForm({ customerId, active }: { customerId: string; active: boolean }) {
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(setCustomerStatus, {});
  return <form action={action} className="mt-4">
    <input type="hidden" name="customerId" value={customerId} />
    <input type="hidden" name="status" value={active ? "disabled" : "active"} />
    <p className="mb-3 text-sm text-[var(--muted)]">Changing account access also invalidates outstanding setup and reset links.</p>
    <p className="mb-4 text-sm text-[var(--muted)]">{active ? "Disabling blocks sign-in and immediately revokes existing sessions." : "Enabling allows sign-in only if a password has been set. Previous sessions remain revoked."}</p>
    <button disabled={pending} className="min-h-12 rounded border border-current px-5 font-semibold disabled:opacity-60">{pending ? "Updating…" : active ? "Disable account" : "Enable account"}</button>
    <p role="status" aria-live="polite" className="mt-3">{state.message}</p>
  </form>;
}

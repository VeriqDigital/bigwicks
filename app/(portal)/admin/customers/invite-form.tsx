"use client";

import { useActionState } from "react";
import { sendSetupLink } from "./invite-action";

export default function InviteForm({ customerId, pendingSetup }: { customerId: string; pendingSetup: boolean }) {
  const [state, action, pending] = useActionState(sendSetupLink, {});
  return <form action={action} className="mt-5 space-y-3">
    <input type="hidden" name="customerId" value={customerId} />
    <p>{pendingSetup ? "Setup pending. A current setup email was accepted for delivery; the link expires 24 hours after issue." : "No current setup link is available. Send a new link to the customer's login email."}</p>
    <button disabled={pending} className="min-h-12 rounded border border-current px-5 font-semibold disabled:opacity-60">{pending ? "Sending…" : pendingSetup ? "Resend setup link" : "Send account setup link"}</button>
    <p role="status" aria-live="polite">{state.message}</p>
  </form>;
}

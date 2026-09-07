"use client";
import { useActionState } from "react";
import Link from "next/link";
import { previewInvitations, confirmInvitations } from "./actions";
type Preview = Extract<Awaited<ReturnType<typeof previewInvitations>>, { status: "preview" }>;
const button = "min-h-12 rounded bg-(--red) px-5 py-3 font-semibold text-white disabled:opacity-50";
function Confirm({ stage }: { stage: Preview }) {
  const [state, action, pending] = useActionState(confirmInvitations, null);
  if (state) return <section className="mt-6"><p role="status">{state.message}</p>{state.status === "success" && <ul className="mt-4 space-y-3">{state.results.map((r) => <li key={r.id} className="wrap-anywhere">{r.companyName} — {r.email}: {r.accepted ? "Accepted for delivery" : "Not confirmed; refresh and retry"}</li>)}</ul>}
    <Link className="mt-5 inline-block underline" href="/admin/customers">Return to customer management</Link></section>;
  return <section className="mt-6" aria-labelledby="invite-review"><h2 id="invite-review" className="font-heading text-2xl font-bold">Review invitation recipients</h2>
    <ul className="my-4 space-y-3">{stage.rows.map((r) => <li key={r.id} className="wrap-anywhere">{r.companyName} · {r.customerNumber || "No customer number"} · {r.email}</li>)}</ul>
    <p className="text-sm">{stage.rows.length} recipients. Preview expires in 10 minutes. Acceptance by the email provider does not guarantee inbox delivery.</p>
    <form action={action} className="mt-4 space-y-4"><input name="previewToken" type="hidden" value={stage.token} />
      <label className="flex min-h-12 items-center gap-3"><input name="confirmed" type="checkbox" required className="size-5" />Send setup invitations to these recipients.</label>
      <button className={button} disabled={pending}>{pending ? "Sending invitations…" : "Confirm and send invitations"}</button>
    </form></section>;
}
export default function InvitationForm({ rows }: { rows: Preview["rows"] }) {
  const [state, action, pending] = useActionState(previewInvitations, null);
  return <>
    <form action={action} className="mt-6 space-y-4"><fieldset disabled={pending}>
      <legend className="font-semibold">Eligible customers</legend>
      {!rows.length && <p className="mt-4">No active customers need password setup.</p>}
      <div className="mt-3 max-h-[32rem] overflow-y-auto">{rows.map((r) => <label key={r.id} className="flex min-h-12 items-start gap-3 border-b border-(--border) py-4">
        <input type="checkbox" name="customerId" value={r.id} className="mt-1 size-5 shrink-0" />
        <span className="min-w-0 wrap-anywhere"><strong>{r.companyName}</strong> · {r.customerNumber || "No customer number"}<br />{r.email}<br /><span className="text-sm">{r.pending ? "Current setup link accepted; resend replaces it" : "No current accepted setup link"}</span></span>
      </label>)}</div>
    </fieldset><button className={button} disabled={pending || !rows.length}>{pending ? "Preparing review…" : "Review selected invitations"}</button></form>
    {state?.status === "invalid" && <p role="status" className="mt-4">{state.message}</p>}
    {state?.status === "preview" && !pending && <Confirm key={state.token} stage={state} />}
  </>;
}

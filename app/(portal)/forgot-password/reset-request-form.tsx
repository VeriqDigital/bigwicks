"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

export default function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, { message: "" });
  return <form action={action} className="mt-8 max-w-md space-y-5">
    <div><label htmlFor="email" className="font-semibold">Login email</label>
      <input id="email" name="email" type="email" autoComplete="username" maxLength={254} required className="mt-2 min-h-12 w-full rounded border border-[var(--border)] bg-white px-3" /></div>
    <p role="status" aria-live="polite">{state.message}</p>
    <button disabled={pending} className="min-h-12 rounded bg-[var(--red)] px-6 font-semibold text-white hover:bg-[var(--red-hover)] disabled:opacity-60">{pending ? "Requesting…" : "Request reset link"}</button>
  </form>;
}

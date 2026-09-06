"use client";

import { useActionState, useEffect } from "react";
import type { PasswordResult } from "@/lib/auth/account-tokens";

export default function PasswordForm({ action, label }: { action: (state: PasswordResult, form: FormData) => Promise<PasswordResult>; label: string }) {
  const [state, submit, pending] = useActionState(action, {});
  // The action carries only an encrypted server closure. Remove the original
  // bearer URL from the current history entry once the form has hydrated.
  useEffect(() => { window.history.replaceState(null, "", window.location.pathname); }, []);
  return <form action={submit} className="mt-8 max-w-md space-y-5">
    <p id="password-policy">Use 15 to 128 characters. Spaces are allowed.</p>
    {(["password", "confirmation"] as const).map((field) => <div key={field}>
      <label htmlFor={field} className="font-semibold">{field === "password" ? "New password" : "Confirm password"}</label>
      <input id={field} name={field} type="password" autoComplete="new-password" minLength={15} maxLength={128} required aria-invalid={!!state.errors?.[field]} aria-describedby={`password-policy${state.errors?.[field] ? ` ${field}-error` : ""}`} className="mt-2 min-h-12 w-full rounded border border-[var(--border)] bg-white px-3" />
      {state.errors?.[field] && <p id={`${field}-error`} className="mt-2">{state.errors[field]?.join(" ")}</p>}
    </div>)}
    <p role="status" aria-live="polite">{state.message}</p>
    <button disabled={pending} className="min-h-12 rounded bg-[var(--red)] px-6 font-semibold text-white hover:bg-[var(--red-hover)] disabled:opacity-60">{pending ? "Saving…" : label}</button>
  </form>;
}

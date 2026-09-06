"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginForm() {
  const [error, action, pending] = useActionState(login, "");
  const inputClass = "mt-2 min-h-12 w-full rounded border border-[var(--border)] bg-white px-3";
  return (
    <form action={action} className="mt-8 max-w-md space-y-5">
      <div>
        <label htmlFor="email" className="font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" maxLength={254} required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className="font-semibold">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required className={inputClass} />
      </div>
      <p role="status" aria-live="polite">{error}</p>
      <button disabled={pending} className="min-h-12 rounded bg-[var(--red)] px-6 font-semibold text-white hover:bg-[var(--red-hover)] disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

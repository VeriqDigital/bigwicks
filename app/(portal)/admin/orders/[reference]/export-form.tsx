"use client";
import { useActionState } from "react";
import { retry } from "./export-action";
export default function ExportForm({ reference }: { reference: string }) {
  const [state, action, pending] = useActionState(retry, { message: "" });
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="reference" value={reference} />
      <button
        disabled={pending}
        className="min-h-12 rounded-sm border border-current px-5 font-semibold"
      >
        {pending ? "Generating…" : "Generate/retry Excel"}
      </button>
      {state.message && (
        <p className="mt-3" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}

"use client";
import { useActionState } from "react";
import Link from "next/link";
import { previewImport, confirmImport } from "./actions";
type Preview = Extract<Awaited<ReturnType<typeof previewImport>>, { status: "preview" }>;
const button = "min-h-12 rounded bg-(--red) px-5 py-3 font-semibold text-white disabled:opacity-50";
function Summary({ summary }: { summary: Preview["summary"] }) {
  return <div className="my-4"><p>{summary.count} customers · Active: {summary.active} · Inactive: {summary.inactive}</p>
    {summary.tiers.map((tier) => <p key={tier.name}>{tier.name}: {tier.count}</p>)}</div>;
}
function Confirmation({ stage }: { stage: Preview }) {
  const [result, action, pending] = useActionState(confirmImport, null);
  if (result) return <div className="mt-6"><p role="status">{result.message}</p>{result.status === "success" && <>
    <Summary summary={result.summary} /><p>Invitations sent: 0</p><Link className="mt-4 inline-block underline" href="/admin/customers">Return to customer management</Link>
  </>}</div>;
  return <section className="mt-6" aria-labelledby="customer-preview">
    <h2 id="customer-preview" className="font-heading text-2xl font-bold">Review customer import</h2>
    <p role="status">{stage.rows.length} rows read. No accounts created yet. Warnings: 0 · Errors: 0</p>
    <Summary summary={stage.summary} />
    <div className="max-h-[32rem] overflow-auto" role="region" aria-label="Customer import preview" tabIndex={0}>
      <table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">Accounts to create</caption>
        <thead><tr>{["Company", "Customer #", "Email", "Pricing tier", "Active"].map((h) => <th key={h} className="p-3" scope="col">{h}</th>)}</tr></thead>
        <tbody>{stage.rows.map((row) => <tr key={row.email} className="border-t border-(--border)">
          {[row.companyName, row.customerNumber, row.email, row.pricingTier, row.active ? "Yes" : "No"].map((v, i) => <td key={i} className="max-w-xs wrap-anywhere p-3">{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <p className="mt-4 text-sm">Preview expires in 10 minutes. Customer or tier changes require a fresh upload.</p>
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="previewToken" value={stage.token} />
      <label className="flex min-h-12 items-center gap-3"><input name="confirmed" type="checkbox" required className="size-5" />Create these customer accounts without sending invitations.</label>
      <button className={button} disabled={pending}>{pending ? "Creating accounts…" : "Confirm customer import"}</button>
    </form>
  </section>;
}
export default function CustomerImportForm() {
  const [state, action, pending] = useActionState(previewImport, null);
  return <>
    <form action={action} className="mt-6 space-y-4">
      <label className="block font-semibold" htmlFor="customer-csv">Customer CSV file</label>
      <p id="customer-csv-help" className="text-sm">UTF-8, up to 128 KiB and 250 rows. All five columns are required. Active must be exactly true or false. No password or role columns.</p>
      <input id="customer-csv" name="csv" type="file" accept=".csv,text/csv" required aria-describedby="customer-csv-help" className="block min-h-12 w-full min-w-0 border border-(--border) bg-white p-3" />
      <button className={button} disabled={pending}>{pending ? "Validating…" : "Validate and preview"}</button>
    </form>
    {state?.status === "invalid" && <div className="mt-4"><p role="status">{state.message}</p><ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">{state.errors.map((error, i) => <li key={i}>Row {error.row} — {error.field}: {error.message}</li>)}</ul></div>}
    {state?.status === "preview" && !pending && <Confirmation key={state.token} stage={state} />}
  </>;
}

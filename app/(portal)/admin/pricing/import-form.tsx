"use client";
import { useActionState } from "react";
import { previewImport, confirmImport } from "./actions";
import type { PricingPreview, Change } from "@/lib/pricing/plan";
import type { ImportIssue } from "@/lib/pricing/csv";

export type ImportState = { status: "idle" } | { status: "invalid"; message: string; errors?: ImportIssue[]; rowsRead?: number } |
  { status: "preview"; preview: PricingPreview; token: string; expiresAt: number } | { status: "success"; message: string };
const button = "min-h-12 rounded-sm bg-(--red) px-5 py-3 font-semibold text-white hover:bg-(--red-hover) disabled:opacity-50";
function describe(change: Change) { return `${change.before ?? "No price"} → ${change.after ?? "No price"} (${change.kind})`; }

function Confirmation({ stage }: { stage: Extract<ImportState, { status: "preview" }> }) {
  const [result, action, pending] = useActionState(confirmImport, { status: "idle" } as ImportState);
  const { preview } = stage;
  const removals = preview.summary.reduce((sum, tier) => sum + tier.remove, 0);
  if (result.status === "success" || result.status === "invalid") return <p role="status" className="mt-5 border-l-4 border-(--red) bg-white p-4">{result.message}</p>;
  return <section className="mt-6" aria-labelledby="pricing-preview-title">
    <h3 id="pricing-preview-title" className="font-heading text-2xl font-bold">Review pricing import</h3>
    <p role="status" className="mt-2">{preview.rowsRead} rows read · {preview.matched} products matched. No prices have changed yet.</p>
    <div className="mt-4 overflow-x-auto" role="region" aria-label="Import counts" tabIndex={0}>
      <table className="w-full text-left text-sm"><caption className="sr-only">Proposed changes by pricing tier</caption>
        <thead><tr>{["Tier", "Create", "Update", "Remove", "Unchanged"].map((label) => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
        <tbody>{preview.summary.map((tier) => <tr key={tier.id} className="border-t border-(--border)"><th scope="row" className="p-2 whitespace-nowrap">{tier.name}</th>{(["create", "update", "remove", "unchanged"] as const).map((kind) => <td key={kind} className="p-2">{tier[kind]}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {preview.warnings.length > 0 && <details className="mt-4"><summary className="cursor-pointer py-3 font-semibold">{preview.warnings.length} warnings</summary><ul className="list-disc space-y-2 pl-5 text-sm">{preview.warnings.map((issue, index) => <li key={index}>Row {issue.row}: {issue.message}</li>)}</ul></details>}
    <details className="mt-3"><summary className="cursor-pointer py-3 font-semibold">Review all proposed values</summary>
      <ul className="max-h-96 space-y-3 overflow-y-auto text-sm">{preview.changes.map((change) => <li key={change.catalogKey} className="border-b border-(--border) py-3 wrap-anywhere">
        <strong>{change.sku} — {change.name}</strong>{change.prices.map((price) => <p key={price.pricingTierId}>{price.tierName}: {describe(price)}</p>)}
      </li>)}</ul>
    </details>
    <p className="mt-3 text-sm text-(--muted)">This preview expires in 10 minutes. If catalog or pricing data changes, upload the CSV again.</p>
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="previewToken" value={stage.token} />
      {removals > 0 && <label className="flex min-h-12 items-start gap-3 py-3"><input type="checkbox" name="acknowledgeRemovals" required className="mt-1 size-5 shrink-0" /><span>I understand that blank cells will remove {removals} existing prices.</span></label>}
      <button disabled={pending} className={button}>{pending ? "Applying import…" : "Confirm pricing import"}</button>
    </form>
  </section>;
}
export default function PricingImportForm() {
  const [state, action, pending] = useActionState(previewImport, { status: "idle" } as ImportState);
  return <section aria-labelledby="pricing-import-title" className="mt-8 border-t border-(--border) pt-6">
    <h2 id="pricing-import-title" className="font-heading text-2xl font-bold">Import updated prices</h2>
    <p className="mt-2 text-sm">Edit only the price columns in a fresh export. Keep every configured tier column. Blank cells mean no price and remove an existing price after confirmation. Products omitted from the file are unchanged.</p>
    <p id="csv-help" className="mt-2 text-sm text-(--muted)">CSV UTF-8, comma-separated. Maximum 256 KiB and 500 products. Product content stays in Catalog Studio.</p>
    <form action={action} className="mt-4 space-y-4">
      <label className="block font-semibold" htmlFor="pricing-csv">Pricing CSV file</label>
      <input id="pricing-csv" name="csv" type="file" accept=".csv,text/csv" required aria-describedby="csv-help" className="block min-h-12 w-full min-w-0 rounded-sm border border-(--border) bg-white p-3 text-sm" />
      <button disabled={pending} className={button}>{pending ? "Validating…" : "Validate and preview"}</button>
    </form>
    {state.status === "invalid" && <div className="mt-4"><p role="status">{state.message}</p>{state.rowsRead !== undefined && <p className="mt-2 text-sm">{state.rowsRead} rows read</p>}
      {!!state.errors?.length && <ul className="mt-3 max-h-80 list-disc space-y-2 overflow-y-auto pl-5 text-sm">{state.errors.map((error, index) => <li key={index}>{error.row && `Row ${error.row}: `}{error.message}</li>)}</ul>}
    </div>}
    {state.status === "preview" && !pending && <Confirmation key={state.token} stage={state} />}
  </section>;
}

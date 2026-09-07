import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminPricing } from "@/lib/pricing/service";
import { priceColumn } from "@/lib/pricing/tiers";
import PricingImportForm from "./import-form";

export const metadata: Metadata = { title: "Pricing management", description: "Wholesale pricing administration.", robots: { index: false, follow: false } };
export default async function PricingPage() {
  await requireAdmin();
  const result = await getAdminPricing();
  return <>
    <h1 className="font-heading text-4xl font-bold">Pricing management</h1>
    <p className="mt-3 text-(--muted)">Review catalog pricing, export a CSV, then validate and confirm your changes.</p>
    {result.status === "unavailable" ? <div className="mt-6 border-l-4 border-(--red) bg-white p-5"><p role="status">{result.message}</p><a href="/admin/pricing" className="mt-4 inline-flex min-h-11 items-center font-semibold underline">Try again</a></div> : <>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-(--border) py-5 sm:grid-cols-3">
        {[["Sanity products", result.counts.total], ["Available products", result.counts.available], ["Fully priced products", result.counts.fullyPriced], ...result.counts.missing.map((tier) => [`Missing ${tier.name}`, tier.count]), ["Audit problems", result.issues.length]].map(([label, value]) => <div key={label}><dt className="text-sm text-(--muted)">{label}</dt><dd className="mt-1 font-heading text-3xl font-bold">{value}</dd></div>)}
      </dl>
      <p className="mt-3 text-sm text-(--muted)">Completeness counts include available products with valid identities. Hidden products may remain unpriced. Availability is manual catalog visibility.</p>
      {result.issues.length > 0 && <details className="mt-4"><summary className="cursor-pointer py-3 font-semibold">Review {result.issues.length} catalog audit problems</summary><ul className="max-h-80 list-disc space-y-2 overflow-y-auto pl-5 text-sm">{result.issues.map((issue, index) => <li key={index} className="wrap-anywhere">{issue.code.replaceAll("_", " ")}{issue.catalogKey && ` — ${issue.catalogKey}`}{issue.documentId && ` — document ${issue.documentId}`}{issue.pricingTierId && ` — tier ${issue.pricingTierId}`}</li>)}</ul></details>}
      {result.blocked ? <p role="status" className="mt-5 border-l-4 border-(--red) bg-white p-4">Export and import are blocked. Resolve invalid or duplicate catalog identities, invalid prices, and unsupported or missing tiers first.</p> : <>
        <a href="/admin/pricing/export" className="mt-6 inline-flex min-h-12 items-center rounded-sm border border-current px-5 font-semibold">Download pricing CSV</a>
        <PricingImportForm />
      </>}
      <section aria-labelledby="current-pricing" className="mt-10">
        <h2 id="current-pricing" className="font-heading text-2xl font-bold">Current case prices</h2>
        <p className="mt-2 text-sm">Amounts use exact decimal text. No automatic tier discount is applied.</p>
        {result.rows.length === 0 ? <p className="mt-5">No valid published products are available to price.</p> : <div className="mt-5 overflow-x-auto border border-(--border) bg-white" role="region" aria-label="Current pricing table" tabIndex={0}>
          <table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Current Sanity products and private tier prices</caption>
            <thead><tr>{["SKU / Product", "Category", "Visibility", ...result.tiers.map((tier) => tier.name), "Status"].map((label) => <th key={label} scope="col" className="border-b border-(--border) p-3">{label}</th>)}</tr></thead>
            <tbody>{result.rows.map((row) => <tr key={row.catalogKey} className="border-b border-(--border) last:border-0"><th scope="row" className="max-w-64 p-3 font-normal wrap-anywhere"><strong>{row.sku}</strong><div>{row.name}</div></th><td className="max-w-40 p-3 wrap-anywhere">{row.category || "Uncategorized"}</td><td className="p-3">{row.available ? "Visible" : "Hidden"}</td>{result.tiers.map((tier) => <td key={tier.id} className="p-3 tabular-nums whitespace-nowrap">{row.prices[priceColumn(tier)] ?? "No price"}</td>)}<td className="p-3">{result.tiers.every((tier) => row.prices[priceColumn(tier)] !== null) ? "Complete" : "Missing price"}</td></tr>)}</tbody>
          </table>
        </div>}
      </section>
    </>}
  </>;
}

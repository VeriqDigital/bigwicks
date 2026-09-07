import type { Metadata } from "next";
import Link from "next/link";
import { listCustomerTiers } from "@/lib/admin/customers";
import CustomerImportForm from "./import-form";
export const metadata: Metadata = { title: "Import customers" };
export default async function CustomerImportPage() {
  const tiers = await listCustomerTiers();
  return <>
    <Link href="/admin/customers" className="underline">Back to customers</Link>
    <h1 className="mt-5 font-heading text-4xl font-bold">Import customers</h1>
    <p className="mt-3">CSV only. Create new accounts; existing accounts are never updated. Nothing is created until you confirm the preview. Invitation emails are not sent during import.</p>
    <p className="mt-3 wrap-anywhere">Use exact tier names: {tiers.map((t) => t.name).join(", ")}.</p>
    <a href="/admin/customers/import/template" download className="mt-4 inline-block underline">Download CSV template</a>
    <CustomerImportForm />
  </>;
}

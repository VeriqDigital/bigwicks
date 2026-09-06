import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";
import Link from "next/link";

export const metadata: Metadata = { title: "Administration", description: "Big Wicks staff access." };

export default async function AdminPage() {
  await requireAdmin();
  return <>
    <h1 className="font-heading text-4xl font-bold">Administration</h1>
    <p className="mt-4">You are signed in as an administrator.</p>
    <p className="mt-2">Manage wholesale customers, private prices, and catalog content.</p>
    <Link href="/admin/customers" className="mt-6 inline-block rounded bg-[var(--red)] px-5 py-3 font-semibold text-white hover:bg-[var(--red-hover)]">Manage customers</Link>
  </>;
}

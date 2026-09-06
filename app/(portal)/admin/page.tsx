import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";
import SignOutButton from "@/components/auth/SignOutButton";

export const metadata: Metadata = { title: "Administration", description: "Big Wicks staff access." };

export default async function AdminPage() {
  await requireAdmin();
  return <>
    <h1 className="font-heading text-4xl font-bold">Administration</h1>
    <p className="mt-4">You are signed in as an administrator.</p>
    <p className="mt-2">Customer management will be added in a later update.</p>
    <SignOutButton />
  </>;
}

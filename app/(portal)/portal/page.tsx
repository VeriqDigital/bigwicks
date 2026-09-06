import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth/authorization";
import SignOutButton from "@/components/auth/SignOutButton";

export const metadata: Metadata = { title: "Wholesale portal", description: "Big Wicks wholesale account access." };

export default async function CustomerPortalPage() {
  const { customer } = await requireCustomer();
  return <>
    <h1 className="font-heading text-4xl font-bold">Wholesale portal</h1>
    <p className="mt-4 break-words">Signed in for {customer.companyName}.</p>
    <p className="mt-2">Your wholesale account is active. The catalog will be added in a later update.</p>
    <SignOutButton />
  </>;
}

import type { Metadata } from "next";
import { listCustomerTiers } from "@/lib/admin/customers";
import CustomerForm from "../customer-form";

export const metadata: Metadata = { title: "Create customer", description: "Create a wholesale customer account." };

export default async function NewCustomerPage() {
  const tiers = await listCustomerTiers();
  return <>
    <h1 className="font-heading text-4xl font-bold">Create customer</h1>
    <p className="mt-3">Add a wholesale account. Password setup will be available in a later update.</p>
    <CustomerForm tiers={tiers} />
  </>;
}

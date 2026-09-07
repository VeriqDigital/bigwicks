"use server";
import { requireCustomer } from "@/lib/auth/authorization";
import { reviewOrder, submitOrder } from "@/lib/orders/service";
import { redirect, RedirectType } from "next/navigation";

export async function reviewOrderAction(items: unknown) {
  await requireCustomer();
  return reviewOrder(items);
}
export async function submitOrderAction(token: unknown) {
  await requireCustomer();
  const result = await submitOrder(token);
  if (result.status === "submitted") {
    redirect(`/portal/confirmation/${result.reference}`, RedirectType.replace);
  }
  return result;
}

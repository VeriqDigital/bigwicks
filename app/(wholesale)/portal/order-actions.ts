"use server";
import { requireCustomer } from "@/lib/auth/authorization";
import { reviewOrder, submitOrder } from "@/lib/orders/service";
import { revalidatePath } from "next/cache";

export async function reviewOrderAction(items: unknown) {
  await requireCustomer();
  return reviewOrder(items);
}
export async function submitOrderAction(token: unknown) {
  await requireCustomer();
  const result = await submitOrder(token);
  if (result.status === "submitted") revalidatePath("/admin/orders");
  return result;
}

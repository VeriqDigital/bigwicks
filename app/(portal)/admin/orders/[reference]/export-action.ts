"use server";
import { requireAdmin } from "@/lib/auth/authorization";
import { retryOrderExport, referenceValid } from "@/lib/order-sheets/exports";
import { revalidatePath } from "next/cache";
export async function retry(_state: { message: string }, form: FormData) {
  await requireAdmin();
  const reference = form.get("reference");
  const result = await retryOrderExport(reference);
  if (referenceValid(reference)) revalidatePath(`/admin/orders/${reference}`);
  return result;
}

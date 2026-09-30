"use server";
import { requireAdmin } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import {
  uploadOrderSheet,
  previewOrderSheet,
  activateOrderSheet,
  deactivateOrderSheet,
} from "@/lib/order-sheets/service";
import type { SheetState } from "@/lib/order-sheets/types";

export async function upload(
  _state: SheetState,
  form: FormData,
): Promise<SheetState> {
  await requireAdmin();
  return uploadOrderSheet(form.get("workbook"), form.get("tierId"));
}
export async function preview(
  _state: SheetState,
  form: FormData,
): Promise<SheetState> {
  await requireAdmin();
  return previewOrderSheet(form.get("draftId"), form.get("priceColumn"));
}
export async function activate(
  _state: SheetState,
  form: FormData,
): Promise<SheetState> {
  await requireAdmin();
  const result = await activateOrderSheet(
    form.get("draftId"),
    form.get("priceColumn"),
    form.get("token"),
    form.get("acknowledged") === "on",
  );
  if (result.status === "success") revalidatePath("/admin/order-sheets");
  return result;
}
export async function deactivate(
  _state: SheetState,
  form: FormData,
): Promise<SheetState> {
  await requireAdmin();
  const result = await deactivateOrderSheet(
    form.get("tierId"),
    form.get("versionId"),
  );
  if (result.status === "success") revalidatePath("/admin/order-sheets");
  return result;
}

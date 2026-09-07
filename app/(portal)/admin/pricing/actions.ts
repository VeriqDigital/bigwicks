"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import { previewPricingImport, confirmPricingImport } from "@/lib/pricing/service";
import type { ImportState } from "./import-form";

export async function previewImport(_previous: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  return previewPricingImport(formData.get("csv"));
}
export async function confirmImport(_previous: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const result = await confirmPricingImport(formData.get("previewToken"), formData.get("acknowledgeRemovals") === "on");
  if (result.status === "success") { revalidatePath("/admin/pricing"); revalidatePath("/portal"); }
  return result;
}

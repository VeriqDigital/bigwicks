"use server";
import { previewCustomerImport, confirmCustomerImport } from "@/lib/admin/customer-import";
import { requireAdmin } from "@/lib/auth/authorization";
export async function previewImport(_state: unknown, form: FormData) { await requireAdmin(); return previewCustomerImport(form.get("csv")); }
export async function confirmImport(_state: unknown, form: FormData) { await requireAdmin(); return confirmCustomerImport(form.get("previewToken"), form.get("confirmed") === "on"); }

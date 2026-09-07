"use server";
import { previewCustomerInvitations, confirmCustomerInvitations } from "@/lib/admin/customer-invitations";
import { requireAdmin } from "@/lib/auth/authorization";
export async function previewInvitations(_state: unknown, form: FormData) { await requireAdmin(); return previewCustomerInvitations(form.getAll("customerId")); }
export async function confirmInvitations(_state: unknown, form: FormData) { await requireAdmin(); return confirmCustomerInvitations(form.get("previewToken"), form.get("confirmed") === "on"); }

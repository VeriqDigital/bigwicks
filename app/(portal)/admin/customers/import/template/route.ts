import { requireAdmin } from "@/lib/auth/authorization";
import { customerHeaders } from "@/lib/admin/customer-import-csv";
export async function GET() {
  await requireAdmin();
  return new Response("\uFEFF" + customerHeaders.join(",") + "\r\n", { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="customer-import-template.csv"',
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } });
}

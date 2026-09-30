import { requireAdmin } from "@/lib/auth/authorization";
import { downloadOrderExport } from "@/lib/order-sheets/downloads";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  await requireAdmin();
  return downloadOrderExport((await params).reference);
}

import { requireAdmin } from "@/lib/auth/authorization";
import { downloadOriginalTemplate } from "@/lib/order-sheets/downloads";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ version: string }> },
) {
  await requireAdmin();
  return downloadOriginalTemplate((await params).version);
}

import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminPricingExport, pricingMessage } from "@/lib/pricing/service";

export const dynamic = "force-dynamic";
export async function GET() {
  await requireAdmin();
  const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
  try {
    const csv = await getAdminPricingExport();
    return new Response(csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="big-wicks-pricing.csv"' } });
  } catch (error) { return new Response(pricingMessage(error), { status: 503, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } }); }
}

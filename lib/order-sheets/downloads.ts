import "server-only";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import { readExportBytes, readTemplateBytes } from "./storage";
import { referenceValid } from "./exports";

export function xlsxResponse(bytes: Uint8Array, filename: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function downloadOrderExport(reference: unknown) {
  await requireAdmin();
  if (!referenceValid(reference)) notFound();
  const order = await getDb().order.findUnique({
    where: { reference },
    select: { id: true },
  });
  if (!order) notFound();
  const file = await readExportBytes(order.id);
  if (!file) notFound();
  return xlsxResponse(
    file.bytes,
    `${reference}-${file.kind === "TEMPLATE" ? "order-sheet" : "snapshot-fallback"}.xlsx`,
  );
}
export async function downloadOriginalTemplate(version: string) {
  await requireAdmin();
  if (!/^c[a-z0-9]{24,31}$/.test(version)) notFound();
  if (
    !(await getDb().orderSheetVersion.findUnique({
      where: { id: version },
      select: { id: true },
    }))
  )
    notFound();
  const file = await readTemplateBytes(version);
  return xlsxResponse(file.original, `order-sheet-${version}.xlsx`);
}

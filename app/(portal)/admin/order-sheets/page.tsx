import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";
import { listOrderSheets } from "@/lib/order-sheets/service";
import { UploadForm, DeactivateForm } from "./forms";

export const metadata: Metadata = {
  title: "Order sheets",
  description: "Private staff order-sheet templates.",
  robots: { index: false, follow: false },
};
export default async function OrderSheetsPage() {
  await requireAdmin();
  const tiers = await listOrderSheets();
  return (
    <>
      <h1 className="font-heading text-4xl font-bold">Order sheets</h1>
      <p className="mt-3">
        Uploading an order sheet changes Excel exports only. Website products
        and prices are managed separately.
      </p>
      <p className="mt-3 text-sm text-(--muted)">
        Originals and populated exports are staff-only. A missing template never
        prevents ordering; a complete submitted snapshot is exported instead.
      </p>
      <div className="mt-7 space-y-7">
        {tiers.map((t) => (
          <section
            key={t.id}
            className="border border-(--border) bg-white p-5"
            aria-labelledby={`tier-${t.id}`}
          >
            <h2 id={`tier-${t.id}`} className="font-heading text-2xl font-bold">
              {t.name}
            </h2>
            <p className="mt-2">
              {t.orderSheetActive?.versionId
                ? "Active version validated and staff-confirmed"
                : "No active template — snapshot fallback"}
            </p>
            {t.orderSheetActive?.versionId && (
              <DeactivateForm
                tierId={t.id}
                versionId={t.orderSheetActive.versionId}
              />
            )}
            <ul className="mt-4 space-y-5">
              {t.orderSheetVersions.map((v) => (
                <li
                  key={v.id}
                  className="border-t border-(--border) pt-3 text-sm wrap-anywhere"
                >
                  <strong>{v.filename}</strong>{" "}
                  {v.id === t.orderSheetActive?.versionId
                    ? "(active)"
                    : "(retained version)"}
                  <p className="mt-1">
                    Uploaded {v.uploadedAt.toISOString()} by{" "}
                    {v.uploadedBy.email}. Activated{" "}
                    {v.activatedAt.toISOString()}.
                  </p>
                  <p>
                    Version {v.id}. Validation: {v.parserVersion}.
                  </p>
                  <a
                    className="inline-flex min-h-11 items-center underline"
                    href={`/admin/order-sheets/${v.id}/original`}
                  >
                    Download original {v.filename}
                  </a>
                </li>
              ))}
            </ul>
            {t.orderSheetVersions.length === 20 && (
              <p className="mt-3 text-sm">
                Showing the latest 20 versions. Earlier versions remain retained
                with their referenced orders.
              </p>
            )}
          </section>
        ))}
      </div>
      <UploadForm tiers={tiers.map((t) => ({ id: t.id, name: t.name }))} />
    </>
  );
}

"use client";
import { useActionState } from "react";
import { upload, preview, activate, deactivate } from "./actions";
import type { SheetState } from "@/lib/order-sheets/types";

const initial: SheetState = { status: "idle" };
const button =
  "min-h-12 rounded-sm bg-(--red) px-5 py-3 font-semibold text-white disabled:opacity-50";
const input =
  "mt-2 block min-h-12 w-full max-w-xl rounded-sm border border-(--border) bg-white p-3";
function Diagnostics({ state }: { state: SheetState }) {
  return (
    <>
      {state.message && (
        <p
          role="status"
          className="my-4 border-l-4 border-(--red) bg-white p-4"
        >
          {state.message}
        </p>
      )}
      {state.inspection && (
        <div className="mt-4 space-y-3">
          <p>
            Worksheet: <strong>{state.inspection.worksheet}</strong>. Header row{" "}
            {state.inspection.headerRow}. Product rows:{" "}
            {state.inspection.products.length}.
          </p>
          <p className="text-sm">
            Detected columns:{" "}
            {Object.entries(state.inspection.columns)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")}
            .
          </p>
          {!!state.inspection.errors.length && (
            <ul
              className="list-disc space-y-2 pl-5"
              aria-label="Template errors"
            >
              {state.inspection.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <details>
            <summary className="cursor-pointer py-3 font-semibold">
              Template notes ({state.inspection.warnings.length})
            </summary>
            <ul className="max-h-72 list-disc space-y-2 overflow-y-auto pl-5 text-sm">
              {state.inspection.warnings.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </>
  );
}
function Confirm({ review }: { review: SheetState }) {
  const [result, action, pending] = useActionState(activate, initial);
  const p = review.preview!;
  return (
    <div className="mt-6 border-t border-(--border) pt-5">
      <h3 className="text-xl font-bold">
        Review mappings for {review.tierName}
      </h3>
      <p className="mt-3">
        Selected case-price column:{" "}
        <strong>
          {
            review.inspection!.priceColumns.find(
              (c) => c.column === review.priceColumn,
            )?.label
          }
        </strong>
        . Matched products: {Object.keys(p.mapping).length}.
      </p>
      <p className="mt-3">
        Any order containing an unmapped product receives a complete snapshot
        fallback. Unknown template rows do not become website products.
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer py-3">
          Unmatched template rows ({p.unmatchedRows.length})
        </summary>
        <ul className="max-h-64 overflow-auto space-y-1">
          {p.unmatchedRows.map((r) => (
            <li key={r.row} className="wrap-anywhere">
              Row {r.row}: {r.id}
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary className="cursor-pointer py-3">
          Catalog products without mappings ({p.missingProducts.length})
        </summary>
        <ul className="max-h-64 overflow-auto space-y-1">
          {p.missingProducts.map((r) => (
            <li key={r.catalogKey} className="wrap-anywhere">
              {r.sku}
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary className="cursor-pointer py-3">
          Ambiguous catalog identifiers ({p.ambiguousSkus.length})
        </summary>
        <ul>
          {p.ambiguousSkus.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
      <details>
        <summary className="cursor-pointer py-3">
          Price differences or unreadable prices ({p.discrepancies.length})
        </summary>
        <ul className="max-h-64 overflow-auto space-y-2 text-sm">
          {p.discrepancies.map((r) => (
            <li key={r.row} className="wrap-anywhere">
              Row {r.row}, {r.sku}: source{" "}
              {r.source ?? "unreadable / formula / blank"}; website{" "}
              {r.website ?? "no price"}. Saved website prices will be used.
            </li>
          ))}
        </ul>
      </details>
      {result.status !== "success" && (
        <form action={action} className="mt-4 space-y-4">
          <input type="hidden" name="draftId" value={review.draftId} />
          <input type="hidden" name="priceColumn" value={review.priceColumn} />
          <input type="hidden" name="token" value={review.token} />
          <label className="flex items-start gap-3">
            <input
              className="mt-1 size-5 shrink-0"
              type="checkbox"
              name="acknowledged"
              required
            />
            I confirm this tier and case-price column, have reviewed the mapping
            warnings, and accept complete snapshot fallbacks for unmapped
            products. This replaces the active export template for future orders
            only.
          </label>
          <button disabled={pending} className={button}>
            {pending ? "Activating…" : "Activate reviewed version"}
          </button>
        </form>
      )}
      <Diagnostics state={result} />
    </div>
  );
}
function Review({ draft }: { draft: SheetState }) {
  const [state, action, pending] = useActionState(preview, initial);
  return (
    <>
      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="draftId" value={draft.draftId} />
        <label className="block font-semibold">
          Effective case-price column for {draft.tierName}
          <select name="priceColumn" required defaultValue="" className={input}>
            <option value="" disabled>
              Select a detected column
            </option>
            {draft.inspection!.priceColumns.map((p) => (
              <option key={p.column} value={p.column}>
                {p.label} (column {p.column})
              </option>
            ))}
          </select>
        </label>
        <button disabled={pending} className={button}>
          {pending ? "Reviewing…" : "Preview selected column"}
        </button>
      </form>
      {state.status === "preview" ? (
        <Confirm key={state.token} review={state} />
      ) : (
        <Diagnostics state={state} />
      )}
    </>
  );
}
export function UploadForm({
  tiers,
}: {
  tiers: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(upload, initial);
  return (
    <section
      className="mt-10 border-t border-(--border) pt-7"
      aria-labelledby="upload-title"
    >
      <h2 id="upload-title" className="font-heading text-2xl font-bold">
        Upload and review a template
      </h2>
      <p className="mt-3 text-sm">
        One product worksheet, .xlsx, maximum 2 MiB. Each preview expires after
        ten minutes. Correct duplicate product IDs in the source workbook before
        uploading.
      </p>
      <form action={action} className="mt-5 space-y-5">
        <label className="block font-semibold">
          Target pricing tier
          <select name="tierId" className={input} required defaultValue="">
            <option value="" disabled>
              Select a configured tier
            </option>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-semibold">
          Excel order-sheet template
          <input
            className={input}
            name="workbook"
            type="file"
            accept=".xlsx"
            required
          />
        </label>
        <button disabled={pending || !tiers.length} className={button}>
          {pending ? "Validating…" : "Upload and validate"}
        </button>
      </form>
      <Diagnostics state={state} />
      {state.status === "uploaded" && (
        <Review key={state.draftId} draft={state} />
      )}
    </section>
  );
}
export function DeactivateForm({
  tierId,
  versionId,
}: {
  tierId: string;
  versionId: string;
}) {
  const [state, action, pending] = useActionState(deactivate, initial);
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="tierId" value={tierId} />
      <input type="hidden" name="versionId" value={versionId} />
      <button
        disabled={pending}
        className="min-h-11 rounded-sm border border-current px-4 font-semibold"
      >
        {pending ? "Deactivating…" : "Deactivate template"}
      </button>
      <Diagnostics state={state} />
    </form>
  );
}

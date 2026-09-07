"use client";
import { useEffect, useRef } from "react";
import type { OrderReview as Review } from "@/lib/orders/types";
import OrderSnapshot from "./OrderSnapshot";

export default function OrderReview({ review, message, pending, onBack, onSubmit }: {
  review: Review; message: string; pending: boolean; onBack: () => void; onSubmit: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, [review.token]);
  return <section className="mx-auto max-w-4xl" aria-labelledby="order-review-title">
    <button type="button" onClick={onBack} disabled={pending} className="mb-4 min-h-12 underline disabled:opacity-50">Back to quantities</button>
    <h2 ref={title} tabIndex={-1} id="order-review-title" className="scroll-mt-44 font-heading text-3xl font-bold">Review order request</h2>
    <p className="mt-3">Big Wicks will review availability and finalize the order with you. Payment is handled separately.</p>
    <p className="mt-2 text-sm text-(--muted)">Review these current prices and quantities. Any changes before submission will require another review.</p>
    {message && <p role="status" className="mt-5 border-l-4 border-(--red) bg-white p-4">{message}</p>}
    <OrderSnapshot items={review.items} total={review.total} />
    <button type="button" onClick={onSubmit} disabled={pending} className="mt-7 min-h-12 w-full rounded-sm bg-(--red) px-6 py-3 font-semibold text-white hover:bg-(--red-hover) disabled:opacity-50 sm:w-auto">{pending ? "Submitting…" : "Submit order request"}</button>
    <p className="mt-3 text-sm text-(--muted)">If submission is interrupted, retry here to recover the same request.</p>
  </section>;
}

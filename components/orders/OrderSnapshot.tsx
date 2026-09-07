import type { OrderLine } from "@/lib/orders/types";

export default function OrderSnapshot({ items, total }: { items: OrderLine[]; total: string }) {
  return <>
    <ul className="mt-6 divide-y divide-(--border) border-y border-(--border) bg-white px-4 sm:px-6" aria-label="Order products">
      {items.map((item) => <li key={item.catalogKey} className="grid min-w-0 gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0"><h3 className="wrap-anywhere font-semibold">{item.name}</h3><p className="mt-1 wrap-anywhere text-sm text-(--muted)">SKU: {item.sku}</p></div>
        <dl className="grid grid-cols-3 gap-5 text-sm tabular-nums"><div><dt className="text-(--muted)">Quantity</dt><dd className="mt-1">{item.quantity}</dd></div>
          <div><dt className="text-(--muted)">Price</dt><dd className="mt-1 wrap-anywhere">{item.unitPrice}</dd></div><div><dt className="text-(--muted)">Line total</dt><dd className="mt-1 wrap-anywhere font-semibold">{item.lineTotal}</dd></div></dl>
      </li>)}
    </ul>
    <p className="mt-5 text-right text-xl font-semibold tabular-nums">Request total: <span data-testid="order-total" className="wrap-anywhere">{total}</span></p>
  </>;
}

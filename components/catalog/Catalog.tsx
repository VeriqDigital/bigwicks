"use client";

import { useState } from "react";
import type { CustomerCatalogProduct } from "@/lib/catalog/service";
import { browseCatalog, type CatalogSort } from "./browse";
import ProductImage from "./ProductImage";

const control = "mt-2 min-h-12 w-full min-w-0 rounded-sm border border-(--border) bg-white px-3 text-base font-normal";

export default function Catalog({ products }: { products: CustomerCatalogProduct[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<CatalogSort>("name-asc");
  const categories = [...new Map(products.flatMap((product) => product.category ? [[product.category.id, product.category] as const] : [])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "en-US") || a.id.localeCompare(b.id));
  const visible = browseCatalog(products, search, category, sort);
  const filtered = Boolean(search.trim() || category);
  function clearFilters() { setSearch(""); setCategory(""); }

  if (products.length === 0) return <section className="border border-(--border) bg-white p-8" aria-labelledby="catalog-empty">
    <p className="mb-3 text-sm text-(--muted)">0 products</p>
    <h2 id="catalog-empty" className="font-heading text-2xl font-bold">No products are currently available.</h2>
    <p role="status" className="mt-3 text-(--muted)">Check back later to browse the catalog.</p>
  </section>;

  return <section aria-label="Product catalog">
    <div className="grid grid-cols-2 gap-4 border-y border-(--border) py-5 lg:grid-cols-[2fr_1fr_1fr]">
      <div className="col-span-2 min-w-0 text-sm font-semibold lg:col-span-1">
        <label htmlFor="catalog-search">Search products</label>
        <input id="catalog-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, SKU or category" className={control} />
      </div>
      <div className="min-w-0 text-sm font-semibold">
        <label htmlFor="catalog-category">Category</label>
        <select id="catalog-category" value={category} onChange={(event) => setCategory(event.target.value)} className={control}>
          <option value="">All products</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div className="min-w-0 text-sm font-semibold">
        <label htmlFor="catalog-sort">Sort by</label>
        <select id="catalog-sort" value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)} className={control}>
          <option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option>
          <option value="price-asc">Price low–high</option><option value="price-desc">Price high–low</option>
        </select>
      </div>
    </div>
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-3">
      <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-(--muted)">{visible.length} of {products.length} products</p>
      {filtered && <button type="button" onClick={clearFilters} className="min-h-11 px-2 text-sm font-semibold underline underline-offset-4">Clear filters</button>}
    </div>
    {visible.length === 0 ? <div className="border border-(--border) bg-white px-6 py-10">
      <h2 className="font-heading text-2xl font-bold">No products match your search.</h2>
      <p className="mt-2 text-(--muted)">Try a different name, SKU or category, or clear your filters.</p>
    </div> : <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {visible.map((product) => <li key={product.catalogKey} className="min-w-0">
        <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-sm border border-(--border) bg-white">
          <ProductImage key={product.image?.url ?? "missing"} image={product.image} />
          <div className="flex flex-1 flex-col p-5">
            <p className="mb-2 wrap-anywhere text-xs font-semibold uppercase tracking-wide text-(--muted)">{product.category?.name ?? "Uncategorized"}</p>
            <h2 className="wrap-anywhere font-heading text-xl leading-tight font-bold">{product.name}</h2>
            <p className="mt-2 wrap-anywhere text-xs text-(--muted)">SKU: {product.sku}</p>
            {product.description && <p className="mt-3 line-clamp-3 wrap-anywhere text-sm leading-relaxed text-(--muted)">{product.description}</p>}
            <div className="mt-auto pt-5">
              <div className="border-t border-(--border) pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-(--muted)">Your wholesale price</p>
                <p className="mt-1 wrap-anywhere font-heading text-3xl font-bold tabular-nums" data-testid="product-price">{product.price}</p>
              </div>
            </div>
          </div>
        </article>
      </li>)}
    </ul>}
  </section>;
}

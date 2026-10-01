import Link from "next/link";
import { publicMetadata } from "@/config/seo";
import { getPublicCatalog, publicCategories } from "@/lib/catalog/public";
import { getVisitorPricing } from "@/lib/catalog/visitor";
import { productHref } from "@/lib/catalog/urls";
import ProductImage from "@/components/catalog/ProductImage";
import WholesaleAccess from "@/components/catalog/WholesaleAccess";

export const metadata = publicMetadata("/products", "Fireworks Catalog | Big Wicks Fireworks", "Explore the Big Wicks Fireworks product catalog by category, brand or item number. View product details and plan your visit to our La Porte store.");

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "";
  const search = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const catalog = await getPublicCatalog();
  const pricing = await getVisitorPricing();
  const prices = new Map(pricing?.products.map((product) => [product.catalogKey, product.price]));
  const categories = publicCategories(catalog.products);
  const query = search.trim().toLocaleLowerCase("en-US");
  const visible = catalog.products.filter((product) => (!category || product.category?.id === category) &&
    [product.name, product.sku, product.brand ?? "", product.category?.name ?? ""].some((text) => text.toLocaleLowerCase("en-US").includes(query)));
  return <>
    <nav aria-label="Breadcrumb" className="product-breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Fireworks</span></nav>
    <header className="product-intro">
      <p className="public-kicker">Explore the selection</p><h1 className="public-title">Find your kind of boom.</h1>
      <p>Browse products, explore the details, then visit Big Wicks in La Porte. Selection varies; contact the store for current availability.</p>
      <WholesaleAccess customer={pricing !== null} unavailable={pricing?.status === "unavailable"} />
    </header>
    <form action="/products" className="product-filters" role="search">
      <label>Search products<input type="search" name="q" defaultValue={search} maxLength={200} placeholder="Name, brand or item number" /></label>
      <label>Category<select name="category" defaultValue={category}>
        <option value="">All categories</option>
        {category && !categories.some((item) => item.id === category) && <option value={category}>Unknown category</option>}
        {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <button type="submit">Apply filters</button>
      {(category || search) && <Link href="/products" prefetch={false}>Clear filters</Link>}
    </form>
    {catalog.status === "unavailable" ? <p role="status" className="product-empty">The catalog is temporarily unavailable. Please try again later or <Link href="/contact">contact the store</Link>.</p> : <>
      <p role="status" className="product-count">{visible.length} {visible.length === 1 ? "product" : "products"}</p>
      {visible.length === 0 ? <div className="product-empty"><h2>{category || search ? "No products match your filters." : "Check back for products."}</h2><p>{category || search ? "Try another category or search term." : "Contact the store for help with the current selection."}</p></div> :
        <ul className="public-product-grid">{visible.map((product) => <li key={product.catalogKey}>
          <article className="public-product-card">
            <Link href={productHref(product.slug)} prefetch={false} className="product-card-link">
              <ProductImage image={product.image} />
              <div className="product-card-copy"><p className="public-kicker">{product.category?.name ?? "Fireworks"}</p><h2>{product.name}</h2>
                {product.brand && <p>{product.brand}</p>}<span className="product-card-action">View product <span aria-hidden="true">→</span></span>
              </div>
            </Link>
            {prices.has(product.catalogKey) && <p className="product-card-price">Your case price <strong data-testid="product-price">{prices.get(product.catalogKey)}</strong></p>}
          </article>
        </li>)}</ul>}
    </>}
  </>;
}

import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { publicMetadata } from "@/config/seo";
import { getPublicCatalog } from "@/lib/catalog/public";
import { getVisitorPricing } from "@/lib/catalog/visitor";
import { categoryHref, productHref } from "@/lib/catalog/urls";
import ProductImage from "@/components/catalog/ProductImage";
import WholesaleAccess from "@/components/catalog/WholesaleAccess";

type Props = { params: Promise<{ slug: string }> };
async function findProduct(slug: string) {
  const catalog = await getPublicCatalog();
  if (catalog.status === "unavailable") throw new Error("Catalog temporarily unavailable.");
  const product = catalog.products.find((item) => item.slug === slug || item.catalogKey === slug);
  if (!product) notFound();
  if (product.slug !== slug) permanentRedirect(productHref(product.slug));
  return product;
}

export async function generateMetadata({ params }: Props) {
  const product = await findProduct((await params).slug);
  const metadata = publicMetadata(productHref(product.slug) as `/products/${string}`, `${product.name} | Big Wicks Fireworks`,
    product.description?.replace(/\s+/g, " ").slice(0, 160) ?? `${product.name}${product.brand ? ` by ${product.brand}` : ""}. View product details at Big Wicks Fireworks in La Porte, Indiana.`);
  if (product.image) {
    metadata.openGraph = { ...metadata.openGraph, images: [{ url: product.image.url, alt: product.image.alt }] };
    metadata.twitter = { ...metadata.twitter, images: [product.image.url] };
  }
  return metadata;
}

export default async function ProductPage({ params }: Props) {
  const product = await findProduct((await params).slug);
  const pricing = await getVisitorPricing();
  const customerProduct = pricing?.products.find((item) => item.catalogKey === product.catalogKey);
  const price = customerProduct?.price;
  return <>
    <nav aria-label="Breadcrumb" className="product-breadcrumb"><Link href="/products" prefetch={false}>All fireworks</Link>
      {product.category && <><span aria-hidden="true">/</span><Link href={categoryHref(product.category.id)} prefetch={false}>{product.category.name}</Link></>}
    </nav>
    <article>
      <div className="product-detail-grid">
        <div className="product-detail-image"><ProductImage image={product.image} /></div>
        <div className="product-detail-copy">
          <p className="public-kicker">{product.category?.name ?? "Fireworks"}</p><h1>{product.name}</h1>
          <dl><div><dt>Item number</dt><dd>{product.sku}</dd></div>
            {product.brand && <div><dt>Brand</dt><dd>{product.brand}</dd></div>}
            {customerProduct?.packing && <div><dt>Case packing</dt><dd>{customerProduct.packing}</dd></div>}
          </dl>
          {product.description && <p className="product-description">{product.description}</p>}
          {!pricing && <Link className="product-visit" href="/#visit">Plan your store visit <span aria-hidden="true">→</span></Link>}
          <WholesaleAccess customer={pricing !== null} price={price} unavailable={pricing?.status === "unavailable"} />
          {pricing?.status === "ready" && price === undefined && <p>Wholesale pricing for this product is not currently available for your account.</p>}
          <p className="product-availability">Selection varies. <Link href="/contact">Contact the store</Link> for current availability.</p>
        </div>
      </div>
      {product.video && <section className="product-video" aria-labelledby="video-heading">
        <h2 id="video-heading">See it in action</h2>
        <iframe src={product.video.embedUrl} title={`${product.name} demonstration on ${product.video.provider}`} loading="lazy"
          allow="fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation" />
      </section>}
    </article>
  </>;
}

import Link from "next/link";

export default function WholesaleAccess({ customer, price, unavailable = false }: { customer: boolean; price?: string; unavailable?: boolean }) {
  return <div className="product-wholesale">
    {customer ? <>
      {price !== undefined && <p>Your case price <strong data-testid="product-price">{price}</strong></p>}
      {unavailable && <p>Wholesale pricing is temporarily unavailable. Please try again later.</p>}
      <Link href="/portal" prefetch={false}>Open wholesale catalog to order <span aria-hidden="true">→</span></Link>
    </> : <Link href="/account" prefetch={false}>Wholesale customer sign in <span aria-hidden="true">→</span></Link>}
  </div>;
}

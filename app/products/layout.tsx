import "../public.css";
import "./products.css";

// Responses may contain authorized customer pricing: never prerender or share.
export const dynamic = "force-dynamic";

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-site product-pages"><div className="public-container">{children}</div></div>;
}

import Image from "next/image";
import Link from "next/link";
import { fireworksCategories } from "@/data/fireworks";
import { getPublicCatalog, publicCategories } from "@/lib/catalog/public";
import { categoryHref } from "@/lib/catalog/urls";
import ProductImage from "@/components/catalog/ProductImage";

const CategorySection = async () => {
  const catalog = await getPublicCatalog();
  const categories = publicCategories(catalog.products);
  const cards = categories.length ? categories.map((category) => ({
    id: category.id, title: category.name, href: categoryHref(category.id), description: "Explore products and see the details.",
    image: "/images/store/big-wicks-interior-overview.jpg", alt: "Inside the Big Wicks Fireworks store", position: "center",
    productImage: catalog.products.find((product) => product.category?.id === category.id && product.image)?.image ?? null,
  })) : fireworksCategories.map((category) => ({ ...category, id: category.title, productImage: null }));
  return (
  <>
    <div className="selection-heading">
      <div>
        <p className="public-kicker">On the shelves</p>
        <h2 className="public-title">
          Find your
          <br />
          kind of boom.
        </h2>
      </div>
      <p>
        Big cakes. Bright fountains. Backyard favorites.
        <br />
        Take a look around, then come explore it all in store.
      </p>
    </div>
    <div className="category-grid">
      {cards.map((category) => (
        <article key={category.id} className="category-card">
          <div className="category-image">
            {category.productImage ? <ProductImage image={category.productImage} /> : <Image
              src={category.image}
              alt={category.alt}
              fill
              style={{ objectPosition: category.position }}
              sizes="(max-width: 1023px) 50vw, (max-width: 1280px) 25vw, 290px"
            />}
          </div>
          <div className="category-body">
            <h3>{category.title}</h3>
            <p>{category.description}</p>
            <Link
              href={category.href}
              className="category-action"
              prefetch={false}
              aria-label={categories.length ? `Browse ${category.title}` : `Browse catalog — ${category.title}`}
            >
              {categories.length ? "Browse products" : "Browse catalog"} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </article>
      ))}
    </div>
    <div className="selection-footnote">
      <p>Selection varies. Call or stop in for current availability.</p>
    </div>
  </>
  );
};
export default CategorySection;

import Image from "next/image";
import Link from "next/link";
import { fireworksCategories } from "@/data/fireworks";

const CategorySection = () => (
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
      {fireworksCategories.map((category) => (
        <article key={category.title} className="category-card">
          <div className="category-image">
            <Image
              src={category.image}
              alt={category.alt}
              fill
              style={{ objectPosition: category.position }}
              sizes="(max-width: 1023px) 50vw, (max-width: 1280px) 25vw, 290px"
            />
          </div>
          <div className="category-body">
            <h3>{category.title}</h3>
            <p>{category.description}</p>
            <Link
              href={category.href}
              className="category-action"
              aria-label={`Browse ${category.title} in store`}
            >
              Browse in store <span aria-hidden="true">↗</span>
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
export default CategorySection;

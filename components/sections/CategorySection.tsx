import Image from "next/image";
import Link from "next/link";
import { fireworksCategories } from "@/data/fireworks";

const featured = [
  fireworksCategories[0],
  fireworksCategories[2],
  fireworksCategories[1],
  fireworksCategories[3],
];

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
    <div className="category-editorial">
      {featured.map((category, index) => (
        <article
          key={category.title}
          className={"category-feature category-feature-" + index}
        >
          <Image
            src={category.image}
            alt={category.alt}
            fill
            style={{ objectPosition: category.position }}
            sizes={
              index < 2
                ? "(max-width: 767px) 100vw, (max-width: 1280px) 50vw, 608px"
                : "(max-width: 767px) 50vw, (max-width: 1280px) 25vw, 296px"
            }
          />
          <div className="category-caption">
            <h3>{category.title}</h3>
            <p>{category.description}</p>
          </div>
        </article>
      ))}
    </div>
    <div className="category-supporting">
      {fireworksCategories.slice(4).map((category) => (
        <article key={category.title}>
          <div className="category-thumbnail">
            <Image
              src={category.image}
              alt={category.alt}
              fill
              style={{ objectPosition: category.position }}
              sizes="(max-width: 767px) 44vw, (max-width: 1280px) 23vw, 284px"
            />
          </div>
          <h3>{category.title}</h3>
          <p>{category.description}</p>
        </article>
      ))}
    </div>
    <div className="selection-footnote">
      <p>Selection varies. Call or stop in for current availability.</p>
      <Link href="/#visit" className="public-text-link">
        Come see it in store <span aria-hidden="true">↗</span>
      </Link>
    </div>
  </>
);
export default CategorySection;

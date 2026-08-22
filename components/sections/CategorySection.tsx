import Image from "next/image";
import Link from "next/link";
import { fireworksCategories } from "@/data/fireworks";

const CategorySection = () => (
  <div>
    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div className="max-w-4xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-(--red)">
          Shop by category
        </p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171719] md:text-7xl">
          Find your kind of boom
        </h2>
      </div>
      <p className="max-w-md leading-7 text-[#5f5d59]">
        Come in with a plan or let our friendly staff help you find the perfect
        fireworks for your celebration. We have a huge selection of fireworks
        for all ages and experience levels, from beginner to experienced.
      </p>
    </div>

    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {fireworksCategories.map((category) => (
        <article
          key={category.title}
          className="group overflow-hidden rounded-[7px] border border-[#d3d3cf] bg-white transition-colors duration-200 hover:border-(--red)"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-[#ecece8]">
            <Image
              src={category.image}
              alt={category.alt}
              fill
              style={{ objectPosition: category.position }}
              className="object-cover transition duration-500 group-hover:scale-[1.035]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          </div>
          <div className="flex min-h-44 flex-col p-5">
            <h3 className="font-heading text-2xl font-bold uppercase leading-none text-[#171719]">
              {category.title}
            </h3>
            <p className="mt-3 flex-1 text-sm leading-6 text-[#615f5b]">
              {category.description}
            </p>
            <Link
              href="/#visit"
              className="mt-5 flex items-center justify-between border-t border-[#dfdfdb] pt-4 text-xs font-bold uppercase tracking-[0.08em] text-(--red)"
            >
              Browse in store{" "}
              <span
                className="text-base transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </div>
        </article>
      ))}
    </div>

    <p className="mt-7 max-w-3xl border-l-4 border-(--red) pl-4 text-sm leading-6 text-[#66635f]">
      Product selection and availability may vary. Visit or contact the store
      for current inventory.
    </p>
  </div>
);

export default CategorySection;

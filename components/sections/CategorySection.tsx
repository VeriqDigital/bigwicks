import Image from "next/image";
import Link from "next/link";
import { fireworksCategories } from "@/data/fireworks";

const CategorySection = () => (
  <div>
    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div className="max-w-4xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-(--accent)">Shop by category</p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-white md:text-7xl">Find your kind of boom</h2>
      </div>
      <p className="max-w-md leading-7 text-[#b9b1aa]">Start with the effect you have in mind, then let our team help you compare the selection available in store.</p>
    </div>

    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {fireworksCategories.map((category) => (
        <article key={category.title} className="group overflow-hidden rounded-[7px] border border-[#433b35] bg-[#211d1a] transition duration-300 hover:-translate-y-1 hover:border-(--accent) hover:shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          <div className="relative aspect-[4/3] overflow-hidden bg-[#29231f]">
            <Image src={category.image} alt={category.alt} fill style={{ objectPosition: category.position }} className="object-cover transition duration-500 group-hover:scale-[1.035]" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
            <span className="absolute left-0 top-0 bg-(--red) px-3 py-2 text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-white">In-store category</span>
          </div>
          <div className="flex min-h-44 flex-col border-t-4 border-t-(--red) p-5">
            <h3 className="font-heading text-2xl font-bold uppercase leading-none text-white">{category.title}</h3>
            <p className="mt-3 flex-1 text-sm leading-6 text-[#b9b1aa]">{category.description}</p>
            <Link href="/#visit" className="mt-5 flex items-center justify-between border-t border-[#443c36] pt-4 text-xs font-bold uppercase tracking-[0.13em] text-(--accent)">
              Browse in store <span className="flex size-8 items-center justify-center rounded-[3px] bg-(--accent) text-base text-[#171411] transition group-hover:bg-(--red) group-hover:text-white" aria-hidden="true">→</span>
            </Link>
          </div>
        </article>
      ))}
    </div>

    <p className="mt-7 max-w-3xl border-l-2 border-(--red) pl-4 text-sm leading-6 text-[#9e968f]">Photography shows real Big Wicks shelves and displays. Images are not tied to live inventory; product listings, prices, and stock status remain part of the future catalog.</p>
  </div>
);

export default CategorySection;

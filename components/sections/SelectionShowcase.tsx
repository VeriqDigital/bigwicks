import Image from "next/image";

const SelectionShowcase = () => (
  <div>
    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div className="max-w-4xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-(--red)">
          Proof of selection
        </p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171719] md:text-7xl">
          We have it all
        </h2>
      </div>
      <p className="max-w-md leading-7 text-[#625f5b]">
        Bright shelves, long aisles, and options for different kinds of
        celebrations. We carry everythin! From well known brands like Winda,
        Miracle, Brothers, and World-Class Fireworks to our own Big Wicks brand,
        we have a huge selection of fireworks for all ages and experience
        levels.
      </p>
    </div>

    <div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
      <figure className="relative min-h-[390px] overflow-hidden rounded-[7px] border border-[#d5d5d0] sm:min-h-[520px] lg:min-h-[640px]">
        <Image
          src="/images/store/big-wicks-interior-overview.jpg"
          alt="Wide elevated view across the fully stocked Big Wicks Fireworks store"
          fill
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 68vw"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-7 pt-28">
          <figcaption className="max-w-xl font-heading text-2xl font-bold uppercase text-white sm:text-3xl">
            A full store built around choice
          </figcaption>
        </div>
      </figure>
      <figure className="relative min-h-[480px] overflow-hidden rounded-[7px] border border-[#d5d5d0] lg:min-h-[640px]">
        <Image
          src="/images/store/big-wicks-interior-aisle-cakes.jpg"
          alt="A colorful aisle stacked high with fireworks inside Big Wicks"
          fill
          className="object-cover object-[center_48%]"
          sizes="(max-width: 1024px) 100vw, 32vw"
        />
        <div className="absolute inset-x-0 bottom-0 bg-[#111113]/92 p-6 backdrop-blur-sm">
          <figcaption className="text-sm font-bold leading-6 text-[#eee9e2]">
            Real shelves. Real variety. Helpful people nearby when you want to
            compare.
          </figcaption>
        </div>
      </figure>
    </div>
  </div>
);

export default SelectionShowcase;

import Image from "next/image";
import Button from "@/components/ui/Button";
import { customerPriorities } from "@/data/fireworks";
import { siteConfig } from "@/config/site";

const featureSlots = [
  { eyebrow: "Current value", title: "In-store deals", description: "Promotions can change quickly. Stop in or call for verified current specials and discounts.", action: "Get directions", href: siteConfig.contact.mapUrl },
  { eyebrow: "Team favorites", title: "Staff picks", description: "Tell us the effect and experience you want. Our team can point you toward standout choices in the store.", action: "Call the store", href: siteConfig.contact.phoneHref },
  { eyebrow: "Catalog preview", title: "New & seasonal", description: "This space is ready for new arrivals and seasonal highlights once live product data is connected.", action: "Explore categories", href: "/#shop" },
] as const;

export const DealsSection = () => (
  <div>
    <div className="flex max-w-5xl flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#a92128]">Deals & featured picks</p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171411] md:text-6xl">More spark for your spend</h2>
      </div>
      <p className="max-w-md leading-7 text-[#5f5852]">Big Wicks is known for value-focused offers, including BOGO deals. Current offer details are confirmed in store rather than guessed online.</p>
    </div>

    <div className="mt-12 grid gap-5 lg:grid-cols-3">
      {featureSlots.map((slot, index) => (
        <article key={slot.title} className="relative flex min-h-80 flex-col overflow-hidden rounded-[7px] border border-[#c9c2b7] bg-[#faf8f2] p-7 shadow-[0_14px_35px_rgba(33,27,22,0.07)] sm:p-8">
          <span className="absolute inset-x-0 top-0 flex h-1" aria-hidden="true"><span className="w-1/3 bg-(--red)" /><span className="flex-1 bg-(--accent)" /></span>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a92128]">{slot.eyebrow}</p>
            <span className="flex size-10 items-center justify-center rounded-[3px] bg-(--accent) font-heading text-lg font-bold text-[#171411]">0{index + 1}</span>
          </div>
          <h3 className="mt-8 font-heading text-3xl font-bold uppercase leading-none text-[#171411]">{slot.title}</h3>
          <p className="mt-4 flex-1 leading-7 text-[#5f5852]">{slot.description}</p>
          <a href={slot.href} className="group mt-7 flex items-center justify-between border-t border-[#d7d1c7] pt-5 text-xs font-extrabold uppercase tracking-[0.13em] text-[#171411]">
            {slot.action}<span className="text-xl text-[#a92128] transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </a>
        </article>
      ))}
    </div>
  </div>
);

export const AboutSection = () => (
  <div className="grid gap-12 lg:grid-cols-[1.22fr_0.78fr] lg:items-center">
    <div className="relative min-h-[420px] overflow-hidden rounded-[7px] border border-[#453c35] bg-[#211d1a] sm:min-h-[520px] lg:min-h-[590px]">
      <Image src="/images/store/big-wicks-storefront-night.jpg" alt="Big Wicks Fireworks storefront illuminated at night in La Porte, Indiana" fill className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 62vw" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b0a09] via-[#0b0a09]/70 to-transparent p-7 pt-36 sm:p-9 sm:pt-40">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-(--accent)">A real local store on IN-39</p>
        <p className="mt-2 max-w-xl font-heading text-3xl font-bold uppercase leading-none text-white sm:text-4xl">Three miles south of downtown New Buffalo</p>
      </div>
      <div className="absolute left-0 top-8 h-16 w-1.5 bg-(--red)" aria-hidden="true" />
    </div>

    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-(--accent)">About Big Wicks</p>
      <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-white md:text-6xl">The local alternative to the giant chains</h2>
      <p className="mt-7 text-lg leading-8 text-[#c1b9b1]">Big Wicks is one of Indiana&apos;s newer retail fireworks destinations, located in La Porte just 3 miles south of downtown New Buffalo. Inside, you&apos;ll find an organized store, a broad selection, and people ready to help.</p>
      <p className="mt-5 leading-7 text-[#a69e97]">Whether you&apos;re planning a family celebration or looking for something with more impact, the goal is simple: make it easier to leave with fireworks you&apos;re excited to light.</p>
      <div className="mt-8"><Button href={siteConfig.contact.mapUrl} newTab variant="secondary">Plan Your Visit</Button></div>
    </div>
  </div>
);

export const SelectionShowcase = () => (
  <div>
    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div className="max-w-4xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-(--accent)">Proof of selection</p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-white md:text-7xl">That place is loaded</h2>
      </div>
      <p className="max-w-md leading-7 text-[#b9b1aa]">Bright shelves, long aisles, and options for different kinds of celebrations. The variety is easier to understand when you see the real store.</p>
    </div>

    <div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
      <figure className="relative min-h-[390px] overflow-hidden rounded-[7px] border border-[#463d36] sm:min-h-[520px] lg:min-h-[640px]">
        <Image src="/images/store/big-wicks-interior-overview.jpg" alt="Wide elevated view across the fully stocked Big Wicks Fireworks store" fill className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 68vw" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-7 pt-28">
          <figcaption className="max-w-xl font-heading text-2xl font-bold uppercase text-white sm:text-3xl">A full store built around choice</figcaption>
        </div>
      </figure>
      <figure className="relative min-h-[480px] overflow-hidden rounded-[7px] border border-[#463d36] lg:min-h-[640px]">
        <Image src="/images/store/big-wicks-interior-aisle-cakes.jpg" alt="A colorful aisle stacked high with fireworks inside Big Wicks" fill className="object-cover object-[center_48%]" sizes="(max-width: 1024px) 100vw, 32vw" />
        <div className="absolute inset-x-0 top-0 flex h-1.5" aria-hidden="true"><span className="w-1/3 bg-(--red)" /><span className="flex-1 bg-(--accent)" /></div>
        <div className="absolute inset-x-0 bottom-0 bg-[#15120f]/92 p-6 backdrop-blur-sm">
          <figcaption className="text-sm font-bold leading-6 text-[#eee9e2]">Real shelves. Real variety. Helpful people nearby when you want to compare.</figcaption>
        </div>
      </figure>
    </div>
  </div>
);

export const WhyChooseSection = () => (
  <div>
    <div className="grid gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-end">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#a92128]">Customer feedback themes</p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171411] md:text-6xl">Why shoppers make the drive</h2>
      </div>
      <p className="leading-7 text-[#655e58]">A clear pattern across customer feedback: more choice, useful guidance, and a personal experience that feels different from a giant chain.</p>
    </div>

    <div className="mt-12 grid gap-5 lg:grid-cols-3">
      {customerPriorities.map((item, index) => (
        <article key={item.title} className="relative min-h-72 overflow-hidden rounded-[7px] border border-[#cbc4b9] bg-[#faf8f2] p-7 shadow-[0_14px_35px_rgba(33,27,22,0.06)] sm:p-8">
          <span className="absolute right-0 top-0 h-20 w-1.5 bg-(--red)" aria-hidden="true" />
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a92128]">{item.label}</span>
            <span className="font-heading text-3xl font-bold text-[#d0c9bf]">0{index + 1}</span>
          </div>
          <div className="mt-7 h-1 w-12 bg-(--accent)" aria-hidden="true" />
          <h3 className="mt-6 font-heading text-2xl font-bold uppercase leading-none text-[#171411]">{item.title}</h3>
          <p className="mt-4 leading-7 text-[#625b55]">{item.description}</p>
        </article>
      ))}
    </div>
  </div>
);

export const DemoSection = () => (
  <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
    <figure className="relative min-h-[580px] overflow-hidden rounded-[7px] border border-[#453c35] bg-[#211d1a] lg:min-h-[650px]">
      <Image src="/images/store/big-wicks-checkout-demo-tv.jpg" alt="Large in-store television above the Big Wicks checkout and fireworks display" fill className="object-cover object-[center_25%]" sizes="(max-width: 1024px) 100vw, 55vw" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b0a09] via-[#0b0a09]/80 to-transparent p-7 pt-32">
        <figcaption className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.16em] text-white"><span className="flex size-9 items-center justify-center rounded-[3px] bg-(--red) text-(--accent)" aria-hidden="true">▶</span> In-store video demonstration area</figcaption>
      </div>
    </figure>

    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-(--accent)">See the effect</p>
      <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-white md:text-6xl">Know what you&apos;re bringing home</h2>
      <p className="mt-7 text-lg leading-8 text-[#c1b9b1]">A package can only tell you so much. Big Wicks has used the large in-store TV to help customers see how particular fireworks look when fired.</p>
      <p className="mt-5 leading-7 text-[#a69e97]">Ask our team whether a demonstration is available for the item you&apos;re considering. This does not imply that every product currently has a video.</p>
      <div className="mt-7 rounded-[7px] border border-[#433a34] bg-[#1d1917] p-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-(--red)">Future catalog ready</p>
        <p className="mt-2 text-sm leading-6 text-[#bdb5ad]">The product-page architecture can add verified demo videos later without changing this in-store promise.</p>
      </div>
      <div className="mt-8"><Button href={siteConfig.contact.phoneHref} variant="secondary">Ask The Team</Button></div>
    </div>
  </div>
);

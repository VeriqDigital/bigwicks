import Image from "next/image";
import Button from "@/components/ui/Button";
import { customerPriorities } from "@/data/fireworks";
import { siteConfig } from "@/config/site";

const featureSlots = [
  {
    eyebrow: "Current value",
    title: "In-store deals",
    description:
      "Promotions can change quickly. Stop in or call for verified current specials and discounts.",
    action: "Get directions",
    href: siteConfig.contact.mapUrl,
  },
  {
    eyebrow: "Team favorites",
    title: "Staff picks",
    description:
      "Tell us the effect and experience you want. Our team can point you toward standout choices in the store.",
    action: "Call the store",
    href: siteConfig.contact.phoneHref,
  },
  {
    eyebrow: "In-store selection",
    title: "New & seasonal",
    description:
      "Call or visit to ask what is new and available for the season.",
    action: "Explore categories",
    href: "/#shop",
  },
] as const;

export const DealsSection = () => (
  <div>
    <div className="flex max-w-5xl flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-(--red)">
          Deals & featured picks
        </p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171411] md:text-6xl">
          More spark for your spend
        </h2>
      </div>
      <p className="max-w-md leading-7 text-[#5f5852]">
        Big Wicks is known for value-focused offers, including BOGO deals.
        Current offer details are confirmed in store rather than guessed online.
      </p>
    </div>

    <div className="mt-12 grid gap-5 lg:grid-cols-3">
      {featureSlots.map((slot) => (
        <article
          key={slot.title}
          className="flex min-h-80 flex-col rounded-[7px] border border-[#d5d5d0] bg-white p-7 sm:p-8"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-(--red)">
            {slot.eyebrow}
          </p>
          <h3 className="mt-6 font-heading text-3xl font-bold uppercase leading-none text-[#171411]">
            {slot.title}
          </h3>
          <p className="mt-4 flex-1 leading-7 text-[#5f5852]">
            {slot.description}
          </p>
          <a
            href={slot.href}
            className="group mt-7 flex items-center justify-between border-t border-[#deded9] pt-5 text-xs font-extrabold uppercase tracking-[0.1em] text-(--red)"
          >
            {slot.action}
            <span
              className="text-xl transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </a>
        </article>
      ))}
    </div>
  </div>
);

export const AboutSection = () => (
  <div className="grid gap-12 lg:grid-cols-[1.22fr_0.78fr] lg:items-center">
    <div className="relative min-h-[420px] overflow-hidden rounded-[7px] border border-[#3a3a3f] bg-[#18181b] sm:min-h-[520px] lg:min-h-[590px]">
      <Image
        src="/images/store/big-wicks-storefront-night.jpg"
        alt="Big Wicks Fireworks storefront illuminated at night in La Porte, Indiana"
        fill
        className="object-cover object-center"
        sizes="(max-width: 1024px) 100vw, 62vw"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/70 to-transparent p-7 pt-36 sm:p-9 sm:pt-40">
        <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-[#ff5a65]">
          A real local store on IN-39
        </p>
        <p className="mt-2 max-w-xl font-heading text-3xl font-bold uppercase leading-none text-white sm:text-4xl">
          Three miles south of downtown New Buffalo
        </p>
      </div>
    </div>

    <div>
      <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-[#ff5a65]">
        About Big Wicks
      </p>
      <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-white md:text-6xl">
        The local alternative to the giant chains
      </h2>
      <p className="mt-7 text-lg leading-8 text-[#d0d0cd]">
        Big Wicks is one of Indiana&apos;s newer retail fireworks destinations,
        located in La Porte just 3 miles south of downtown New Buffalo. Inside,
        you&apos;ll find an organized store, a broad selection, and people ready
        to help.
      </p>
      <p className="mt-5 leading-7 text-[#aaa9a5]">
        Whether you&apos;re planning a family celebration or looking for
        something with more impact, the goal is simple: make it easier to leave
        with fireworks you&apos;re excited to light.
      </p>
      <div className="mt-8">
        <Button href={siteConfig.contact.mapUrl} newTab variant="secondary">
          Plan Your Visit
        </Button>
      </div>
    </div>
  </div>
);

export const SelectionShowcase = () => (
  <div>
    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div className="max-w-4xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-(--red)">
          Proof of selection
        </p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171719] md:text-7xl">
          That place is loaded
        </h2>
      </div>
      <p className="max-w-md leading-7 text-[#625f5b]">
        Bright shelves, long aisles, and options for different kinds of
        celebrations. The variety is easier to understand when you see the real
        store.
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

const ValueIcon = ({ index }: { index: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-7"
    aria-hidden="true"
  >
    {index === 0 ? (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ) : index === 1 ? (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ) : (
      <>
        <path d="M20 13 11 22l-9-9V3h10Z" />
        <circle cx="7" cy="8" r="1.5" />
      </>
    )}
  </svg>
);

export const WhyChooseSection = () => (
  <div>
    <div className="grid gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-end">
      <div>
        <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-(--red)">
          Customer feedback themes
        </p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171411] md:text-6xl">
          Why shoppers make the drive
        </h2>
      </div>
      <p className="leading-7 text-[#655e58]">
        A clear pattern across customer feedback: more choice, useful guidance,
        and a personal experience that feels different from a giant chain.
      </p>
    </div>

    <div className="mt-12 grid gap-5 lg:grid-cols-3">
      {customerPriorities.map((item, index) => (
        <article
          key={item.title}
          className="min-h-72 rounded-[7px] border border-[#d5d5d0] bg-white p-7 sm:p-8"
        >
          <div className="flex size-10 items-center justify-center text-(--red)">
            <ValueIcon index={index} />
          </div>
          <h3 className="mt-7 font-heading text-2xl font-bold uppercase leading-none text-[#171411]">
            {item.title}
          </h3>
          <p className="mt-4 leading-7 text-[#625b55]">{item.description}</p>
        </article>
      ))}
    </div>
  </div>
);

export const DemoSection = () => (
  <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
    <div className="overflow-hidden rounded-[7px] border border-[#3a3a3f] bg-black">
      <video
        controls
        preload="metadata"
        playsInline
        poster="/images/store/video_thumbnail.jpg"
        className="aspect-video w-full bg-black object-contain lg:min-h-[500px]"
        aria-label="Big Wicks fireworks product demonstration"
      >
        <source src="/product_demo.mp4" type="video/mp4" />
        Your browser does not support HTML5 video.
      </video>
    </div>

    <div>
      <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-[#ff5a65]">
        See the effect
      </p>
      <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-white md:text-6xl">
        Know what you&apos;re bringing home
      </h2>
      <p className="mt-7 text-lg leading-8 text-[#d0d0cd]">
        See a real firework in action before you plan your show. This video
        gives you a clear look at the effect, timing, and overall feel.
      </p>
      <p className="mt-5 leading-7 text-[#aaa9a5]">
        Have questions about how different products compare? Our team can
        explain what to expect and help you put together the right mix for your
        celebration.
      </p>
      <div className="mt-8">
        <Button href={siteConfig.contact.phoneHref} variant="secondary">
          Ask The Team
        </Button>
      </div>
    </div>
  </div>
);

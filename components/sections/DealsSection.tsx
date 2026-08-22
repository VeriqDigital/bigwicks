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
      "Check back for seasonal highlights and featured picks from the store.",
    action: "Explore categories",
    href: "/#shop",
  },
] as const;

const DealsSection = () => (
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

export default DealsSection;

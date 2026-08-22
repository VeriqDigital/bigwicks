import Image from "next/image";
import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const LocationSection = () => (
  <div>
    <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
      <div>
        <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-(--red)">
          Visit Big Wicks
        </p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171411] md:text-6xl">
          Where to find us
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f5852]">
          We are right on IN-39 in La Porte, about 3 miles south of downtown New
          Buffalo, Michigan.
        </p>

        <address className="mt-8 rounded-[7px] border border-[#d5d5d0] bg-white p-6 not-italic">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a92128]">
            Big Wicks Fireworks LLC
          </p>
          <p className="mt-4 text-xl font-bold leading-7 text-[#171411]">
            {siteConfig.contact.addressLine1}
            <br />
            {siteConfig.contact.city}, {siteConfig.contact.state}{" "}
            {siteConfig.contact.postalCode}
          </p>
          <a
            href={siteConfig.contact.phoneHref}
            className="mt-4 block text-xl font-bold text-[#a92128] hover:text-(--red-hover)"
          >
            {siteConfig.contact.phone}
          </a>
        </address>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button href={siteConfig.contact.mapUrl} newTab>
            Get Directions
          </Button>
          <Button href={siteConfig.contact.phoneHref} variant="dark">
            Call The Store
          </Button>
        </div>
      </div>

      <figure className="relative min-h-[540px] overflow-hidden rounded-[7px] border border-[#bdb6ab] bg-[#ded9d0] lg:min-h-[620px]">
        <Image
          src="/images/store/big-wicks-storefront-front.jpg"
          alt="Front of the Big Wicks Fireworks store on IN-39 in La Porte"
          fill
          className="object-cover object-[center_24%]"
          sizes="(max-width: 1024px) 100vw, 60vw"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-7 pt-28">
          <figcaption className="text-sm font-bold text-white">
            Look for the red trim and Big Wicks sign
          </figcaption>
        </div>
      </figure>
    </div>

    <div className="mt-12 grid overflow-hidden rounded-[7px] border border-[#bdb6ab] bg-white lg:grid-cols-[0.62fr_1.38fr]">
      <div className="bg-[#19191c] p-7 text-white sm:p-9">
        <h3 className="font-heading text-3xl font-bold uppercase">
          Current listed hours
        </h3>
        <dl className="mt-6 space-y-3 text-sm">
          {siteConfig.hours.map(({ day, hours }) => (
            <div
              key={day}
              className="flex justify-between gap-5 border-b border-[#3a3a3f] pb-3 last:border-0"
            >
              <dt className="text-[#aaa9a5]">{day}</dt>
              <dd className="font-bold text-white">{hours}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs leading-5 text-[#92928f]">
          Hours may change seasonally. Call ahead to confirm before a long trip.
        </p>
      </div>
      <div className="min-h-[500px] bg-[#dedbd4]">
        <iframe
          src={siteConfig.contact.mapEmbedUrl}
          title="Map showing Big Wicks Fireworks in La Porte, Indiana"
          width="100%"
          height="100%"
          loading="lazy"
          className="min-h-[500px] border-0"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  </div>
);

export default LocationSection;

import Image from "next/image";
import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const AboutSection = () => (
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

export default AboutSection;

import Image from "next/image";
import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const Hero = () => (
  <section className="relative isolate min-h-[680px] overflow-hidden bg-[#151517] sm:min-h-[740px] lg:min-h-[860px] xl:min-h-[900px]">
    <Image
      src="/images/store/big-wicks-storefront-front.jpg"
      alt="The Big Wicks Fireworks storefront in La Porte, Indiana"
      fill
      className="-z-30 object-cover object-[center_38%] sm:object-[center_34%] lg:object-[center_26%] xl:object-[center_24%]"
      sizes="100vw"
      preload
      quality={90}
    />
    <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(14,14,16,0.84)_0%,rgba(14,14,16,0.67)_42%,rgba(14,14,16,0.36)_100%)] lg:bg-[linear-gradient(90deg,rgba(14,14,16,0.86)_0%,rgba(14,14,16,0.7)_28%,rgba(14,14,16,0.24)_48%,rgba(14,14,16,0.05)_64%,transparent_78%)]" />

    <div className="mx-auto flex min-h-[680px] w-full max-w-(--container-width) items-center px-6 py-16 sm:min-h-[740px] lg:min-h-[860px] xl:min-h-[900px]">
      <div className="max-w-[760px]">
        <p className="mb-6 text-sm font-bold text-white/90">
          Big Wicks Fireworks · La Porte, Indiana
        </p>
        <h1 className="text-balance font-heading text-[3.6rem] font-bold uppercase leading-[0.84] tracking-[-0.035em] text-white sm:text-7xl md:text-8xl lg:text-[6.7rem]">
          Skip the rest.
          <span className="mt-2 block text-[#ff5963]">Shop with the best.</span>
        </h1>
        <div className="mt-7 flex max-w-2xl gap-4">
          <span className="w-1 shrink-0 bg-(--red)" aria-hidden="true" />
          <p className="text-lg leading-8 text-white/90 sm:text-xl">
            A huge in-store selection for family fun, backyard celebrations, and
            finale-worthy nights brought to you by friendly people who can help
            you choose.
          </p>
        </div>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button href="/#shop">Shop Fireworks</Button>
          <Button href={siteConfig.contact.mapUrl} newTab variant="secondary">
            Visit The Store
          </Button>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/25 pt-5 text-xs font-bold uppercase tracking-[0.08em] text-white/80">
          <span>Open 7 days</span>
          <span>3 miles south of New Buffalo</span>
          <span>Helpful staff</span>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;

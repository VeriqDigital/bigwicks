import Image from "next/image";
import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const Hero = () => (
  <section className="relative isolate min-h-[680px] overflow-hidden border-b-4 border-(--red) bg-[#0c0b0a] sm:min-h-[740px] lg:min-h-[780px]">
    <Image
      src="/images/hero/big-wicks-fireworks-hero.png"
      alt="Gold and red fireworks filling a dark night sky"
      fill
      className="-z-30 object-cover object-[64%_center] lg:object-center"
      sizes="100vw"
      preload
      quality={100}
    />
    <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(10,9,8,0.98)_0%,rgba(10,9,8,0.93)_32%,rgba(10,9,8,0.55)_62%,rgba(10,9,8,0.16)_100%)]" />
    <div className="absolute inset-0 -z-20 bg-[linear-gradient(0deg,rgba(10,9,8,0.86)_0%,transparent_48%,rgba(10,9,8,0.22)_100%)]" />

    <div className="mx-auto flex min-h-[680px] w-full max-w-(--container-width) items-center px-6 py-16 sm:min-h-[740px] lg:min-h-[780px]">
      <div className="max-w-[760px]">
        <p className="mb-6 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.18em] text-(--accent)">
          <span className="h-1 w-9 bg-(--red)" aria-hidden="true" />
          Big Wicks Fireworks · La Porte, Indiana
        </p>
        <h1 className="text-balance font-heading text-[3.6rem] font-bold uppercase leading-[0.84] tracking-[-0.035em] text-white sm:text-7xl md:text-8xl lg:text-[6.7rem]">
          Go bigger.
          <span className="mt-2 block text-(--accent)">Burn brighter.</span>
        </h1>
        <div className="mt-7 flex max-w-2xl gap-4">
          <span className="w-1 shrink-0 bg-(--red)" aria-hidden="true" />
          <p className="text-lg leading-8 text-[#e0dbd4] sm:text-xl">A huge in-store selection for family fun, backyard celebrations, and finale-worthy nights—plus friendly people who can help you choose.</p>
        </div>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button href="/#shop">Shop Fireworks</Button>
          <Button href={siteConfig.contact.mapUrl} newTab variant="secondary">Visit The Store</Button>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/20 pt-5 text-xs font-bold uppercase tracking-[0.1em] text-[#d4d4d0]">
          <span><b className="mr-2 inline-block size-1.5 bg-(--red) align-middle" />Open 7 days</span>
          <span><b className="mr-2 inline-block size-1.5 bg-(--red) align-middle" />3 miles south of New Buffalo</span>
          <span><b className="mr-2 inline-block size-1.5 bg-(--red) align-middle" />Helpful staff</span>
        </div>
      </div>
    </div>

    <div className="absolute bottom-0 right-0 hidden bg-[#f1eee6] px-7 py-4 text-[#171411] shadow-[-8px_-8px_0_rgba(207,48,52,0.9)] lg:block">
      <p className="text-xs font-extrabold uppercase tracking-[0.15em]">Drive By The Rest… <span className="text-[#a8242a]">Stop At The Best!</span></p>
    </div>
    <div className="absolute inset-x-0 bottom-0 h-1 bg-(--accent)" aria-hidden="true" />
  </section>
);

export default Hero;

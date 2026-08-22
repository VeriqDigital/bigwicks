import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const ContactCtaSection = () => (
  <div className="brand-burst relative overflow-hidden rounded-[7px] border border-[#493f38] bg-[#171311] px-6 py-16 md:px-10 lg:px-14 lg:py-20">
    <div className="absolute inset-y-0 left-0 w-1.5 bg-(--accent)" aria-hidden="true" />
    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-(--red)" aria-hidden="true" />
    <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-(--accent)">Ready when you are</p>
        <h2 className="text-balance mt-4 max-w-4xl font-heading text-5xl font-bold uppercase leading-[0.9] text-white md:text-7xl">Your next show starts at Big Wicks</h2>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#bdb5ad]">Browse the categories, check the latest in-store deals, or stop by and let our team help you put together the right mix.</p>
      </div>
      <div className="flex min-w-56 flex-col gap-3">
        <Button href={siteConfig.contact.mapUrl} newTab>Get Directions</Button>
        <Button href={siteConfig.contact.phoneHref} variant="secondary">Call {siteConfig.contact.phone}</Button>
      </div>
    </div>
  </div>
);

export default ContactCtaSection;

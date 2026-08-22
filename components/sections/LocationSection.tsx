import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const LocationSection = () => (
  <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
    <div className="space-y-7">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-(--accent)">Service area</p>
        <h2 className="mt-4 font-heading text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl">Chicagoland roots. Midwest reach.</h2>
      </div>
      <p className="max-w-xl text-lg leading-8 text-[#aaa]">S&B Express is based in the Chicagoland area and provides dependable freight transportation throughout the Midwest. Tell us where your freight needs to go and when it needs to arrive.</p>
      <div className="border-l-2 border-(--accent) pl-5">
        <p className="font-heading text-xl font-black uppercase text-white">Primary coverage</p>
        <p className="mt-2 text-[#aaa]">{siteConfig.contact.serviceArea}</p>
      </div>
      <Button href={siteConfig.contact.mapUrl} newTab>View service area</Button>
      <div className="h-px bg-[#393939]" />
      <div>
        <h3 className="font-heading text-xl font-black uppercase text-white">Talk with dispatch</h3>
        <address className="mt-3 space-y-1 not-italic text-[#aaa]">
          <a href={siteConfig.contact.phoneHref} className="block font-heading text-2xl font-black text-white hover:text-(--accent)">{siteConfig.contact.phone}</a>
          <a href={siteConfig.contact.emailHref} className="block hover:text-white">{siteConfig.contact.email}</a>
        </address>
      </div>
    </div>
    <div className="min-h-[470px] overflow-hidden border border-[#3b3b3b] bg-[#202020] grayscale-[35%]">
      <iframe src={siteConfig.contact.mapEmbedUrl} title="S&B Express Chicagoland and Midwest freight service area" width="100%" height="100%" loading="lazy" className="min-h-[470px]" />
    </div>
  </div>
);

export default LocationSection;

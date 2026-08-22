import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const ContactCtaSection = () => (
  <div className="rounded-[7px] border border-[#303034] bg-[#151517] px-6 py-16 md:px-10 lg:px-14 lg:py-20">
    <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
      <div>
        <h2 className="text-balance max-w-4xl font-heading text-5xl font-bold uppercase leading-[0.9] text-white md:text-7xl">
          Your next show starts at Big Wicks
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
          Browse the categories, check the latest in-store deals, or stop by and
          let our team help you put together the right mix.
        </p>
      </div>
      <div className="flex min-w-56 flex-col gap-3">
        <Button href={siteConfig.contact.mapUrl} newTab>
          Get Directions
        </Button>
        <Button href={siteConfig.contact.phoneHref} variant="secondary">
          Call {siteConfig.contact.phone}
        </Button>
      </div>
    </div>
  </div>
);

export default ContactCtaSection;

import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const DemoSection = () => (
  <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
    <div className="overflow-hidden rounded-[7px] border border-[#3a3a3f] bg-black">
      <video
        controls
        preload="metadata"
        playsInline
        poster="/images/store/product-demo-poster.png"
        className="aspect-video w-full bg-black object-contain lg:min-h-[500px]"
        aria-label="Big Wicks fireworks product demonstration"
      >
        <source src="/videos/product-demo.mp4" type="video/mp4" />
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

export default DemoSection;

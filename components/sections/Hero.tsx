import Image from "next/image";
import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const Hero = () => (
  <section className="retail-hero">
    <div className="hero-photo">
      <Image
        src="/images/store/big-wicks-storefront-front.jpg"
        alt="The Big Wicks Fireworks storefront on IN-39 in La Porte, Indiana"
        fill
        sizes="(max-width: 767px) 100vw, 76vw"
        preload
        quality={90}
      />
    </div>
    <div className="public-container hero-content">
      <div className="hero-copy">
        <p className="hero-location">
          {siteConfig.shortName} <span>La Porte, Indiana</span>
        </p>
        <h1 className="hero-title">
          Skip the rest.
          <span>
            Shop with
            <br className="hero-break" /> the best.
          </span>
        </h1>
        <p className="hero-description">
          A huge selection. People who know fireworks.
          <br />
          Come find your next great show.
        </p>
        <div className="hero-actions">
          <Button href={siteConfig.contact.mapUrl} newTab>
            Get Directions
          </Button>
          <Button href="/#shop" variant="secondary">
            Explore The Selection
          </Button>
        </div>
        <p className="hero-proximity">{siteConfig.contact.proximity}</p>
      </div>
    </div>
  </section>
);
export default Hero;

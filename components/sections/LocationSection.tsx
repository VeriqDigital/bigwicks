import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const LocationSection = ({ newBuffalo = false }: { newBuffalo?: boolean }) => (
  <div className="public-container visit-layout">
    <div className="visit-top">
      <div className="visit-copy">
        <p className="public-kicker">La Porte, Indiana</p>
        <h2 className="public-title">
          {newBuffalo ? "Plan your visit." : <>Make us<br />your next stop.</>}
        </h2>
        <p className="visit-proximity">{newBuffalo ? siteConfig.contact.proximity : <Link className="underline underline-offset-4 hover:text-(--red)" href="/fireworks-near-new-buffalo-mi">{siteConfig.contact.proximity}</Link>}.</p>
        <address>
          <strong>{siteConfig.shortName}</strong>
          <span>
            {siteConfig.contact.addressLine1}
            <br />
            {siteConfig.contact.city}, {siteConfig.contact.state}{" "}
            {siteConfig.contact.postalCode}
          </span>
          <a href={siteConfig.contact.phoneHref}>{siteConfig.contact.phone}</a>
        </address>
        <div className="visit-actions">
          <Button href={siteConfig.contact.mapUrl} newTab>
            Get Directions
          </Button>
          <a href={siteConfig.contact.phoneHref} className="public-text-link">
            Call The Store <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <figure className="visit-store">
        <Image
          src="/images/store/big-wicks-storefront-night.jpg"
          alt="The illuminated Big Wicks sign and red-trimmed storefront on IN-39"
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1280px) 56vw, 665px"
        />
        <figcaption>Look for the Big Wicks sign.</figcaption>
      </figure>
    </div>
    <div className="visit-bottom">
      <div className="visit-hours">
        <h3>Open 7 days</h3>
        <dl>
          {siteConfig.hours.map(({ day, hours }) => (
            <div key={day}>
              <dt>{day}</dt>
              <dd>{hours}</dd>
            </div>
          ))}
        </dl>
        <p>Hours may change seasonally. Call to confirm before a long trip.</p>
      </div>
      <iframe
        src={siteConfig.contact.mapEmbedUrl}
        title="Map showing Big Wicks Fireworks in La Porte, Indiana"
        width="100%"
        height="420"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  </div>
);
export default LocationSection;

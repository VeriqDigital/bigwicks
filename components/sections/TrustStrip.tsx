import Link from "next/link";
import { siteConfig } from "@/config/site";

const TrustStrip = () => (
  <div className="quick-strip" aria-label="Store at a glance">
    <div className="public-container quick-strip-inner">
      <Link href="/#visit">
        <strong>Open 7 days</strong>
        <span>See store hours ↗</span>
      </Link>
      <div>
        <strong>Huge selection</strong>
        <span>Novelties to finales</span>
      </div>
      <a href={siteConfig.contact.phoneHref}>
        <strong>Helpful people</strong>
        <span>Call the store ↗</span>
      </a>
      <div className="quick-address">
        <strong>{siteConfig.contact.addressLine1}</strong>
        <span>{siteConfig.contact.city}, Indiana</span>
      </div>
    </div>
  </div>
);
export default TrustStrip;

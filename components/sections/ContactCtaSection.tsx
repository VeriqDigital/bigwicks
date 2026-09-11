import Button from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const ContactCtaSection = () => (
  <div className="public-container final-inner">
    <div>
      <p className="public-kicker">
        {siteConfig.shortName} · La Porte, Indiana
      </p>
      <h2>
        See you at
        <br />
        the store.
      </h2>
      <p>{siteConfig.contact.proximity}.</p>
    </div>
    <div className="final-actions">
      <Button href={siteConfig.contact.mapUrl} newTab>
        Get Directions
      </Button>
      <Button href={siteConfig.contact.phoneHref} variant="secondary">
        Call The Store
      </Button>
    </div>
  </div>
);
export default ContactCtaSection;

import { siteConfig } from "@/config/site";

const DealsSection = () => (
  <div className="public-container value-inner">
    <div>
      <p className="public-kicker">In-store value</p>
      <h2>
        More spark
        <br />
        for your spend.
      </h2>
    </div>
    <div className="value-copy">
      <p>
        Tell us your budget. Show us what catches your eye. We can help you
        compare the options and build your mix.
      </p>
      <a className="value-link" href={siteConfig.contact.phoneHref}>
        Ask about current deals <span aria-hidden="true">↗</span>
      </a>
      <span className="value-note">
        Current offers and details available in store.
      </span>
    </div>
  </div>
);
export default DealsSection;

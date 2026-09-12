import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import MobileActions from "@/components/layout/MobileActions";
import JsonLd from "@/components/seo/JsonLd";
import LandingFaq from "@/components/sections/LandingFaq";
import LocationSection from "@/components/sections/LocationSection";
import Button from "@/components/ui/Button";
import { publicMetadata, storefrontImage } from "@/config/seo";
import { siteConfig } from "@/config/site";
import { pageJsonLd } from "@/config/structured-data";
import { fireworksCategories } from "@/data/fireworks";
import { faqs } from "@/data/faq";
import "../public.css";
import "../landing.css";

const pageName = "Fireworks Near New Buffalo";
const description = "Visit Big Wicks Fireworks, 3 miles south of downtown New Buffalo on IN-39 in La Porte, Indiana. Explore the selection, check hours, and get directions.";
export const metadata = publicMetadata("/fireworks-near-new-buffalo-mi", "Fireworks Near New Buffalo, MI | Big Wicks Fireworks", description);

const visitFaqs = [
  { question: "How far is Big Wicks from downtown New Buffalo?", answer: `Big Wicks is ${siteConfig.contact.proximity}. The store is on IN-39 in La Porte, Indiana.` },
  faqs[0], faqs[2], faqs[4],
  { question: "Can I call before making the drive?", answer: `Yes. Call ${siteConfig.contact.phone} to ask about a particular item or confirm current hours before heading over.` },
  { question: "Are store hours seasonal?", answer: "The current schedule is listed above, with hours every day of the week. Hours may change seasonally, so call to confirm before a long trip." },
];

export default function NewBuffaloPage() {
  return (
    <div className="public-site landing-page">
      <JsonLd data={pageJsonLd("/fireworks-near-new-buffalo-mi", pageName, description)} />
      <section className="landing-hero">
        <div className="public-container">
          <Breadcrumbs current={pageName} />
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="public-kicker">Big Wicks · La Porte, Indiana</p>
              <h1>Fireworks near<br /><span>New Buffalo, Michigan.</span></h1>
              <p>Looking for fireworks while you&apos;re in New Buffalo? Find Big Wicks just south of town on IN-39, with a broad in-store selection and help choosing your next show.</p>
              <p className="landing-location">{siteConfig.contact.proximity}.<br />{siteConfig.contact.address}</p>
              <div className="landing-actions">
                <Button href={siteConfig.contact.mapUrl} newTab>Get Directions</Button>
                <a className="public-text-link" href={siteConfig.contact.phoneHref}>Call The Store ↗</a>
              </div>
              <a className="landing-inline-link" href="#visit">Open 7 days · View hours &amp; map ↓</a>
            </div>
            <figure className="landing-hero-photo">
              <Image src={storefrontImage} alt="The Big Wicks Fireworks storefront and sign on IN-39" fill preload sizes="(max-width: 767px) 100vw, 50vw" />
              <figcaption>A real store. A short drive south of town.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="public-container landing-editorial">
        <div>
          <p className="public-kicker">Why make the drive?</p>
          <h2 className="public-title">See the selection.<br />Talk to the team.</h2>
          <p>You can compare fireworks in person and get help putting together a selection for your celebration. Tell the team the effects and experience you have in mind, and they can help you explore the options.</p>
          <p>Ask about in-store value and current choices while you browse. If you&apos;re coming for a particular item, <a href={siteConfig.contact.phoneHref}>call ahead</a> to check before leaving New Buffalo.</p>
        </div>
        <figure className="landing-interior">
          <Image src="/images/store/big-wicks-interior-overview.jpg" alt="Fireworks displays and aisles inside Big Wicks" fill sizes="(max-width: 767px) 100vw, 50vw" />
        </figure>
      </section>

      <section className="landing-selection">
        <div className="public-container">
          <div className="landing-section-heading">
            <div><p className="public-kicker">What you&apos;ll find</p><h2 className="public-title">A starting point for your visit.</h2></div>
            <p>These are our in-store category groups. Selection can change; this is an overview to help you plan, with current availability confirmed by the store.</p>
          </div>
          <dl className="landing-categories">
            {fireworksCategories.map(({ title, description }) => <div key={title}><dt>{title}</dt><dd>{description}</dd></div>)}
          </dl>
          <Link className="public-text-link" href="/#shop">Explore the selection photos →</Link>
        </div>
      </section>

      <section id="visit" className="visit-section"><LocationSection newBuffalo /></section>
      <LandingFaq title="Before you head over" items={visitFaqs} />
      <section className="final-section">
        <div className="public-container final-inner">
          <div><p className="public-kicker">Your next stop on IN-39</p><h2>Come see Big Wicks.</h2></div>
          <div className="final-actions"><Button href={siteConfig.contact.mapUrl} newTab>Get Directions</Button><Link className="public-text-link" href="/contact">Contact the team →</Link></div>
        </div>
      </section>
      <MobileActions />
    </div>
  );
}

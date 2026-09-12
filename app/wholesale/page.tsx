import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import LandingFaq from "@/components/sections/LandingFaq";
import { publicMetadata } from "@/config/seo";
import { siteConfig } from "@/config/site";
import { pageJsonLd } from "@/config/structured-data";
import "../public.css";
import "../landing.css";

const description = "Learn how approved Big Wicks wholesale customers view assigned pricing, order full cases, and submit requests for staff review. Sign in or contact the team.";
export const metadata = publicMetadata("/wholesale", "Wholesale Fireworks Ordering | Big Wicks Fireworks", description);

const steps = [
  { title: "Start with an approved account", copy: "Contact Big Wicks about wholesale access. The team approves and sets up accounts; there is no public self-registration." },
  { title: "Sign in to see your pricing", copy: "Your approved account gives you access to the wholesale catalog and your assigned pricing. Wholesale prices are visible only after sign-in." },
  { title: "Choose your case quantities", copy: "Browse the available catalog and enter the number of full cases you want to request. Quantities mean cases, not individual pieces." },
  { title: "Review and submit your request", copy: "Review your selections, then submit an order request online. Submission does not reserve inventory or guarantee availability." },
  { title: "Finalize with Big Wicks", copy: "Staff reviews availability, discusses any changes, and confirms the final order with you. Payment is handled outside the website." },
];
const wholesaleFaqs = [
  { question: "Do I need an account to see wholesale pricing?", answer: "Yes. Wholesale prices are private. Sign in with an approved account to view the pricing assigned to you." },
  { question: "Can I create an account myself?", answer: "No. Big Wicks approves and sets up wholesale accounts. Contact the team to discuss access." },
  { question: "Are quantities individual pieces or cases?", answer: "Quantities represent full cases. Refer to the packing information in the signed-in catalog for the contents of a case." },
  { question: "Are orders paid online?", answer: "No. The website accepts order requests. Big Wicks handles finalization and payment outside the website." },
  { question: "What happens after I submit an order?", answer: "Big Wicks reviews your request and confirms availability and the final order with you. Items may require changes or substitutions; submitting a request does not reserve stock." },
  { question: "I already have an account. Where do I sign in?", answer: "Use Existing Customer Sign In on this page to open your account. Access requires an approved Big Wicks account." },
];

function WholesaleActions() {
  return <div className="landing-actions wholesale-actions"><Link href="/account" prefetch={false} className="wholesale-sign-in">Existing Customer Sign In</Link><Link href="/contact" className="public-text-link">Contact Big Wicks About Wholesale →</Link></div>;
}

export default function WholesalePage() {
  return (
    <div className="public-site landing-page wholesale-page">
      <JsonLd data={pageJsonLd("/wholesale", "Wholesale", description)} />
      <section className="landing-hero">
        <div className="public-container">
          <Breadcrumbs current="Wholesale" />
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="public-kicker">For approved wholesale customers</p>
              <h1>Wholesale fireworks ordering<br /><span>with Big Wicks.</span></h1>
              <p>Choose your cases online. Finalize with the people at Big Wicks. Approved customers can browse their catalog, see assigned pricing, and submit an order request for staff review.</p>
              <WholesaleActions />
              <p className="landing-location">New to Big Wicks? Contact the team about wholesale access.</p>
            </div>
            <figure className="landing-hero-photo">
              <Image src="/images/store/big-wicks-interior-aisle-cakes.jpg" alt="Shelves of fireworks inside the Big Wicks store" fill preload sizes="(max-width: 767px) 100vw, 50vw" />
              <figcaption>Big Wicks Fireworks · La Porte, Indiana</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="public-container wholesale-process">
        <div><p className="public-kicker">How it works</p><h2 className="public-title">From your account<br />to your order request.</h2><p>Online ordering keeps your selections together. The Big Wicks team stays involved through the final order.</p></div>
        <ol>{steps.map(({ title, copy }) => <li key={title}><h3>{title}</h3><p>{copy}</p></li>)}</ol>
      </section>

      <section className="wholesale-relationship">
        <div className="public-container landing-editorial">
          <div><p className="public-kicker">A store and a team you can reach</p><h2 className="public-title">Order with people<br />who know the selection.</h2><p>Big Wicks combines a broad fireworks selection with direct help from staff. Talk through your needs, ask about the catalog, and work with the team to finalize your request.</p><Link className="public-text-link" href="/">Get to know Big Wicks →</Link></div>
          <div className="wholesale-contact"><h3>{siteConfig.shortName}</h3><address>{siteConfig.contact.address}</address><a href={siteConfig.contact.phoneHref}>{siteConfig.contact.phone}</a><p>Have a wholesale question before you sign in? Call the store or <Link href="/contact">contact the team</Link>.</p></div>
        </div>
      </section>
      <LandingFaq title="Wholesale questions" items={wholesaleFaqs} />
      <section className="final-section"><div className="public-container final-inner"><div><p className="public-kicker">Already have an approved account?</p><h2>Start your request.</h2></div><WholesaleActions /></div></section>
    </div>
  );
}

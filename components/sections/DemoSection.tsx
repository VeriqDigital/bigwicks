import { siteConfig } from "@/config/site";

const DemoSection = () => (
  <div className="public-container demo-layout">
    <div className="demo-copy">
      <p className="public-kicker">See the effect</p>
      <h2>
        Know what
        <br />
        you&apos;re bringing
        <br />
        <span>home.</span>
      </h2>
      <p>
        Color. Timing. The big finish. Watch a real demonstration, then talk to
        our team about the effects you have in mind.
      </p>
      <a href={siteConfig.contact.phoneHref} className="public-text-link">
        Ask the team <span aria-hidden="true">↗</span>
      </a>
    </div>
    <figure className="demo-film">
      <video
        controls
        preload="none"
        playsInline
        poster="/images/store/product-demo-poster.png"
        aria-label="Big Wicks fireworks product demonstration"
      >
        <source src="/videos/product-demo.mp4" type="video/mp4" />
        Your browser does not support HTML5 video.
      </video>
      <figcaption>Press play. See it before you pick it.</figcaption>
    </figure>
  </div>
);
export default DemoSection;

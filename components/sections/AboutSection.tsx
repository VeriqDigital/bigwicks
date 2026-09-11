import SelectionShowcase from "./SelectionShowcase";
import WhyChooseSection from "./WhyChooseSection";

const AboutSection = () => (
  <div className="story-layout">
    <div className="story-copy" id="why-big-wicks">
      <p className="public-kicker">Inside Big Wicks</p>
      <h2 className="public-title">
        Big selection.
        <br />
        Local people.
      </h2>
      <p className="story-intro">
        Walk the aisles. Compare the effects. Ask us what to try.
      </p>
      <p>
        Our La Porte store is packed with choices, from a few backyard favorites
        to the centerpiece of your show. You bring the ideas. We&apos;ll help
        you find the fireworks.
      </p>
      <WhyChooseSection />
    </div>
    <SelectionShowcase />
  </div>
);
export default AboutSection;

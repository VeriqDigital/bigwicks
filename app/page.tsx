import FAQ from "@/components/sections/FAQ";
import Hero from "@/components/sections/Hero";
import LocationSection from "@/components/sections/LocationSection";
import CategorySection from "@/components/sections/CategorySection";
import ContactCtaSection from "@/components/sections/ContactCtaSection";
import TrustStrip from "@/components/sections/TrustStrip";
import AboutSection from "@/components/sections/AboutSection";
import DealsSection from "@/components/sections/DealsSection";
import DemoSection from "@/components/sections/DemoSection";
import SelectionShowcase from "@/components/sections/SelectionShowcase";
import WhyChooseSection from "@/components/sections/WhyChooseSection";
import Section from "@/components/ui/Section";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Section id="shop" tone="light">
        <CategorySection />
      </Section>
      <Section id="deals" tone="light">
        <DealsSection />
      </Section>
      <Section id="about" tone="black">
        <AboutSection />
      </Section>
      <Section tone="light">
        <SelectionShowcase />
      </Section>
      <Section id="why-big-wicks" tone="light">
        <WhyChooseSection />
      </Section>
      <Section id="demos" tone="dark">
        <DemoSection />
      </Section>
      <Section id="visit" tone="light">
        <LocationSection />
      </Section>
      <Section id="faq" tone="light">
        <FAQ />
      </Section>
      <Section tone="light">
        <ContactCtaSection />
      </Section>
    </>
  );
}

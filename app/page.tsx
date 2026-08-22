import FAQ from "@/components/sections/FAQ";
import Hero from "@/components/sections/Hero";
import LocationSection from "@/components/sections/LocationSection";
import ServicesSection from "@/components/sections/ServicesSection";
import ContactCtaSection from "@/components/sections/ContactCtaSection";
import TrustStrip from "@/components/sections/TrustStrip";
import { AboutSection, FleetShowcase, IndustriesSection, TestimonialsSection, WhyChooseSection } from "@/components/sections/ContentSections";
import Section from "@/components/ui/Section";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Section id="services" tone="dark"><ServicesSection /></Section>
      <Section id="fleet" tone="black"><FleetShowcase /></Section>
      <Section id="industries" tone="light"><IndustriesSection /></Section>
      <Section id="about" tone="dark"><AboutSection /></Section>
      <Section id="why-us" tone="black"><WhyChooseSection /></Section>
      <Section id="testimonials" tone="light"><TestimonialsSection /></Section>
      <Section id="location" tone="dark"><LocationSection /></Section>
      <Section id="faq" tone="black"><FAQ /></Section>
      <Section id="quote" tone="dark"><ContactCtaSection /></Section>
    </>
  );
}

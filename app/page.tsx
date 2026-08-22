import FAQ from "@/components/sections/FAQ";
import Hero from "@/components/sections/Hero";
import LocationSection from "@/components/sections/LocationSection";
import CategorySection from "@/components/sections/CategorySection";
import ContactCtaSection from "@/components/sections/ContactCtaSection";
import TrustStrip from "@/components/sections/TrustStrip";
import { AboutSection, DealsSection, DemoSection, SelectionShowcase, WhyChooseSection } from "@/components/sections/ContentSections";
import Section from "@/components/ui/Section";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Section id="shop" tone="dark"><CategorySection /></Section>
      <Section id="deals" tone="light"><DealsSection /></Section>
      <Section id="about" tone="black"><AboutSection /></Section>
      <Section tone="dark"><SelectionShowcase /></Section>
      <Section id="why-big-wicks" tone="light"><WhyChooseSection /></Section>
      <Section id="demos" tone="black"><DemoSection /></Section>
      <Section id="visit" tone="light"><LocationSection /></Section>
      <Section id="faq" tone="black"><FAQ /></Section>
      <Section tone="dark"><ContactCtaSection /></Section>
    </>
  );
}

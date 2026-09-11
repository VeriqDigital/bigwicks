import type { Metadata } from "next";
import FAQ from "@/components/sections/FAQ";
import Hero from "@/components/sections/Hero";
import LocationSection from "@/components/sections/LocationSection";
import CategorySection from "@/components/sections/CategorySection";
import ContactCtaSection from "@/components/sections/ContactCtaSection";
import TrustStrip from "@/components/sections/TrustStrip";
import AboutSection from "@/components/sections/AboutSection";
import DealsSection from "@/components/sections/DealsSection";
import DemoSection from "@/components/sections/DemoSection";
import MobileActions from "@/components/layout/MobileActions";
import "./public.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="public-site">
      <Hero />
      <TrustStrip />
      <section id="shop" className="selection-section public-container">
        <CategorySection />
      </section>
      <section id="deals" className="value-section">
        <DealsSection />
      </section>
      <section id="visit" className="visit-section">
        <LocationSection />
      </section>
      <section id="about" className="story-section public-container">
        <AboutSection />
      </section>
      <section id="demos" className="demo-section">
        <DemoSection />
      </section>
      <section id="faq" className="faq-section public-container">
        <FAQ />
      </section>
      <section className="final-section">
        <ContactCtaSection />
      </section>
      <MobileActions />
    </div>
  );
}

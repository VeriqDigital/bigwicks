import type { Metadata } from "next";
import ServicesSection from "@/components/sections/ServicesSection";
import Section from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Freight Services",
  description:
    "Full truckload, LTL, dedicated freight, regional delivery, commercial logistics, and specialized hauling from S&B Express.",
};

export default function ServicesPage() {
  return (
    <Section tone="dark">
      <div className="pt-8">
        <ServicesSection showAll />
      </div>
    </Section>
  );
}

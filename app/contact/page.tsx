import type { Metadata } from "next";
import LocationSection from "@/components/sections/LocationSection";
import Section from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact S&B Express to discuss freight transportation, lanes, scheduling, and commercial logistics.",
};

export default function ContactPage() {
  return (
    <Section tone="dark">
      <div className="pt-8">
        <LocationSection />
      </div>
    </Section>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import ContactCtaSection from "@/components/sections/ContactCtaSection";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "About", description: "Learn about the operating values behind S&B Express freight transportation and commercial logistics." };

const values = [
  ["Professionalism", "Prepared equipment, responsible drivers, and respect for every customer, facility, and jobsite."],
  ["Communication", "Clear expectations before pickup and useful updates while freight is in motion."],
  ["Safety", "Careful planning and disciplined practices that protect people, equipment, and cargo."],
  ["Accountability", "Owning the details, following through, and addressing problems directly when plans change."],
];

export default function AboutPage() {
  return (
    <>
      <Section tone="black">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-(--accent)">About S&amp;B Express</p>
            <h1 className="mt-4 font-heading text-5xl font-black uppercase leading-[0.95] text-white md:text-7xl">Good freight service starts with the basics</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#aaa]">Show up ready. Communicate clearly. Move freight safely. Keep the promise made to the customer. S&B Express is built around the fundamentals that make transportation dependable.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href="/services">View services</Button><Button href={siteConfig.contact.phoneHref} variant="secondary">Call dispatch</Button></div>
          </div>
          <div className="relative min-h-[560px] overflow-hidden border border-[#3b3b3b]"><Image src="/pexels-carloscruz-artegrafia-172084181-11087837.jpg" alt="Commercial semi truck hauling freight on the highway" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 55vw" preload /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /></div>
        </div>
      </Section>

      <Section tone="light">
        <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.3em] text-[#8c6f14]">How we work</p><h2 className="mt-4 font-heading text-4xl font-black uppercase leading-[0.95] text-[#171717] md:text-6xl">Standards that travel every mile</h2></div>
        <div className="mt-12 grid gap-px bg-[#c8c2b5] md:grid-cols-2">
          {values.map(([title, description], index) => <article key={title} className="bg-white p-8"><p className="font-heading text-sm font-black text-[#9b7b19]">{String(index + 1).padStart(2, "0")}</p><h3 className="mt-3 font-heading text-2xl font-black uppercase text-[#171717]">{title}</h3><p className="mt-4 leading-7 text-[#5e5e5e]">{description}</p></article>)}
        </div>
      </Section>

      <Section tone="dark">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative min-h-[430px] overflow-hidden border border-[#393939]"><Image src="/pexels-willians-huerta-2157111846-36398150.jpg" alt="Organized commercial warehouse operations" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" /></div>
          <div><p className="text-sm font-bold uppercase tracking-[0.3em] text-(--accent)">Long-term relationships</p><h2 className="mt-4 font-heading text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl">A carrier you can call again</h2><p className="mt-6 text-lg leading-8 text-[#aaa]">The best transportation relationships are built over time. We learn how your operation works, where the pressure points are, and what reliable service looks like for your team. Then we keep earning the next load.</p></div>
        </div>
      </Section>
      <Section tone="black"><ContactCtaSection /></Section>
    </>
  );
}

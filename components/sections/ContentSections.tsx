"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";
import LeadModal from "@/components/layout/LeadModal";
import useLeadModal from "@/components/layout/useLeadModal";
import { primaryCta } from "@/config/site";

export const FleetShowcase = () => (
  <div>
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-(--accent)">On the road. On the job.</p>
        <h2 className="mt-4 font-heading text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl">Equipment ready for real work</h2>
      </div>
      <p className="max-w-md leading-7 text-[#aaa]">Commercial equipment, attentive drivers, and disciplined loading practices keep freight moving safely through every stage.</p>
    </div>
    <div className="mt-12 grid gap-4 md:grid-cols-12 md:grid-rows-2">
      <figure className="relative min-h-[440px] overflow-hidden md:col-span-8 md:row-span-2">
        <Image src="/pexels-quintingellar-6563903.jpg" alt="Semi truck and trailer crossing a desert highway" fill className="object-cover" sizes="(max-width: 768px) 100vw, 66vw" />
        <figcaption className="absolute bottom-0 left-0 border-l-4 border-(--accent) bg-black/85 px-5 py-3 font-heading text-sm font-bold uppercase tracking-[0.18em]">Regional transportation</figcaption>
      </figure>
      <figure className="relative min-h-52 overflow-hidden md:col-span-4">
        <Image src="/pexels-elevate-1267329.jpg" alt="Forklift loading commercial freight at a dock" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
      </figure>
      <figure className="relative min-h-52 overflow-hidden md:col-span-4">
        <Image src="/pexels-duaenam-kosonglima-424968847-37154110.jpg" alt="Truck and freight container at a commercial yard" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
      </figure>
    </div>
  </div>
);

const industries = ["Manufacturing", "Construction", "Retail distribution", "Agriculture", "Industrial", "Commercial suppliers"];

export const IndustriesSection = () => (
  <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#8c6f14]">Industries served</p>
      <h2 className="mt-4 font-heading text-4xl font-black uppercase leading-[0.95] text-[#171717] md:text-6xl">Built around your operation</h2>
      <p className="mt-6 max-w-xl text-lg leading-8 text-[#565656]">Different freight comes with different pressures. S&B Express plans around your schedule, your dock, and the realities of your supply chain.</p>
    </div>
    <div className="grid gap-px bg-[#c8c2b5] sm:grid-cols-2">
      {industries.map((industry, index) => (
        <div key={industry} className="group flex min-h-28 items-center gap-5 bg-[#faf8f3] p-6 transition hover:bg-[#111111]">
          <span className="font-heading text-sm font-black text-[#9b7b19]">{String(index + 1).padStart(2, "0")}</span>
          <h3 className="font-heading text-xl font-black uppercase text-[#202020] group-hover:text-white">{industry}</h3>
        </div>
      ))}
    </div>
  </div>
);

export const AboutSection = () => (
  <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
    <div className="relative min-h-[520px] overflow-hidden border border-[#373737]">
      <Image src="/pexels-giovanni-spoletini-311699-14206821.jpg" alt="Commercial truck ready for agricultural freight service" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-8 pt-28">
        <p className="font-heading text-3xl font-black uppercase text-white">Midwest grit. Professional standards.</p>
      </div>
    </div>
    <div className="lg:pl-8">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-(--accent)">About S&amp;B Express</p>
      <h2 className="mt-4 font-heading text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl">Transportation built on trust</h2>
      <p className="mt-7 text-lg leading-8 text-[#b2b2b2]">A freight partner should do what it says it will do. That means showing up prepared, communicating when plans change, handling every load with care, and respecting the businesses on both ends of the route.</p>
      <p className="mt-5 text-lg leading-8 text-[#b2b2b2]">S&B Express is built around those fundamentals. We focus on safe transportation, dependable schedules, and long-term working relationships—not empty promises.</p>
      <div className="mt-8"><Button href="/about" variant="secondary">Our company</Button></div>
    </div>
  </div>
);

const strengths = [
  ["Reliable scheduling", "Pickup and delivery plans built around real operating timelines."],
  ["Professional drivers", "Experienced people who represent your freight and our company well."],
  ["Safe transportation", "Careful handling, responsible driving, and disciplined operating practices."],
  ["Responsive communication", "Direct updates and practical answers when timing matters."],
  ["Commercial experience", "A working understanding of docks, jobsites, suppliers, and deadlines."],
  ["Customer focused", "Transportation decisions made with your operation in mind."],
];

export const WhyChooseSection = () => (
  <div>
    <div className="max-w-4xl">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-(--accent)">Why S&amp;B Express</p>
      <h2 className="mt-4 font-heading text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl">No shortcuts. No runaround.</h2>
    </div>
    <div className="mt-12 grid gap-px bg-[#3a3a3a] md:grid-cols-2 lg:grid-cols-3">
      {strengths.map(([title, description], index) => (
        <article key={title} className="min-h-56 bg-[#1f1f1f] p-7">
          <div className="flex size-11 items-center justify-center border border-(--accent) font-heading text-sm font-black text-(--accent)">{String(index + 1).padStart(2, "0")}</div>
          <h3 className="mt-6 font-heading text-xl font-black uppercase text-white">{title}</h3>
          <p className="mt-3 leading-7 text-[#aaa]">{description}</p>
        </article>
      ))}
    </div>
  </div>
);

const testimonials = [
  ["Operations Manager", "Midwest Manufacturer", "S&B keeps us informed and stays ahead of the details. Our pickups are organized, our team knows what to expect, and the freight arrives when promised."],
  ["Purchasing Director", "Commercial Supplier", "We needed a carrier that could handle a recurring regional lane without constant follow-up. S&B has been dependable and easy to work with."],
  ["Project Coordinator", "Construction Company", "Jobsites do not leave much room for missed windows. Their driver communication and scheduling have made material deliveries much easier to manage."],
];

export const TestimonialsSection = () => (
  <div>
    <div className="max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#8c6f14]">Customer feedback</p>
      <h2 className="mt-4 font-heading text-4xl font-black uppercase leading-[0.95] text-[#171717] md:text-6xl">Trusted where it counts</h2>
    </div>
    <div className="mt-12 grid gap-5 lg:grid-cols-3">
      {testimonials.map(([name, company, quote]) => (
        <figure key={company} className="flex min-h-72 flex-col border-t-4 border-[#c9a227] bg-white p-7 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
          <span className="font-heading text-5xl leading-none text-[#c9a227]">“</span>
          <blockquote className="mt-3 flex-1 text-lg leading-8 text-[#393939]">{quote}</blockquote>
          <figcaption className="mt-7 border-t border-[#ddd7ca] pt-5"><p className="font-heading font-black uppercase text-[#171717]">{name}</p><p className="mt-1 text-sm text-[#6b6b6b]">{company}</p></figcaption>
        </figure>
      ))}
    </div>
  </div>
);

export const QuoteButton = () => {
  const modal = useLeadModal();
  return <>{<Button onClick={() => modal.openModal(primaryCta.modal)}>{primaryCta.label}</Button>}{modal.activeModal && <LeadModal activeModal={modal.activeModal} hasSubmitted={modal.hasSubmitted} isSubmitting={modal.isSubmitting} onClose={modal.closeModal} onSubmit={modal.handleFormSubmit} submitError={modal.submitError} />}</>;
};

"use client";

import Image from "next/image";
import LeadModal from "@/components/layout/LeadModal";
import useLeadModal from "@/components/layout/useLeadModal";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { primaryCta, siteConfig } from "@/config/site";

const Hero = () => {
  const modal = useLeadModal();

  return (
    <section className="bg-[#111111]">
      <div className="grid border-b border-[#303030] lg:min-h-[650px] lg:grid-cols-[0.92fr_1.08fr]">
        <Container className="industrial-grid flex items-center py-16 sm:py-20 lg:py-24">
          <div className="max-w-2xl lg:ml-auto lg:pr-14">
            <p className="mb-5 flex items-center gap-3 font-heading text-sm font-bold uppercase tracking-[0.22em] text-(--accent)">
              <span className="h-0.5 w-10 bg-(--accent)" />
              Chicagoland freight &amp; Midwest logistics
            </p>
            <h1 className="font-heading text-5xl font-black uppercase leading-[0.92] tracking-[-0.025em] text-white sm:text-6xl lg:text-[5.25rem]">
              Freight delivered.
              <span className="mt-2 block text-(--accent)">Promises kept.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#c2c2c2]">
              Dependable freight transportation backed by experienced drivers,
              reliable scheduling, and straight answers from pickup to delivery.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => modal.openModal(primaryCta.modal)}>
                {primaryCta.label}
              </Button>
              <Button href={siteConfig.contact.phoneHref} variant="secondary">
                Call now
              </Button>
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#8e8e8e]">
              Commercial freight <span className="px-2 text-(--accent)">/</span>
              Midwest reach <span className="px-2 text-(--accent)">/</span>
              Direct communication
            </p>
          </div>
        </Container>

        <div className="relative min-h-[420px] overflow-hidden border-t border-[#303030] bg-[#161616] lg:min-h-full lg:border-l lg:border-t-0">
          <Image
            src="/pexels-hitesh-sarain-40372344-28264496.jpg"
            alt="Commercial semi truck traveling on an open regional highway"
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 55vw"
            preload
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 border-l-4 border-(--accent) bg-black/85 px-6 py-5 backdrop-blur-sm sm:bottom-8 sm:left-8">
            <p className="font-heading text-2xl font-black uppercase text-white">Built for the long haul</p>
            <p className="mt-1 text-sm text-[#c7c7c7]">Safe. Professional. On schedule.</p>
          </div>
        </div>
      </div>

      {modal.activeModal && (
        <LeadModal
          activeModal={modal.activeModal}
          hasSubmitted={modal.hasSubmitted}
          isSubmitting={modal.isSubmitting}
          onClose={modal.closeModal}
          onSubmit={modal.handleFormSubmit}
          submitError={modal.submitError}
        />
      )}
    </section>
  );
};

export default Hero;

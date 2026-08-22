"use client";

import Button from "@/components/ui/Button";
import LeadModal from "@/components/layout/LeadModal";
import useLeadModal from "@/components/layout/useLeadModal";
import { primaryCta, siteConfig } from "@/config/site";

const ContactCtaSection = () => {
  const modal = useLeadModal();
  return (
    <div className="industrial-grid grid items-center gap-10 border-y border-[#373737] bg-[#111111] px-6 py-14 md:grid-cols-[1fr_auto] md:px-10 lg:px-14 lg:py-18">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-(--accent)">Let&apos;s get to work</p>
        <h2 className="mt-4 max-w-4xl font-heading text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl">Ready to move your freight?</h2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#aaa]">Share your lane, freight details, and timeline. We&apos;ll give you a clear path forward and a straightforward quote.</p>
      </div>
      <div className="flex min-w-56 flex-col gap-3">
        <Button onClick={() => modal.openModal(primaryCta.modal)}>{primaryCta.label}</Button>
        <Button href={siteConfig.contact.phoneHref} variant="secondary">Call S&amp;B Express</Button>
      </div>
      {modal.activeModal && <LeadModal activeModal={modal.activeModal} hasSubmitted={modal.hasSubmitted} isSubmitting={modal.isSubmitting} onClose={modal.closeModal} onSubmit={modal.handleFormSubmit} submitError={modal.submitError} />}
    </div>
  );
};

export default ContactCtaSection;

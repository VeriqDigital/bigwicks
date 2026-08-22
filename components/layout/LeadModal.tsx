"use client";

import type { FormEvent } from "react";
import { siteConfig } from "@/config/site";

export type ModalType = "service" | "contact";

const modalContent = {
  service: { eyebrow: "Freight quote", title: "Request a quote", submitLabel: "Review quote request", successTitle: "Quote preview complete", successMessage: "This concept form does not transmit information. Call or email S&B Express to discuss a live shipment." },
  contact: { eyebrow: "Contact", title: "Talk with dispatch", submitLabel: "Review message", successTitle: "Message preview complete", successMessage: "This concept form does not transmit information. Use the direct contact details below to reach S&B Express." },
};

type LeadModalProps = { activeModal: ModalType; hasSubmitted: boolean; isSubmitting: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; submitError: string };

const fieldClass = "mt-2 w-full border border-[#555] bg-[#161616] px-3 py-3 text-white outline-none transition placeholder:text-[#777] focus:border-(--accent)";

const LeadModal = ({ activeModal, hasSubmitted, isSubmitting, onClose, onSubmit, submitError }: LeadModalProps) => {
  const content = modalContent[activeModal];
  const isQuote = activeModal === "service";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-8 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={`${activeModal}-form-title`} className="max-h-[calc(100vh-4rem)] w-full max-w-3xl overflow-y-auto border border-[#454545] border-t-4 border-t-(--accent) bg-[#202020] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-8" onClick={(event) => event.stopPropagation()}>
        <div className="mb-7 flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-(--accent)">{content.eyebrow}</p><h2 id={`${activeModal}-form-title`} className="mt-2 font-heading text-3xl font-black uppercase sm:text-4xl">{content.title}</h2></div>
          <button type="button" onClick={onClose} autoFocus className="flex size-10 cursor-pointer items-center justify-center border border-[#666] text-2xl text-[#aaa] hover:border-(--accent) hover:text-(--accent)" aria-label={`Close ${content.title.toLowerCase()} form`}>×</button>
        </div>

        {hasSubmitted ? (
          <div className="border border-[#555] bg-[#171717] p-6"><p className="font-heading text-xl font-black uppercase text-(--accent)">{content.successTitle}</p><p className="mt-3 text-[#aaa]">{content.successMessage}</p><div className="mt-5 flex flex-wrap gap-4 text-sm font-bold"><a href={siteConfig.contact.phoneHref} className="text-white underline">{siteConfig.contact.phone}</a><a href={siteConfig.contact.emailHref} className="text-white underline">{siteConfig.contact.email}</a></div></div>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="border-l-4 border-(--accent) bg-[#171717] p-4 text-sm text-[#aaa]"><p className="font-bold uppercase tracking-wider text-white">Concept form</p><p className="mt-1">This interface does not send or store information.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold">Name<input required name="name" className={fieldClass} placeholder="Your name" /></label>
              <label className="text-sm font-semibold">Company<input name="company" className={fieldClass} placeholder="Company name" /></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold">Email<input required type="email" name="email" className={fieldClass} placeholder="Email address" /></label>
              <label className="text-sm font-semibold">Phone<input required={isQuote} type="tel" name="phone" className={fieldClass} placeholder="Phone number" /></label>
            </div>
            {isQuote && <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Origin<input required name="origin" className={fieldClass} placeholder="City, state" /></label><label className="text-sm font-semibold">Destination<input required name="destination" className={fieldClass} placeholder="City, state" /></label></div>}
            {isQuote && <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Freight type<select required name="freight-type" defaultValue="" className={fieldClass}><option value="" disabled>Choose one</option><option>Full truckload</option><option>Less than truckload</option><option>Dedicated freight</option><option>Regional delivery</option><option>Specialized hauling</option></select></label><label className="text-sm font-semibold">Target date<input required type="date" name="target-date" className={fieldClass} /></label></div>}
            <label className="block text-sm font-semibold">{isQuote ? "Shipment details" : "How can we help?"}<textarea required name="message" rows={4} className={`${fieldClass} resize-none`} placeholder={isQuote ? "Describe the freight, weight, dimensions, timing, and handling requirements." : "Tell us what you need."} /></label>
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSubmitting} className="border border-[#666] px-6 py-3 font-heading text-sm font-black uppercase tracking-wider text-[#ccc] hover:border-white">Cancel</button><button type="submit" disabled={isSubmitting} className="bg-(--accent) px-6 py-3 font-heading text-sm font-black uppercase tracking-wider text-[#111] hover:bg-(--accent-hover) disabled:opacity-60">{isSubmitting ? "Reviewing" : content.submitLabel}</button></div>
            {submitError && <p className="text-sm font-semibold text-red-400" aria-live="polite">{submitError}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default LeadModal;

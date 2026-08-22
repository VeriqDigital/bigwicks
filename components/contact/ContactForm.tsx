"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactForm } from "@/app/contact/actions";
import {
  contactSubjects,
  initialContactFormState,
} from "@/app/contact/contact-form-state";

const fieldClasses =
  "mt-2 w-full rounded-[3px] border border-[#cfcfca] bg-white px-4 py-3.5 text-base text-[#171719] outline-none transition-colors placeholder:text-[#8b8b87] focus:border-(--red) focus:ring-2 focus:ring-[#d62935]/15 aria-[invalid=true]:border-(--red)";

const ContactForm = () => {
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    initialContactFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status, state.submittedAt]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[7px] border border-[#d5d5d0] bg-white p-6 sm:p-8 lg:p-10"
    >
      <div>
        <h2 className="font-heading text-4xl font-bold uppercase leading-none text-[#171719]">
          Send us a message
        </h2>
        <p className="mt-4 max-w-2xl leading-7 text-[#62625f]">
          Ask about products, current store information, promotions, or planning
          your visit. We&apos;ll get back to you as soon as we can.
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-sm font-bold text-[#242426]">
            Name <span className="text-(--red)" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className={fieldClasses}
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={state.fieldErrors?.name ? "contact-name-error" : undefined}
          />
          {state.fieldErrors?.name && (
            <p id="contact-name-error" className="mt-2 text-sm text-(--red)">
              {state.fieldErrors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-email" className="text-sm font-bold text-[#242426]">
            Email <span className="text-(--red)" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            inputMode="email"
            className={fieldClasses}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={state.fieldErrors?.email ? "contact-email-error" : undefined}
          />
          {state.fieldErrors?.email && (
            <p id="contact-email-error" className="mt-2 text-sm text-(--red)">
              {state.fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-phone" className="text-sm font-bold text-[#242426]">
            Phone <span className="font-normal text-[#777773]">(optional)</span>
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            maxLength={30}
            autoComplete="tel"
            inputMode="tel"
            className={fieldClasses}
            aria-invalid={Boolean(state.fieldErrors?.phone)}
            aria-describedby={state.fieldErrors?.phone ? "contact-phone-error" : undefined}
          />
          {state.fieldErrors?.phone && (
            <p id="contact-phone-error" className="mt-2 text-sm text-(--red)">
              {state.fieldErrors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-subject" className="text-sm font-bold text-[#242426]">
            Inquiry type <span className="text-(--red)" aria-hidden="true">*</span>
          </label>
          <select
            id="contact-subject"
            name="subject"
            required
            defaultValue=""
            className={fieldClasses}
            aria-invalid={Boolean(state.fieldErrors?.subject)}
            aria-describedby={state.fieldErrors?.subject ? "contact-subject-error" : undefined}
          >
            <option value="" disabled>Select a topic</option>
            {contactSubjects.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {state.fieldErrors?.subject && (
            <p id="contact-subject-error" className="mt-2 text-sm text-(--red)">
              {state.fieldErrors.subject}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="contact-message" className="text-sm font-bold text-[#242426]">
          Message <span className="text-(--red)" aria-hidden="true">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={8}
          className={`${fieldClasses} resize-y`}
          aria-invalid={Boolean(state.fieldErrors?.message)}
          aria-describedby={state.fieldErrors?.message ? "contact-message-error" : undefined}
        />
        {state.fieldErrors?.message && (
          <p id="contact-message-error" className="mt-2 text-sm text-(--red)">
            {state.fieldErrors.message}
          </p>
        )}
      </div>

      <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.message && (
        <div
          className={`mt-6 border-l-4 px-4 py-3 text-sm leading-6 ${state.status === "success" ? "border-[#21864b] bg-[#f0faf4] text-[#185e36]" : "border-(--red) bg-[#fff4f4] text-[#8f1720]"}`}
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-7 inline-flex min-w-44 cursor-pointer items-center justify-center rounded-[3px] border-2 border-(--red) bg-(--red) px-6 py-3.5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:border-(--red-hover) hover:bg-(--red-hover) disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
};

export default ContactForm;

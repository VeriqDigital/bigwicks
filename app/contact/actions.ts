"use server";

import {
  contactSubjects,
  type ContactField,
  type ContactFormState,
} from "./contact-form-state";
import { siteConfig } from "@/config/site";

const getString = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
};

export async function submitContactForm(
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const honeypot = getString(formData, "company");
  if (honeypot) {
    return {
      status: "success",
      message: "Thanks. Your message has been sent to the Big Wicks team.",
      submittedAt: Date.now(),
    };
  }

  const name = getString(formData, "name");
  const email = getString(formData, "email");
  const phone = getString(formData, "phone");
  const subject = getString(formData, "subject");
  const message = getString(formData, "message");
  const fieldErrors: Partial<Record<ContactField, string>> = {};

  if (name.length < 2 || name.length > 100 || /[\r\n]/.test(name)) {
    fieldErrors.name = "Enter your name using 2 to 100 characters.";
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (phone && (phone.length > 30 || !/^[+()\-.\s\d]{7,30}$/.test(phone))) {
    fieldErrors.phone = "Enter a valid phone number or leave this field blank.";
  }

  const selectedSubject = contactSubjects.find((option) => option.value === subject);
  if (!selectedSubject) {
    fieldErrors.subject = "Choose an inquiry type.";
  }

  if (message.length < 10 || message.length > 3000) {
    fieldErrors.message = "Enter a message using 10 to 3,000 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.CONTACT_FROM_EMAIL?.trim();
  const toEmail = process.env.CONTACT_TO_EMAIL?.trim();

  if (!apiKey || !fromEmail || !toEmail) {
    console.error("Contact form email delivery is missing required environment configuration.");
    return {
      status: "error",
      message: `Online messaging is temporarily unavailable. Please call the store at ${siteConfig.contact.phone}.`,
    };
  }

  const emailText = [
    "New Big Wicks website inquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Inquiry type: ${selectedSubject?.label}`,
    "",
    "Message:",
    message,
    "",
    `Submitted: ${new Date().toISOString()}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `big-wicks-contact-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `[Big Wicks Website] ${selectedSubject?.label} — ${name}`,
        text: emailText,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Contact form email delivery failed with status ${response.status}.`);
      return {
        status: "error",
        message: "We could not send your message right now. Please try again or call the store.",
      };
    }
  } catch (error) {
    console.error("Contact form email delivery failed.", error);
    return {
      status: "error",
      message: "We could not send your message right now. Please try again or call the store.",
    };
  }

  return {
    status: "success",
    message: "Thanks. Your message has been sent to the Big Wicks team.",
    submittedAt: Date.now(),
  };
}

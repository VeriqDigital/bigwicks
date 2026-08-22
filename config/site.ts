import type { ModalType } from "@/components/layout/LeadModal";

export const siteConfig = {
  name: "S&B Express",
  shortName: "S&B Express",
  owner: "S&B Express",
  description:
    "Dependable freight transportation and commercial logistics based in Chicagoland and serving the Midwest.",
  locale: "en_US",
  contact: {
    phone: "(815) 416-8936",
    phoneHref: "tel:+18154168936",
    smsHref: "sms:+18154168936",
    email: "stellaenev@gmail.com",
    emailHref: "mailto:stellaenev@gmail.com",
    address: "Chicagoland, Illinois",
    serviceArea: "Serving businesses throughout the Midwest",
    mapUrl: "https://maps.google.com/?q=Chicagoland+Illinois",
    mapEmbedUrl: "https://www.google.com/maps?q=Chicagoland+Illinois&output=embed",
  },
} as const;

export type NavItem =
  | { label: string; href: string }
  | { label: string; modal: ModalType };

export const navigation: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Industries", href: "/#industries" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", modal: "contact" },
];

export const footerLinks: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Request a Quote", modal: "service" },
];

export const primaryCta = {
  label: "Request a Quote",
  modal: "service",
} as const satisfies { label: string; modal: ModalType };

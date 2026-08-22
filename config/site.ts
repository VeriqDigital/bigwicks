export const businessHours = [
  { day: "Monday", hours: "8 AM–10 PM", schema: "Mo 08:00-22:00" },
  { day: "Tuesday", hours: "8 AM–10 PM", schema: "Tu 08:00-22:00" },
  { day: "Wednesday", hours: "7 AM–10 PM", schema: "We 07:00-22:00" },
  { day: "Thursday", hours: "7 AM–11 PM", schema: "Th 07:00-23:00" },
  { day: "Friday", hours: "7 AM–11 PM", schema: "Fr 07:00-23:00" },
  { day: "Saturday", hours: "7 AM–11 PM", schema: "Sa 07:00-23:00" },
  { day: "Sunday", hours: "8 AM–5 PM", schema: "Su 08:00-17:00" },
] as const;

export const siteConfig = {
  name: "Big Wicks Fireworks LLC",
  shortName: "Big Wicks Fireworks",
  description:
    "Shop a huge selection of fireworks with friendly, knowledgeable help at Big Wicks Fireworks in La Porte, Indiana—just minutes from New Buffalo, Michigan.",
  locale: "en_US",
  announcement: {
    message: "Open 7 days · 3 miles south of downtown New Buffalo",
    actionLabel: "Plan your visit",
    href: "/#visit",
  },
  contact: {
    phone: "(219) 380-5149",
    phoneHref: "tel:+12193805149",
    email: "bigwicksfireworks@gmail.com",
    emailHref: "mailto:bigwicksfireworks@gmail.com",
    addressLine1: "10351 IN-39",
    city: "La Porte",
    state: "IN",
    postalCode: "46350",
    address: "10351 IN-39, La Porte, IN 46350",
    proximity: "3 miles south of downtown New Buffalo, Michigan",
    mapUrl:
      "https://www.google.com/maps/dir/?api=1&destination=10351+IN-39%2C+La+Porte%2C+IN+46350",
    mapEmbedUrl:
      "https://www.google.com/maps?q=10351+IN-39%2C+La+Porte%2C+IN+46350&output=embed",
  },
  socialLinks: [
    {
      label: "Facebook",
      href: "https://www.facebook.com/profile.php?id=100094070160648",
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/bigwicksfireworks/",
    },
  ],
  hours: businessHours,
} as const;

export type NavItem = { label: string; href: string };

export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shop Fireworks", href: "/#shop" },
  { label: "Deals", href: "/#deals" },
  { label: "About", href: "/#about" },
  { label: "Visit Us", href: "/#visit" },
  { label: "Contact", href: "/contact" },
];

export const footerLinks: NavItem[] = [
  { label: "Shop by Category", href: "/#shop" },
  { label: "Current Deals", href: "/#deals" },
  { label: "Why Big Wicks", href: "/#why-big-wicks" },
  { label: "Firework Demos", href: "/#demos" },
  { label: "Frequently Asked Questions", href: "/#faq" },
];

export const primaryCta = {
  label: "Get Directions",
  href: siteConfig.contact.mapUrl,
} as const;

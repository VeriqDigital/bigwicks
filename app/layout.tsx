import type { Metadata } from "next";
import { Barlow, Roboto_Condensed } from "next/font/google";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { siteConfig } from "@/config/site";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Big Wicks Fireworks | La Porte, Indiana Fireworks Store",
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  category: "retail",
  keywords: [
    "fireworks store La Porte Indiana",
    "fireworks near New Buffalo Michigan",
    "Big Wicks Fireworks",
    "Indiana fireworks",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Big Wicks Fireworks | Drive By The Rest… Stop At The Best!",
    description: siteConfig.description,
    siteName: siteConfig.shortName,
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Big Wicks Fireworks | La Porte, Indiana",
    description: siteConfig.description,
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: siteConfig.name,
  description: siteConfig.description,
  telephone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  sameAs: siteConfig.socialLinks.map(({ href }) => href),
  address: {
    "@type": "PostalAddress",
    streetAddress: siteConfig.contact.addressLine1,
    addressLocality: siteConfig.contact.city,
    addressRegion: siteConfig.contact.state,
    postalCode: siteConfig.contact.postalCode,
    addressCountry: "US",
  },
  openingHours: siteConfig.hours.map(({ schema }) => schema),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${barlow.variable} ${robotoCondensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <ScrollToTop />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Barlow, Roboto_Condensed } from "next/font/google";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { siteConfig } from "@/config/site";
import { getSiteUrl } from "@/config/seo";
import JsonLd from "@/components/seo/JsonLd";
import { storeJsonLd } from "@/config/structured-data";
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
  metadataBase: getSiteUrl(),
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${barlow.variable} ${robotoCondensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <JsonLd data={storeJsonLd()} />
        <ScrollToTop />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

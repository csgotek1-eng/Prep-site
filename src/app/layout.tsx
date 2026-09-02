import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import FloatingDock from "@/components/FloatingDock";
import { FloatingChromeProvider } from "@/components/FloatingChrome";
import Header from "@/components/Header";
import UtilityBar from "@/components/UtilityBar";
import Footer from "@/components/Footer";
import { siteConfig, siteUrl } from "@/lib/site";
import "./globals.css";

/*
 * Owner-approved typography experiment (Brand Book fonts round): Manrope
 * for display/headings, Inter for body/interface text, IBM Plex Mono as
 * a small accent for data/labels only. Self-hosted at build time via
 * next/font/google — no runtime request to fonts.googleapis.com. Only
 * the weights actually used are downloaded.
 */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-manrope",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "fulfilment Ireland",
    "fulfilment centre Ireland",
    "ecommerce fulfilment Ireland",
    "e-commerce fulfilment Ireland",
    "prep centre Ireland",
    "Amazon FBA prep Ireland",
    "TikTok Shop fulfilment Ireland",
    "Shopify fulfilment Ireland",
    "pick and pack Ireland",
    "order fulfilment Ireland",
    "fulfilment services Ireland",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IE",
    url: siteUrl,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteUrl,
  description: siteConfig.description,
  telephone: "+353851584185",
  // Public profile pages only — WhatsApp/Telegram chat links are not
  // profiles, so they are deliberately not listed in sameAs.
  sameAs: [
    siteConfig.social.instagram,
    siteConfig.social.facebook,
    siteConfig.social.tiktok,
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+353851584185",
    contactType: "customer service",
    areaServed: "IE",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "Unit 10, StorageWise Self Storage Limerick, Docklands Business Park, Dock Rd",
    addressLocality: "Limerick",
    postalCode: "V94 PX6A",
    addressCountry: "IE",
  },
  hasMap: siteConfig.location.googleMapsUrl,
  areaServed: {
    "@type": "Country",
    name: "Ireland",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IE"
      className={`${manrope.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <FloatingChromeProvider>
          <UtilityBar />
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <FloatingDock />
        </FloatingChromeProvider>
      </body>
    </html>
  );
}

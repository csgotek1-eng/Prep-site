import type { Metadata } from "next";
import ContactLauncher from "@/components/ContactLauncher";
import Header from "@/components/Header";
import UtilityBar from "@/components/UtilityBar";
import Footer from "@/components/Footer";
import { siteConfig, siteUrl } from "@/lib/site";
import "./globals.css";

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
    <html lang="en-IE">
      <body className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <UtilityBar />
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <ContactLauncher />
      </body>
    </html>
  );
}

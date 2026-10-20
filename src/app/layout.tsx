import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import SiteDialogs from "@/components/SiteDialogs";
import FloatingDock from "@/components/FloatingDock";
import PromotionBanner from "@/components/PromotionBanner";
import { FloatingChromeProvider } from "@/components/FloatingChrome";
import Header from "@/components/Header";
import UtilityBar from "@/components/UtilityBar";
import Footer from "@/components/Footer";
import { siteConfig, siteUrl } from "@/lib/site";
import { serializeJsonLd } from "@/lib/json-ld";
import {
  buildLocalBusinessJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/structured-data";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { LOGO_INTRO_GUARD_SCRIPT } from "@/lib/logo-intro-markup";
import "./globals.css";

/**
 * Every page carries the promotion strip, and a promotion is data the
 * owner changes from the admin screen — not something baked in at
 * build time. Without this the whole site would prerender once and a
 * newly published offer would never appear until the next deploy.
 *
 * ISR rather than force-dynamic on purpose (§36): pages stay cached
 * and fast.
 *
 * EVERY 10 MINUTES, NOT EVERY MINUTE (P0, 2026-10-20). At 60 s every
 * page went stale every minute and each refresh was a full render
 * (56-343 ms CPU in production logs) on the account's 10 ms CPU
 * allowance, part of what produced 503s; a load run caused 21 refreshes
 * on the old setting against 1 on the new one
 * (docs/P0_503_DIAGNOSIS_2026-10-19.md).
 *
 * Why 10 minutes and not an hour: the promotions table IS live in
 * production (the "Opening Soon" strip is an offer from it). Pages are
 * prerendered at build time WITHOUT database access, so right after a
 * deploy they carry no strip until their first refresh; 10 minutes
 * bounds that gap, and how long a changed or ended offer can lag.
 * Cache interception (open-next.config.ts) awaits that refresh, which
 * took 0.15-0.86 s in the same run — once per page per 10 minutes.
 */
export const revalidate = 600;

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
  // No `keywords`: Google has ignored the meta keywords tag since 2009
  // and no other engine the site targets reads it (SEO audit, 2026-10).
  alternates: {
    canonical: "/",
  },
  // Open Graph and Twitter carry NO title, description or url here. A
  // page that does not override `openGraph` inherits this whole object,
  // so the old values put the HOMEPAGE title, description and URL on 14
  // of 19 pages (verified live, 2026-10-06): a /services link shared on
  // WhatsApp or Facebook previewed as the homepage, and og:title is one
  // of the inputs Google uses for a result's title link. Left empty,
  // Next fills og:title and og:description from each page's own title
  // and description; the file-convention opengraph-image still applies.
  openGraph: {
    type: "website",
    locale: "en_IE",
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * LocalBusiness, built from siteConfig rather than written out here.
 *
 * This used to be a hand-written Organization literal with the address
 * and phone number retyped into it. Two copies of an address is how a
 * site ends up publishing one thing on /contact and another to Google.
 * It is now derived, and the opening hours the owner supplied are
 * expressed as openingHoursSpecification for the first time.
 *
 * See lib/structured-data.ts for what is deliberately NOT here:
 * coordinates, ratings and a price range, none of which are verified.
 */
const localBusinessJsonLd = buildLocalBusinessJsonLd();
const webSiteJsonLd = buildWebSiteJsonLd();
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IE"
      className={`${manrope.variable} ${inter.variable} ${ibmPlexMono.variable}`}
      // The logo-intro guard below sets data-logo-intro on <html> before
      // hydration, on purpose.
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        {/* Header logo intro: flags every full page load, before first
            paint, unless the visitor prefers reduced motion. Route changes
            are handled by LogoIntroPlayer. See src/lib/logo-intro-markup.ts. */}
        <script dangerouslySetInnerHTML={{ __html: LOGO_INTRO_GUARD_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(localBusinessJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(webSiteJsonLd),
          }}
        />
        {/* Renders nothing at all unless a Measurement ID is set. */}
        <GoogleAnalytics />
        <FloatingChromeProvider>
          {/* Server-rendered: the offer strip is in the first HTML the
              browser receives, so it never appears late and never
              shifts the header down after load. */}
          <PromotionBanner />
          <UtilityBar />
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <FloatingDock />
          {/* One calculator and one Help panel for the whole site. */}
          <SiteDialogs />
        </FloatingChromeProvider>
      </body>
    </html>
  );
}

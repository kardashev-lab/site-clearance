import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clearance.kardashevlabs.org";

const description =
  "Draw a search area in ERCOT. County-level queue, measured interconnection timelines, and LMP stress. Public data. Not an official study.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Site Clearance | Kardashev Labs",
    template: "%s | Site Clearance",
  },
  description,
  keywords: [
    "ERCOT",
    "interconnection",
    "site clearance",
    "Texas",
    "generation queue",
    "GIS report",
    "LMP",
    "Kardashev Labs",
  ],
  authors: [{ name: "Kardashev Labs", url: "https://kardashevlabs.org" }],
  creator: "Kardashev Labs",
  publisher: "Kardashev Labs",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Site Clearance | Kardashev Labs",
    description:
      "Draw a search area in ERCOT. County queue + measured timelines + LMP stress → strong/mixed/weak.",
    url: siteUrl,
    siteName: "Kardashev Labs",
  },
  twitter: {
    card: "summary_large_image",
    title: "Site Clearance | Kardashev Labs",
    description:
      "Draw a search area in ERCOT. County queue + measured timelines + LMP stress → strong/mixed/weak.",
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eceae4",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://kardashevlabs.org/#organization",
      name: "Kardashev Labs",
      url: "https://kardashevlabs.org",
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "Site Clearance",
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript and a pointer or touch screen for map drawing.",
      description,
      isAccessibleForFree: true,
      provider: { "@id": "https://kardashevlabs.org/#organization" },
      about: [
        { "@type": "Thing", name: "ERCOT interconnection" },
        { "@type": "Place", name: "Texas" },
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Site Clearance",
      publisher: { "@id": "https://kardashevlabs.org/#organization" },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full`}>
      <body className="h-full">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}

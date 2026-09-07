import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { brand } from "@/brand.config";
import { JsonLd, SITE_URL } from "@/lib/seo";
import { Toaster } from "@/components/toast";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "HMO Rooms & Supported Accommodation UK | RoomsNow", template: `%s | ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  appleWebApp: { title: brand.shortName },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "website",
    siteName: brand.name,
    locale: "en_GB",
    url: SITE_URL,
    title: "HMO Rooms & Supported Accommodation UK | RoomsNow",
    description: brand.description,
  },
  twitter: { card: "summary_large_image", title: "HMO Rooms & Supported Accommodation UK | RoomsNow", description: brand.description },
};

export const viewport: Viewport = {
  themeColor: "#1666AA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${display.variable}`}>
      <body>
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${SITE_URL}/#organisation`,
              name: brand.name,
              url: SITE_URL,
              email: brand.supportEmail,
              logo: `${SITE_URL}/brand/roomsnow-logo-fullcolor.svg`,
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: brand.name,
              url: SITE_URL,
              publisher: { "@id": `${SITE_URL}/#organisation` },
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/search?where={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
          ]}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

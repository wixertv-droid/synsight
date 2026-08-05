import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import JsonLd from "@/components/seo/JsonLd";
import {
  organizationSchema,
  softwareApplicationSchema,
  webApplicationSchema,
  websiteSchema,
} from "@/lib/seo/schema";
import { SITE } from "@/lib/seo/site";
import { robotsPublic } from "@/lib/seo/index-policy";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "SynSight — Digitale Identität erkennen und schützen",
    template: "%s | SynSight",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "SynSight",
    "digitale Identität",
    "OSINT",
    "Cybersecurity",
    "Datenleck prüfen",
    "Username Suche",
    "Google Analyse",
    "Digital Footprint",
    "Online-Reputation",
    "Datenschutz",
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "Cybersecurity",
  alternates: {
    canonical: SITE.url,
    languages: {
      de: SITE.url,
      "x-default": SITE.url,
    },
  },
  robots: robotsPublic,
  openGraph: {
    title: "SynSight — Digitale Identität erkennen und schützen",
    description:
      "Cybersecurity- & OSINT-Plattform: öffentliche Profile, Datenlecks und digitale Spuren verstehen.",
    url: SITE.url,
    siteName: SITE.name,
    locale: SITE.locale,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SynSight — Digitale Identität erkennen und schützen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SynSight — Digitale Identität erkennen und schützen",
    description:
      "OSINT & Cybersecurity: digitale Spuren erkennen, Risiken verstehen, nächste Schritte klar machen.",
    images: ["/twitter-image"],
  },
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    "msapplication-TileColor": SITE.themeColor,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <JsonLd
          data={[
            organizationSchema(),
            websiteSchema(),
            webApplicationSchema(),
            softwareApplicationSchema(),
          ]}
        />
        {children}
      </body>
    </html>
  );
}

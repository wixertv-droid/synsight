import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const appUrl = process.env.APP_URL?.trim() || "http://localhost:3000";

export const viewport: Viewport = {
  themeColor: "#04070C",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "SynSight — Digitale Identität erkennen und schützen",
  description:
    "KI-Analyse für öffentliche Profile, Datenlecks und digitale Spuren. SynSight macht Risiken verständlich und zeigt klare nächste Schritte.",
  keywords: [
    "digitale Identität",
    "KI",
    "Datenschutz",
    "Cybersicherheit",
    "Online-Reputation",
  ],
  applicationName: "SynSight",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "SynSight — Digitale Identität erkennen und schützen",
    description:
      "Entdecken Sie Ihre digitale Spur. Verstehen Sie Risiken. Schützen Sie, was online über Sie sichtbar ist.",
    url: appUrl,
    siteName: "SynSight",
    locale: "de_DE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

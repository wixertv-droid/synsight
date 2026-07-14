import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "SynSight — KI-Plattform für digitalen Identitätsschutz",
  description:
    "SynSight analysiert digitale Spuren, erkennt Risiken und hilft Ihnen, die Kontrolle über Ihre Online-Präsenz zurückzugewinnen.",
  keywords: [
    "digitale Identität",
    "KI",
    "Datenschutz",
    "Cybersicherheit",
    "Online-Reputation",
  ],
  openGraph: {
    title: "SynSight — Digital Identity Protection",
    description:
      "Die intelligente KI-Plattform zum Schutz Ihrer digitalen Identität.",
    url: "https://synsight.de",
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

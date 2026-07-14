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
  openGraph: {
    title: "SynSight — Digitale Identität erkennen und schützen",
    description:
      "Entdecken Sie Ihre digitale Spur. Verstehen Sie Risiken. Schützen Sie, was online über Sie sichtbar ist.",
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

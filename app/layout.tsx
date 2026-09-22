import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PLANS } from "@/lib/marketing";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const DESCRIPTION =
  "Lobby answers your messages, books your jobs, qualifies your leads and drafts your quotes — grounded in your " +
  "own prices and policies. Phone calls stay with your team, briefed and ready.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lobby — the AI assistant that runs your front desk",
    template: "%s — Lobby",
  },
  description: DESCRIPTION,
  applicationName: "Lobby",
  keywords: [
    "AI assistant for small business",
    "AI receptionist alternative",
    "virtual assistant software",
    "AI answering messages",
    "appointment booking AI",
    "lead capture automation",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Lobby",
    title: "Lobby — the AI assistant that runs your front desk",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lobby — the AI assistant that runs your front desk",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

// Sourced from lib/marketing.ts's PLANS rather than repeated here, so a
// repriced plan can't leave stale numbers in what search engines and AI
// crawlers read as this product's actual, current pricing.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Lobby",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  offers: PLANS.filter((plan) => plan.monthly !== null).map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: String(plan.monthly),
    priceCurrency: "USD",
  })),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </body>
    </html>
  );
}

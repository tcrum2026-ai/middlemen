import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const description =
  "Post what you need, let businesses compete, and let AI find you the best deal. DealBridge connects customers and businesses and takes a small commission only when a deal closes.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DealBridge — The AI-matched deal marketplace",
    template: "%s · DealBridge",
  },
  description,
  openGraph: {
    title: "DealBridge — The AI-matched deal marketplace",
    description,
    url: siteUrl,
    siteName: "DealBridge",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "DealBridge — The AI-matched deal marketplace",
    description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
          DealBridge — connecting customers and businesses, powered by AI matching.
        </footer>
      </body>
    </html>
  );
}

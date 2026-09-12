import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import Nav from "@/components/Nav";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-body",
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              <span className="font-[family-name:var(--font-display)] text-base font-semibold text-stone-900">
                DealBridge
              </span>{" "}
              — real businesses, honest reviews, AI-matched deals.
            </p>
            <nav className="flex gap-5">
              <Link href="/how-it-works" className="hover:text-stone-900">
                How it works
              </Link>
              <Link href="/businesses" className="hover:text-stone-900">
                Directory
              </Link>
              <Link href="/signup" className="hover:text-stone-900">
                Sign up
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}

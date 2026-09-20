import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Comparison } from "@/components/marketing/comparison";
import { ArrowIcon } from "@/components/icons";
import { VERSUS } from "@/lib/versus";

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Lobby against an AI voice receptionist, a human answering service, a website chatbot and hiring someone — " +
    "including the cases where you should buy one of those instead.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNav />

      <section className="border-b border-ink-800 py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Against the things you&apos;re actually choosing between.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-mist-300">
            Including the cases where you should buy something else. We&apos;d rather you knew now than churned in
            month two.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Comparison />
        </div>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight">One at a time, in detail</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {VERSUS.map((item) => (
              <Link
                key={item.slug}
                href={`/vs/${item.slug}`}
                className="card group p-5 transition hover:border-ink-600"
              >
                <h3 className="flex items-center justify-between font-semibold">
                  {item.name}
                  <ArrowIcon
                    width={16}
                    height={16}
                    className="text-mist-400 transition group-hover:translate-x-0.5 group-hover:text-jade-400"
                  />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">{item.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

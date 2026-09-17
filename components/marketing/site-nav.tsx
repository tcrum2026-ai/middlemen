"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui";

const LINKS = [
  { href: "/tour", label: "Tour" },
  { href: "/templates", label: "Starter packs" },
  { href: "/#math", label: "The math" },
  { href: "/#compare", label: "Compare" },
  { href: "/security", label: "Security" },
  { href: "/#pricing", label: "Pricing" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3.5">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <div className="ml-4 hidden items-center gap-6 text-sm text-mist-400 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} className="transition hover:text-mist-100" href={link.href}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard" className="btn btn-ghost hidden sm:inline-flex">
            Dashboard
          </Link>
          <Link href="/connect" className="btn btn-primary">
            Start free
          </Link>
          <button
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="btn btn-ghost px-2.5 md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-ink-800 px-5 py-3 md:hidden">
          <div className="flex flex-col">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-mist-300 transition hover:bg-ink-850 hover:text-mist-100"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2.5 text-sm text-mist-300 transition hover:bg-ink-850 hover:text-mist-100"
            >
              Dashboard
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

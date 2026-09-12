"use client";

import { useState } from "react";

export default function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="hidden items-center gap-4 sm:flex">{children}</div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 sm:hidden"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 top-12 z-20 flex w-56 flex-col items-stretch gap-1 rounded-lg border border-slate-200 bg-white p-3 shadow-lg sm:hidden [&_a]:px-2 [&_a]:py-2 [&_form]:px-2 [&_form_button]:w-full"
        >
          {children}
        </div>
      )}
    </div>
  );
}

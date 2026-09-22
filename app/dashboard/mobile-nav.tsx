"use client";

import { useEffect, useState } from "react";
import { DashboardNav, type NavCounts } from "./nav";

export function MobileNav({ counts }: { counts: NavCounts }) {
  const [open, setOpen] = useState(false);
  const pending = counts.inbox + counts.calls + counts.approvals + counts.gaps;

  // The drawer sits over the page, so the page behind it shouldn't scroll.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="btn btn-ghost relative px-2.5 lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        {pending > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-jade-500 px-1 text-[10px] font-semibold text-ink-950">
            {pending}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fade-in absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
          />
          <div className="slide-in-left absolute left-0 top-0 h-full w-64 overflow-y-auto border-r border-ink-800 bg-ink-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-mist-400 hover:text-mist-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <DashboardNav counts={counts} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

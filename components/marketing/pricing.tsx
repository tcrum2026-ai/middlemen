"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui";
import { PLANS } from "@/lib/marketing";

/** Annual billing bills ten months for twelve — the discount is stated, not implied. */
const ANNUAL_MONTHS_CHARGED = 10;

/**
 * `contactEmail` arrives as a prop rather than being read from the environment
 * here. NEXT_PUBLIC_* values are inlined into the client bundle at build time
 * but read at runtime on the server, so a deployment whose build and runtime
 * see different values hydrates with two different buttons.
 */
export function Pricing({ contactEmail = "" }: { contactEmail?: string }) {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3">
        <span className={`text-sm ${annual ? "text-mist-400" : "text-mist-100"}`}>Monthly</span>
        <button
          role="switch"
          aria-checked={annual}
          aria-label="Bill annually"
          onClick={() => setAnnual((value) => !value)}
          className={`relative h-6 w-11 rounded-full border transition ${
            annual ? "border-jade-500 bg-jade-500/30" : "border-ink-700 bg-ink-850"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-mist-100 transition-all ${
              annual ? "left-[1.4rem]" : "left-0.5"
            }`}
            style={{ height: "1.125rem", width: "1.125rem" }}
          />
        </button>
        <span className={`text-sm ${annual ? "text-mist-100" : "text-mist-400"}`}>
          Annual <span className="text-jade-400">— two months free</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const monthly = plan.monthly;
          const shown = monthly === null ? null : annual ? (monthly * ANNUAL_MONTHS_CHARGED) / 12 : monthly;
          return (
            <div
              key={plan.name}
              className={`card flex flex-col p-6 ${plan.featured ? "border-jade-500/40 bg-jade-500/[0.04]" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.featured ? <Badge tone="jade">Most popular</Badge> : null}
              </div>

              {shown === null ? (
                <p className="mt-3 text-3xl font-semibold">Talk to us</p>
              ) : (
                <>
                  <p className="mt-3 text-3xl font-semibold tabular-nums">
                    ${Math.round(shown)}
                    <span className="text-base font-normal text-mist-400">/mo</span>
                  </p>
                  <p className="mt-1 h-4 text-xs text-jade-400">
                    {annual ? `Billed $${monthly! * ANNUAL_MONTHS_CHARGED} yearly` : ""}
                  </p>
                </>
              )}

              {plan.meter ? (
                <p className="mt-2 text-xs text-mist-400">{plan.meter}</p>
              ) : null}
              <p className="mt-3 text-sm text-mist-400">{plan.blurb}</p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm text-mist-300">
                    <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-jade-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* "Contact sales" is only offered when there is an address behind it;
                  otherwise the quoted tier starts the same way as the others. */}
              {shown === null && contactEmail ? (
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent("Lobby — " + plan.name + " plan")}`}
                  className={`btn mt-6 ${plan.featured ? "btn-primary" : "btn-ghost"} justify-center`}
                >
                  Contact sales
                </a>
              ) : (
                <Link
                  href="/signup"
                  className={`btn mt-6 ${plan.featured ? "btn-primary" : "btn-ghost"} justify-center`}
                >
                  Start free
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="card mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 p-4 text-sm text-mist-400">
        <span>14 days free, no card</span>
        <span>Cancel in one click</span>
        <span>Export your data any time</span>
        <span>A conversation is one customer thread, not one message</span>
        <span>Call minutes are rounded to the second, not the minute</span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface Beat {
  actor: "customer" | "assistant" | "tool" | "human";
  time: string;
  title: string;
  detail: string;
  /** What the step read from, or wrote to, the business's own records. */
  records: { kind: "read" | "write"; label: string }[];
}

const BEATS: Beat[] = [
  {
    actor: "customer",
    time: "9:47pm",
    title: "A message arrives",
    detail:
      "“Water heater is leaking from the bottom. Do I need a new one and how fast can someone come out?” — web chat, " +
      "two hours after you closed.",
    records: [{ kind: "write", label: "Thread opened · web chat" }],
  },
  {
    actor: "tool",
    time: "9:47pm",
    title: "Reads your knowledge base",
    detail:
      "Pulls your Services & pricing and Booking policy articles. It now knows the diagnostic is $89, waived on " +
      "same-day repair, and that replacements run $1,400–$2,600 installed.",
    records: [
      { kind: "read", label: "Services and pricing" },
      { kind: "read", label: "Booking and cancellation policy" },
    ],
  },
  {
    actor: "tool",
    time: "9:47pm",
    title: "Checks your real calendar",
    detail:
      "Finds two open two-hour windows tomorrow inside your working hours. Not a generic “someone will be in touch” —" +
      " actual slots you can staff.",
    records: [
      { kind: "read", label: "Calendar · tomorrow 8–10am free" },
      { kind: "read", label: "Calendar · tomorrow 12–2pm free" },
    ],
  },
  {
    actor: "assistant",
    time: "9:47pm",
    title: "Answers with the price and the options",
    detail:
      "Explains that a leak at the base usually means the tank has failed, quotes your range, offers 8–10am or 12–2pm, " +
      "and tells her to shut the cold supply valve in the meantime.",
    records: [{ kind: "write", label: "Reply sent · 41 seconds after the message" }],
  },
  {
    actor: "tool",
    time: "9:49pm",
    title: "Books it and files the lead",
    detail:
      "Creates the appointment with arrival notes for the tech, sends the confirmation, and files a scored lead — 92, " +
      "$2,100 estimated — into your pipeline.",
    records: [
      { kind: "write", label: "Appointment · tomorrow 12–2pm" },
      { kind: "write", label: "Lead · score 92 · $2,100" },
      { kind: "write", label: "Confirmation email sent" },
    ],
  },
  {
    actor: "human",
    time: "9:50pm",
    title: "Hands you the one thing it won't do",
    detail:
      "She mentions it's now spraying. That's a voice call, so the assistant queues one for your team with a written " +
      "brief — including that she has not been quoted a replacement price yet, so nobody contradicts anybody.",
    records: [
      { kind: "write", label: "Callback queued · urgent" },
      { kind: "write", label: "Brief written for whoever calls" },
    ],
  },
];

const ACTOR_STYLE: Record<Beat["actor"], { dot: string; label: string }> = {
  customer: { dot: "bg-mist-400", label: "Customer" },
  assistant: { dot: "bg-jade-500", label: "Assistant" },
  tool: { dot: "bg-iris", label: "Tool call" },
  human: { dot: "bg-amber-glow", label: "Your team" },
};

export function Mechanism() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Only animate once the section is actually on screen.
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setPlaying(true),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      setActive((current) => (current + 1) % BEATS.length);
    }, 3200);
    return () => clearTimeout(timer);
  }, [playing, active]);

  const beat = BEATS[active];

  return (
    <div ref={container} className="grid grid-cols-1 gap-5 lg:grid-cols-[20rem_1fr]">
      <ol className="space-y-1">
        {BEATS.map((item, index) => {
          const style = ACTOR_STYLE[item.actor];
          const isActive = index === active;
          return (
            <li key={item.title}>
              <button
                onClick={() => {
                  setPlaying(false);
                  setActive(index);
                }}
                className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                  isActive
                    ? "border-ink-600 bg-ink-850"
                    : "border-transparent hover:border-ink-700 hover:bg-ink-850/50"
                }`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                <span className="min-w-0">
                  <span className={`block text-sm ${isActive ? "font-medium text-mist-100" : "text-mist-300"}`}>
                    {item.title}
                  </span>
                  <span className="text-xs text-mist-400">
                    {style.label} · {item.time}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card flex flex-col p-6">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${ACTOR_STYLE[beat.actor].dot}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-mist-400">
            {ACTOR_STYLE[beat.actor].label}
          </span>
          <span className="ml-auto font-mono text-xs text-mist-400">
            {String(active + 1).padStart(2, "0")} / {String(BEATS.length).padStart(2, "0")}
          </span>
        </div>

        <div key={active} className="fade-in">
          <h3 className="mt-4 text-xl font-semibold tracking-tight">{beat.title}</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-mist-300">{beat.detail}</p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {beat.records.map((record) => (
              <li
                key={record.label}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                  record.kind === "write"
                    ? "border-jade-500/30 bg-jade-500/[0.07] text-jade-300"
                    : "border-ink-700 bg-ink-850 text-mist-300"
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                  {record.kind === "write" ? "wrote" : "read"}
                </span>
                {record.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-6">
          <div className="flex gap-1.5">
            {BEATS.map((item, index) => (
              <span
                key={item.title}
                className={`h-1 flex-1 rounded-full transition ${index <= active ? "bg-jade-500" : "bg-ink-700"}`}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-mist-400">
            Elapsed: about three minutes, at ten to ten at night. Your morning starts with a booked job, a scored
            lead, and one call worth making.
          </p>
        </div>
      </div>
    </div>
  );
}

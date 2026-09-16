"use client";

import { useMemo, useState } from "react";

function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-mist-300">
          {label}
        </label>
        <span className="font-mono text-sm tabular-nums text-jade-400">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-jade-500"
      />
      {hint ? <p className="mt-1 text-xs text-mist-400">{hint}</p> : null}
    </div>
  );
}

/**
 * Deliberately built on the visitor's own numbers rather than industry
 * averages: the output is their arithmetic, not a vendor claim.
 */
export function RoiCalculator({ planPrice = 149 }: { planPrice?: number }) {
  const [enquiries, setEnquiries] = useState(40);
  const [missedPct, setMissedPct] = useState(25);
  const [closePct, setClosePct] = useState(30);
  const [jobValue, setJobValue] = useState(450);

  const result = useMemo(() => {
    const weeksPerMonth = 4.33;
    const missedPerMonth = enquiries * weeksPerMonth * (missedPct / 100);
    const wonPerMonth = missedPerMonth * (closePct / 100);
    const recovered = wonPerMonth * jobValue;
    const minutesPerReply = 4;
    const hoursSaved = (enquiries * weeksPerMonth * minutesPerReply) / 60;
    const net = recovered - planPrice;
    const breakEvenJobs = jobValue > 0 ? planPrice / jobValue : 0;

    return { missedPerMonth, wonPerMonth, recovered, hoursSaved, net, breakEvenJobs };
  }, [enquiries, missedPct, closePct, jobValue, planPrice]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="card space-y-6 p-6">
        <Slider
          id="roi-enquiries"
          label="Inbound enquiries a week"
          value={enquiries}
          min={5}
          max={300}
          step={5}
          onChange={setEnquiries}
          format={(v) => `${v}`}
          hint="Calls, forms, texts, DMs — everything that wants an answer."
        />
        <Slider
          id="roi-missed"
          label="Share that goes unanswered or answered late"
          value={missedPct}
          min={0}
          max={80}
          step={5}
          onChange={setMissedPct}
          format={(v) => `${v}%`}
          hint="After hours, mid-job, on another line, or lost in the pile."
        />
        <Slider
          id="roi-close"
          label="Your close rate on enquiries you do answer"
          value={closePct}
          min={5}
          max={90}
          step={5}
          onChange={setClosePct}
          format={(v) => `${v}%`}
          hint="Only your own rate is applied to recovered enquiries."
        />
        <Slider
          id="roi-value"
          label="Average value of a job or customer"
          value={jobValue}
          min={50}
          max={5000}
          step={50}
          onChange={setJobValue}
          format={money}
        />

        <p className="rounded-lg border border-ink-700 bg-ink-950 p-3.5 text-xs leading-relaxed text-mist-400">
          Nothing here counts the enquiries you already handle well. The figure on the right is only the ones that
          currently go unanswered, answered too late, or lost in a pile — at the close rate you already achieve.
        </p>
      </div>

      <div className="card flex flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-mist-400">Your numbers, monthly</p>

        <p className="mt-3 text-4xl font-semibold tabular-nums text-jade-400">{money(result.recovered)}</p>
        <p className="mt-1 text-sm text-mist-300">
          recovered from the{" "}
          <span className="text-mist-100">{Math.round(result.missedPerMonth)} enquiries</span> you currently don&apos;t
          get to, at your own close rate.
        </p>

        <dl className="mt-6 space-y-3 border-t border-ink-800 pt-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-mist-400">Jobs won that you&apos;d otherwise miss</dt>
            <dd className="tabular-nums">{Math.round(result.wonPerMonth)}/mo</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mist-400">Hours back from replying</dt>
            <dd className="tabular-nums">{Math.round(result.hoursSaved)}h/mo</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mist-400">Middlemen (Team plan)</dt>
            <dd className="tabular-nums">−{money(planPrice)}/mo</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-ink-800 pt-3 font-semibold">
            <dt>Net</dt>
            <dd className={`tabular-nums ${result.net >= 0 ? "text-jade-400" : "text-rose-alert"}`}>
              {result.net >= 0 ? "+" : "−"}
              {money(Math.abs(result.net))}/mo
            </dd>
          </div>
        </dl>

        <p className="mt-5 rounded-lg border border-ink-700 bg-ink-950 p-3.5 text-xs leading-relaxed text-mist-400">
          It pays for itself at{" "}
          <span className="text-mist-100">
            {result.breakEvenJobs < 1
              ? "less than one recovered job"
              : `${Math.ceil(result.breakEvenJobs)} recovered jobs`}
          </span>{" "}
          a month. This is your arithmetic, not our claim — we assume only that an instant, accurate reply converts
          at the same rate as the ones you already answer, and that every enquiry you currently miss is one you
          would have wanted.
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-jade-500 text-ink-950">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 17V9M12 17V5M19 17v-5" />
        </svg>
      </span>
      Middlemen
    </span>
  );
}

const TONES = {
  jade: "border-jade-500/30 bg-jade-500/10 text-jade-300",
  amber: "border-amber-glow/30 bg-amber-glow/10 text-amber-glow",
  rose: "border-rose-alert/30 bg-rose-alert/10 text-rose-alert",
  iris: "border-iris/30 bg-iris/10 text-iris",
  slate: "border-ink-700 bg-ink-850 text-mist-400",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-mist-400">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  const accent =
    tone === "jade" ? "text-jade-400" : tone === "amber" ? "text-amber-glow" : tone === "rose" ? "text-rose-alert" : "text-mist-100";
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-mist-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-mist-400">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-mist-400">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  return (
    <Link href={href} className={`btn ${variant === "primary" ? "btn-primary" : "btn-ghost"} ${className}`}>
      {children}
    </Link>
  );
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

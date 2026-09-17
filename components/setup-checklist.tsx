import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import type { SetupStep } from "@/lib/repo";

export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;

  const next = steps.find((step) => !step.done);

  return (
    <section className="card mb-6 !p-0">
      <div className="flex flex-wrap items-center gap-4 border-b border-ink-700 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Finish setting up</h2>
          <p className="text-sm text-mist-400">
            {done} of {steps.length} done
            {next ? ` — next: ${next.title.toLowerCase()}` : ""}
          </p>
        </div>
        <div className="flex w-40 shrink-0 items-center gap-2">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
            <span
              className="block h-full rounded-full bg-jade-500 transition-all"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </span>
          <span className="text-xs tabular-nums text-mist-400">
            {Math.round((done / steps.length) * 100)}%
          </span>
        </div>
      </div>

      <ul className="divide-y divide-ink-800">
        {steps.map((step) => (
          <li key={step.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                step.done ? "border-jade-500 bg-jade-500 text-ink-950" : "border-ink-700 text-ink-600"
              }`}
            >
              {step.done ? <CheckIcon width={13} height={13} /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${step.done ? "text-mist-400 line-through" : ""}`}>{step.title}</p>
              {!step.done ? <p className="text-xs text-mist-400">{step.body}</p> : null}
            </div>
            {!step.done ? (
              <Link href={step.href} className="btn btn-ghost px-3 py-1.5 text-xs">
                {step.cta}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from "next/link";

/**
 * What a visitor to a public demo needs to know before they judge anything:
 * the data resets, and nothing here can spend money or reach a real customer.
 *
 * Stated up front rather than discovered. Someone who adds a knowledge
 * article, comes back tomorrow and finds it gone should have been told.
 */
export function DemoBanner({
  ephemeral,
  spendOff,
}: {
  ephemeral: boolean;
  spendOff: string[];
}) {
  return (
    <div className="border-b border-jade-500/25 bg-jade-500/[0.06]">
      <div className="mx-auto flex max-w-[92rem] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-sm sm:px-5">
        <span className="font-medium text-jade-400">Demo workspace</span>
        <span className="text-mist-300">
          Change anything you like.
          {ephemeral ? " It resets when the server restarts." : ""} Nothing here can charge a card, send a
          message or place a call — {spendOff.length} paid service{spendOff.length === 1 ? " is" : "s are"} switched
          off.
        </span>
        <Link href="/api/health" className="link-quiet ml-auto text-xs">
          See for yourself
        </Link>
      </div>
    </div>
  );
}

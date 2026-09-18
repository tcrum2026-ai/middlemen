import { COMPARISON } from "@/lib/marketing";

const COLUMNS = [
  { key: "lobby", label: "Lobby", accent: true },
  { key: "voiceAi", label: "AI voice receptionist", accent: false },
  { key: "answering", label: "Answering service", accent: false },
  { key: "chatbot", label: "Website chatbot", accent: false },
  { key: "nothing", label: "Doing nothing", accent: false },
] as const;

function cellTone(value: string, accent: boolean): string {
  if (value === "yes") return accent ? "text-jade-400 font-medium" : "text-mist-300";
  if (value === "no" || value === "rarely") return "text-mist-400";
  if (value === "by design, no") return "text-amber-glow";
  return accent ? "text-mist-100" : "text-mist-400";
}

export function Comparison() {
  return (
    <div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-56 px-4 py-3 text-left font-medium text-mist-400">&nbsp;</th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left font-semibold ${
                    column.accent ? "text-jade-400" : "text-mist-300"
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.label} className="border-t border-ink-800">
                <th scope="row" className="px-4 py-3 text-left font-normal text-mist-300">
                  {row.label}
                </th>
                {COLUMNS.map((column) => (
                  <td key={column.key} className={`px-4 py-3 ${cellTone(row[column.key], column.accent)}`}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt-4 border-amber-glow/25 bg-amber-glow/[0.04] p-5">
        <h3 className="font-semibold">When we&apos;re the wrong answer</h3>
        <p className="mt-2 text-sm leading-relaxed text-mist-300">
          If the thing keeping you up at night is a ringing phone nobody picks up, buy an AI voice receptionist or a
          human answering service — that is their job and it isn&apos;t ours. Lobby is for the businesses drowning
          in <em>messages</em>: the after-hours form fills, the “how much for…” texts, the reschedules, the quote
          chases. Running an answering service for voice alongside Lobby for everything else is a perfectly good
          setup — and the briefs we hand your team make those calls shorter too.
        </p>
      </div>

      <p className="mt-3 text-xs text-mist-400">
        Cost row reflects typical published list prices for each category in 2026, not quotes. Check current pricing
        before you decide — ours is on this page.
      </p>
    </div>
  );
}

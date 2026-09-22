"use client";

import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import { SendIcon, SparkIcon } from "@/components/icons";
import type { AssistantAction } from "@/lib/types";

interface Turn {
  role: "customer" | "assistant";
  body: string;
  actions?: AssistantAction[];
  escalated?: boolean;
}

interface SuiteResult {
  question: string;
  expects: string;
  reply: string;
  actions: AssistantAction[];
  escalated: boolean;
  verdict: "answered" | "escalated" | "no-knowledge";
}

const VERDICT = {
  answered: { tone: "jade", label: "Answered from your knowledge" },
  escalated: { tone: "amber", label: "Escalated to a person" },
  "no-knowledge": { tone: "rose", label: "Nothing to answer from" },
} as const;

export function PlaygroundClient({
  assistantName,
  suggestions,
}: {
  assistantName: string;
  suggestions: string[];
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [suite, setSuite] = useState<SuiteResult[] | null>(null);
  const [suiteRunning, setSuiteRunning] = useState(false);

  async function ask(text: string) {
    const body = text.trim();
    if (!body || busy) return;
    setDraft("");
    const history = turns.map((turn) => ({ role: turn.role, body: turn.body }));
    setTurns((prev) => [...prev, { role: "customer", body }]);
    setBusy(true);
    try {
      const response = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "single", message: body, history }),
      });
      const data = await response.json();
      setTurns((prev) => [
        ...prev,
        { role: "assistant", body: data.reply, actions: data.actions, escalated: data.escalated },
      ]);
    } catch {
      setTurns((prev) => [...prev, { role: "assistant", body: "The test run failed to reach the assistant." }]);
    } finally {
      setBusy(false);
    }
  }

  async function runSuite() {
    setSuiteRunning(true);
    setSuite(null);
    try {
      const response = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "suite" }),
      });
      const data = await response.json();
      setSuite(data.results ?? []);
    } catch {
      setSuite([]);
    } finally {
      setSuiteRunning(false);
    }
  }

  const score = suite
    ? Math.round((suite.filter((r) => r.verdict !== "no-knowledge").length / Math.max(suite.length, 1)) * 100)
    : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
      <Card className="flex flex-col !p-0">
        <div className="flex items-center gap-2 border-b border-ink-700 px-5 py-3">
          <SparkIcon width={16} height={16} className="text-jade-400" />
          <h2 className="text-sm font-semibold">Ask {assistantName} anything</h2>
          <span className="ml-auto text-xs text-mist-400">nothing here is saved</span>
        </div>

        <div className="min-h-[22rem] flex-1 space-y-4 p-5">
          {turns.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-mist-400">
                Try the questions your customers actually ask. Every answer is generated exactly as it would be
                live — but the calendar, the pipeline and the call queue are left untouched.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => ask(suggestion)}
                    className="rounded-full border border-ink-700 px-3 py-1.5 text-xs text-mist-300 transition hover:border-jade-500/50 hover:text-mist-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((turn, index) => (
              <div key={index} className={turn.role === "customer" ? "flex justify-end" : "flex justify-start"}>
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      turn.role === "customer"
                        ? "bg-jade-500 text-ink-950"
                        : "border border-ink-700 bg-ink-850 text-mist-100"
                    }`}
                  >
                    {turn.body}
                  </div>
                  {turn.actions?.length ? (
                    <ul className="space-y-1">
                      {turn.actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-mist-400">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-iris" />
                          <span>
                            <span className="text-mist-300">{action.label}</span>
                            {action.detail ? ` — ${action.detail}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {turn.escalated ? <Badge tone="amber">would reach a person</Badge> : null}
                </div>
              </div>
            ))
          )}
          {busy ? <p className="text-sm text-mist-400">Thinking…</p> : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
          className="flex items-center gap-2 border-t border-ink-700 p-3"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a question a customer would ask…"
            className="field"
            aria-label="Test message"
          />
          <button type="submit" disabled={busy || !draft.trim()} className="btn btn-primary disabled:opacity-40">
            <SendIcon width={16} height={16} />
            <span className="sr-only">Ask</span>
          </button>
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <h2 className="text-sm font-semibold">Readiness check</h2>
          <p className="mt-1 text-xs text-mist-400">
            Runs the eight questions every business gets asked and tells you which ones you have no answer for.
          </p>
          <button onClick={runSuite} disabled={suiteRunning} className="btn btn-primary mt-4 w-full justify-center disabled:opacity-40">
            {suiteRunning ? "Running…" : "Run the check"}
          </button>

          {score !== null ? (
            <div className="mt-4 rounded-lg border border-ink-700 bg-ink-950 p-4 text-center">
              <p className="text-3xl font-semibold tabular-nums text-jade-400">{score}%</p>
              <p className="mt-1 text-xs text-mist-400">
                handled without a gap — {suite!.filter((r) => r.verdict === "no-knowledge").length} question
                {suite!.filter((r) => r.verdict === "no-knowledge").length === 1 ? "" : "s"} need an article
              </p>
            </div>
          ) : null}
        </Card>

        {suite?.map((result) => {
          const meta = VERDICT[result.verdict];
          return (
            <Card key={result.question} className="!p-4">
              <p className="text-sm font-medium">{result.question}</p>
              <div className="mt-2">
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-mist-400">{result.reply}</p>
              <p className="mt-2 text-[11px] text-mist-400">Expected: {result.expects}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

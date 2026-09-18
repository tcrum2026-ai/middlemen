"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";

interface Status {
  configured: boolean;
  ok: boolean;
  status?: number;
  hint?: string;
  model?: { id: string; display_name: string };
  baseUrl?: string;
}

export function ConnectionTest({ initiallyConfigured }: { initiallyConfigured: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  async function test() {
    setBusy(true);
    try {
      const response = await fetch("/api/assistant-status");
      if (response.status === 401) {
        setStatus({ configured: true, ok: false, hint: "Sign in to run this check — the demo workspace can't." });
        return;
      }
      if (response.status === 429) {
        setStatus({ configured: true, ok: false, hint: "Checked too often just now. Try again in a minute." });
        return;
      }
      setStatus((await response.json()) as Status);
    } catch {
      setStatus({ configured: true, ok: false, hint: "The check itself failed to run." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">Assistant connection</h2>
        {status ? (
          <Badge tone={status.ok ? "jade" : status.configured ? "rose" : "amber"}>
            {status.ok ? "connected" : status.configured ? "key rejected" : "no key set"}
          </Badge>
        ) : (
          <Badge tone={initiallyConfigured ? "slate" : "amber"}>
            {initiallyConfigured ? "key present, untested" : "scripted mode"}
          </Badge>
        )}
      </div>

      <p className="mt-1 text-sm text-mist-400">
        Checks credentials against the Claude API without generating anything, so it costs nothing to run.
      </p>

      {status ? (
        <div className="mt-3 rounded-lg border border-ink-700 bg-ink-950 p-3.5 text-sm">
          {status.ok ? (
            <p className="text-mist-300">
              Talking to <span className="text-jade-400">{status.model?.display_name ?? status.model?.id}</span>
              {status.baseUrl ? (
                <>
                  {" via "}
                  <span className="font-mono text-xs">{status.baseUrl}</span>
                </>
              ) : null}
              . Replies are live.
            </p>
          ) : (
            <p className="text-mist-300">
              {status.status ? <span className="font-mono text-xs text-rose-alert">{status.status} · </span> : null}
              {status.hint}
            </p>
          )}
        </div>
      ) : null}

      <button onClick={test} disabled={busy} className="btn btn-ghost mt-4 disabled:opacity-40">
        {busy ? "Checking…" : "Test connection"}
      </button>

      {!initiallyConfigured ? (
        <div className="mt-4 rounded-lg border border-ink-700 bg-ink-950 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-mist-400">Turning on live replies</p>
          <ol className="mt-2 space-y-1.5 text-sm text-mist-300">
            <li>1. Create a key at console.anthropic.com → API keys.</li>
            <li>2. Add credit under Billing — API usage is prepaid and separate from a Claude subscription.</li>
            <li>
              3. Put it in <code className="font-mono text-xs">.env.local</code> as{" "}
              <code className="font-mono text-xs">ANTHROPIC_API_KEY=sk-ant-…</code> and restart.
            </li>
          </ol>
          <p className="mt-2 text-xs text-mist-400">
            Until then the assistant runs its scripted fallback: every screen works, but replies are written, not
            generated.
          </p>
        </div>
      ) : null}
    </div>
  );
}

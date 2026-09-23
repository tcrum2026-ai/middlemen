"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendTestAction, type ConnectResult } from "@/app/dashboard/actions";
import { ResultNote } from "@/components/integration-form";

const LABELS: Record<string, { button: string; pending: string }> = {
  resend: { button: "Send me a test email", pending: "Sending…" },
  twilio: { button: "Text me a test", pending: "Sending…" },
  slack: { button: "Post a test message", pending: "Posting…" },
};

function SendButton({ provider }: { provider: string }) {
  const { pending } = useFormStatus();
  const label = LABELS[provider];
  return (
    <button type="submit" disabled={pending} className="btn btn-ghost shrink-0 px-3 py-1.5 text-xs disabled:opacity-60">
      {pending ? label.pending : label.button}
    </button>
  );
}

/**
 * A real message through the provider the owner just connected. A green
 * "connected" badge proves the key was accepted; this proves a customer
 * would actually receive something.
 */
export function TestSend({
  provider,
  ownerEmail,
  defaultPhone,
}: {
  provider: "resend" | "twilio" | "slack";
  ownerEmail?: string | null;
  defaultPhone?: string | null;
}) {
  const [result, action] = useActionState<ConnectResult | null, FormData>(sendTestAction, null);
  const [phone, setPhone] = useState(defaultPhone ?? "");

  return (
    <form action={action} className="space-y-2.5 border-t border-ink-700 pt-4">
      <input type="hidden" name="provider" value={provider} />
      <p className="text-xs font-semibold uppercase tracking-wider text-mist-400">Check it works</p>
      <div className="flex flex-wrap items-center gap-2">
        {provider === "twilio" ? (
          <>
            <label htmlFor="test-sms-to" className="sr-only">
              Mobile number to text
            </label>
            <input
              id="test-sms-to"
              name="to"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+1 555 123 4567"
              autoComplete="tel"
              className="field !w-auto min-w-0 flex-1 font-mono text-xs"
            />
          </>
        ) : null}
        <SendButton provider={provider} />
        {provider === "resend" && ownerEmail ? (
          <span className="text-xs text-mist-400">to {ownerEmail}</span>
        ) : null}
      </div>
      {result ? <ResultNote result={result} /> : null}
    </form>
  );
}

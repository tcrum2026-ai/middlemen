"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { connectIntegrationAction, disconnectIntegrationAction, type ConnectResult } from "@/app/dashboard/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { CheckIcon } from "@/components/icons";

interface Field {
  name: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
}

function ConnectButton({ connected }: { connected: boolean }) {
  const { pending, data } = useFormStatus();
  // Pending is form-wide; only say "Checking…" when this button started it.
  const checking = pending && data?.get("intent") !== "disconnect";
  return (
    <button type="submit" disabled={pending} className="btn btn-primary px-3 py-1.5 text-xs disabled:opacity-60">
      {checking ? "Checking…" : connected ? "Update" : "Connect"}
    </button>
  );
}

export function ResultNote({ result }: { result: ConnectResult }) {
  return (
    <div
      role={result.ok ? "status" : "alert"}
      className={`fade-in rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
        result.ok ? "border-jade-500/30 bg-jade-500/[0.06] text-mist-200" : "border-rose-alert/30 bg-rose-alert/10 text-mist-200"
      }`}
    >
      <p className="flex gap-1.5">
        {result.ok ? <CheckIcon width={14} height={14} className="mt-px shrink-0 text-jade-400" /> : null}
        <span className={result.ok ? "" : "text-rose-alert"}>{result.message}</span>
      </p>
      {result.notes.length > 0 ? (
        <ul className="mt-1.5 space-y-1 text-mist-300">
          {result.notes.map((note) => (
            <li key={note} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mist-400" />
              <span className="min-w-0 break-words">{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The key-paste form for one provider. Nothing is saved until the provider
 * itself accepts the credentials, and the verdict shows up right here — not
 * a "connected" badge that only means something was typed.
 */
export function IntegrationForm({
  providerId,
  fields,
  saved,
  connected,
  docs,
}: {
  providerId: string;
  fields: Field[];
  saved: Record<string, string>;
  connected: boolean;
  docs?: string;
}) {
  const [result, action] = useActionState<ConnectResult | null, FormData>(connectIntegrationAction, null);
  // Controlled, because a form action resets uncontrolled fields when it
  // settles — a rejected key would otherwise vanish along with the error.
  const initial = () => Object.fromEntries(fields.map((f) => [f.name, saved[f.name] ?? ""]));
  const [values, setValues] = useState<Record<string, string>>(initial);

  // When what's stored changes — a save went through, or a disconnect wiped
  // it — show that, not what was typed: the number as Twilio formats it, and
  // secrets masked again. A refused attempt changes nothing stored, so the
  // pasted values stay put for fixing.
  const storedKey = JSON.stringify(saved);
  const [seenStored, setSeenStored] = useState(storedKey);
  if (storedKey !== seenStored) {
    setSeenStored(storedKey);
    setValues(initial());
  }

  // A success message from before a disconnect no longer describes anything.
  const showResult = result && (!result.ok || connected);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="provider" value={providerId} />
      {fields.map((field) => (
        <div key={field.name}>
          <label className="label" htmlFor={`${providerId}-${field.name}`}>
            {field.label}
          </label>
          <input
            id={`${providerId}-${field.name}`}
            name={field.name}
            type={field.secret ? "password" : "text"}
            value={values[field.name] ?? ""}
            onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
            onFocus={(event) => {
              // Tapping into a masked secret should start a fresh paste, not append to the dots.
              if (field.secret && event.target.value.startsWith("••")) setValues((prev) => ({ ...prev, [field.name]: "" }));
            }}
            onBlur={(event) => {
              // Left empty after focusing a saved secret: put the mask back so "Update" keeps it.
              if (field.secret && !event.target.value && saved[field.name]) {
                setValues((prev) => ({ ...prev, [field.name]: saved[field.name] }));
              }
            }}
            placeholder={field.placeholder}
            autoComplete="off"
            spellCheck={false}
            className="field font-mono text-xs"
          />
        </div>
      ))}

      {showResult ? <ResultNote result={result} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <ConnectButton connected={connected} />
        {connected ? (
          <ConfirmButton
            formAction={disconnectIntegrationAction}
            name="intent"
            value="disconnect"
            confirmLabel="Delete the key?"
            pendingLabel="Disconnecting…"
            className="btn btn-ghost px-3 py-1.5 text-xs"
          >
            Disconnect
          </ConfirmButton>
        ) : null}
        {docs ? <span className="text-xs text-mist-400">Key lives at {docs}</span> : null}
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { completeResetAction, type ResetState } from "@/app/reset-actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center disabled:opacity-50">
      {pending ? "Setting it…" : "Set the new password"}
    </button>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<ResetState | null, FormData>(completeResetAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="field"
        />
        <p className="mt-1.5 text-xs text-mist-400">
          Ten characters or more. Length beats punctuation — a short phrase is fine.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="confirm">
          Again, to be sure
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="field"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-lg border border-rose-alert/30 bg-rose-alert/10 px-3 py-2 text-sm text-rose-alert">
          {state.error}
        </p>
      ) : null}

      <Submit />

      <p className="text-center text-xs leading-relaxed text-mist-400">
        Setting a new password signs out every other device.{" "}
        <Link href="/forgot" className="text-mist-300 hover:text-mist-100">
          Need a fresh link?
        </Link>
      </p>
    </form>
  );
}

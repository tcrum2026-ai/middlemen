"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestResetAction, type ForgotState } from "@/app/reset-actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center disabled:opacity-50">
      {pending ? "Sending…" : "Email me a link"}
    </button>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<ForgotState | null, FormData>(requestResetAction, null);

  if (state?.sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-lg border border-jade-500/30 bg-jade-500/10 px-4 py-3 text-sm leading-relaxed text-mist-200">
          If that address has an account, a reset link is on its way. It works once, and expires in an hour.
        </p>
        <p className="text-sm text-mist-400">
          <Link href="/signin" className="link">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-lg border border-rose-alert/30 bg-rose-alert/10 px-3 py-2 text-sm text-rose-alert">
          {state.error}
        </p>
      ) : null}

      <Submit />

      <p className="text-center text-sm text-mist-400">
        Remembered it?{" "}
        <Link href="/signin" className="link">
          Sign in
        </Link>
      </p>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";

type State = { error?: string } | null;

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "signin" | "signup";
  action: (prev: State, data: FormData) => Promise<State>;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, null);
  const isSignUp = mode === "signup";

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {isSignUp ? (
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" name="name" required autoComplete="name" className="field" placeholder="Sam Rivera" />
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field"
          placeholder="you@yourbusiness.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isSignUp ? 10 : undefined}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="field"
          placeholder={isSignUp ? "At least 10 characters" : ""}
        />
        {isSignUp ? (
          <p className="mt-1.5 text-xs text-mist-400">
            Ten characters or more. Length beats punctuation — a short phrase is fine.
          </p>
        ) : null}
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-lg border border-rose-alert/30 bg-rose-alert/10 px-3 py-2 text-sm text-rose-alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center disabled:opacity-50">
        {pending ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
      </button>

      {isSignUp ? (
        <p className="text-center text-xs leading-relaxed text-mist-400">
          Creating an account accepts our{" "}
          <Link href="/terms" className="text-mist-300 underline underline-offset-2 hover:text-mist-100">terms</Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-mist-300 underline underline-offset-2 hover:text-mist-100">privacy policy</Link>.
        </p>
      ) : null}

      <p className="text-center text-sm text-mist-400">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/signin" className="text-jade-400 hover:underline">Sign in</Link>
          </>
        ) : (
          <>
            No account yet?{" "}
            <Link href="/signup" className="text-jade-400 hover:underline">Create one</Link>
          </>
        )}
      </p>
    </form>
  );
}

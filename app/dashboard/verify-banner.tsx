"use client";

import { useState, useTransition } from "react";
import { resendVerificationAction } from "./actions";

/**
 * Shown until the owner confirms their address, and only where this
 * deployment can actually send them a link.
 *
 * It says what is blocked and how to unblock it in the same sentence. A
 * banner that only says "unverified" leaves someone hunting for why their
 * assistant is quiet.
 */
export function VerifyBanner({ email, blocking }: { email: string; blocking: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="border-b border-amber-glow/25 bg-amber-glow/[0.06]">
      <div className="mx-auto flex max-w-[92rem] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-sm sm:px-5">
        <span className="text-mist-300">
          {blocking ? (
            <>
              <span className="font-medium text-amber-glow">Your assistant is not answering yet.</span> Confirm{" "}
              <span className="text-mist-100">{email}</span> and it starts — messages are captured for you until
              then.
            </>
          ) : (
            <>
              Confirm <span className="text-mist-100">{email}</span> so we can reach you about your account.
            </>
          )}
        </span>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resendVerificationAction();
              setMessage(result.message);
            })
          }
          className="btn btn-ghost ml-auto px-3 py-1.5 text-xs"
        >
          {pending ? "Sending…" : "Send it again"}
        </button>

        {message ? (
          <p role="status" className="w-full text-xs text-mist-400">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { createQuotePaymentLinkAction } from "../actions";

/**
 * Minting a link is a call to someone else's Stripe account, and it fails for
 * ordinary reasons — a revoked key, a restricted key, an account that can't
 * take payments yet. A button that just stops working tells you none of that,
 * so the refusal is shown where the click was.
 */
export function PaymentLinkButton({ quoteId }: { quoteId: string }) {
  const [state, action] = useActionState(createQuotePaymentLinkAction, null);

  return (
    <form action={action}>
      <input type="hidden" name="quote_id" value={quoteId} />
      <SubmitButton className="btn btn-ghost !px-3 !py-1.5 text-xs" pendingLabel="Asking Stripe…">
        Create payment link
      </SubmitButton>
      {state?.error ? (
        <p role="alert" className="mt-2 max-w-md text-xs text-amber-glow">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

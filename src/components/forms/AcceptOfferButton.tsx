"use client";

import { useActionState } from "react";
import { acceptOfferAction } from "@/lib/actions/deals";
import SubmitButton from "@/components/SubmitButton";

export default function AcceptOfferButton({ offerId }: { offerId: string }) {
  const [state, formAction] = useActionState(acceptOfferAction, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name="offerId" value={offerId} />
      {state?.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      <SubmitButton
        pendingText="Accepting..."
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        Accept this offer
      </SubmitButton>
    </form>
  );
}

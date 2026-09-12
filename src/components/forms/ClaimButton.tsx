"use client";

import { useActionState } from "react";
import { claimBusinessAction } from "@/lib/actions/business";
import SubmitButton from "@/components/SubmitButton";

export default function ClaimButton({ businessId }: { businessId: string }) {
  const [state, formAction] = useActionState(claimBusinessAction, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name="businessId" value={businessId} />
      {state?.error && <p className="mb-2 text-sm text-red-700">{state.error}</p>}
      <SubmitButton
        pendingText="Claiming..."
        className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
      >
        Claim this business
      </SubmitButton>
    </form>
  );
}

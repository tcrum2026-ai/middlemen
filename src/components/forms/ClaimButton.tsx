"use client";

import { useActionState } from "react";
import { claimBusinessAction } from "@/lib/actions/business";
import SubmitButton from "@/components/SubmitButton";

export default function ClaimButton({ businessId }: { businessId: string }) {
  const [state, formAction] = useActionState(claimBusinessAction, undefined);

  if (state?.message) {
    return <p className="text-sm text-emerald-700">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="businessId" value={businessId} />
      {state?.error && <p className="mb-2 text-sm text-red-700">{state.error}</p>}
      <textarea
        name="note"
        rows={2}
        placeholder="Optional: how can we verify this is your business? (e.g. a phone number or email on file)"
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
      />
      <SubmitButton
        pendingText="Claiming..."
        className="rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
      >
        Claim this business
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { reportDealIssueAction } from "@/lib/actions/deal-flags";
import SubmitButton from "@/components/SubmitButton";

export default function ReportIssueForm({ dealId }: { dealId: string }) {
  const [state, formAction] = useActionState(reportDealIssueAction, undefined);

  if (state?.message) {
    return <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="dealId" value={dealId} />
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <textarea
        name="reason"
        required
        rows={3}
        placeholder="What went wrong? An admin will review and follow up."
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
      />
      <SubmitButton
        pendingText="Submitting..."
        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        Submit report
      </SubmitButton>
    </form>
  );
}

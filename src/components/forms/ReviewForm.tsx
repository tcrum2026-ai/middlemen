"use client";

import { useActionState, useState } from "react";
import { submitReviewAction } from "@/lib/actions/reviews";
import SubmitButton from "@/components/SubmitButton";

export default function ReviewForm({ businessId, dealId }: { businessId: string; dealId?: string }) {
  const [state, formAction] = useActionState(submitReviewAction, undefined);
  const [rating, setRating] = useState(5);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="businessId" value={businessId} />
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      <input type="hidden" name="rating" value={rating} />

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <span className="block text-sm font-medium text-stone-700">Your rating</span>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className={`text-2xl leading-none ${n <= rating ? "text-amber-500" : "text-stone-300"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-stone-700">
          How did it go?
        </label>
        <textarea
          id="comment"
          name="comment"
          required
          rows={3}
          placeholder="Share details that would help other customers."
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
      </div>

      <SubmitButton pendingText="Submitting...">Post review</SubmitButton>
    </form>
  );
}

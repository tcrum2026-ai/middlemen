"use client";

import { useActionState } from "react";
import { createOfferAction } from "@/lib/actions/offers";
import SubmitButton from "@/components/SubmitButton";

export default function NewOfferForm({ requestId }: { requestId: string }) {
  const [state, formAction] = useActionState(createOfferAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-slate-700">
            Your price ($)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={1}
            step="1"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="deliveryDays" className="block text-sm font-medium text-slate-700">
            Delivery (days)
          </label>
          <input
            id="deliveryDays"
            name="deliveryDays"
            type="number"
            min={1}
            step="1"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Offer details
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          placeholder="Explain what's included, your approach, and why the customer should pick you."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <SubmitButton pendingText="Submitting...">Submit offer</SubmitButton>
    </form>
  );
}

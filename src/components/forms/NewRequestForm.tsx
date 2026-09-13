"use client";

import { useActionState } from "react";
import { createRequestAction } from "@/lib/actions/requests";
import type { ActionState } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import { CATEGORIES } from "@/lib/validation";

type Initial = {
  title: string;
  category: string;
  description: string;
  zipCode: string;
  budgetMin: number;
  budgetMax: number;
};

export default function NewRequestForm({
  action = createRequestAction,
  requestId,
  initial,
  submitLabel = "Post request",
  pendingText = "Posting...",
}: {
  action?: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  requestId?: string;
  initial?: Initial;
  submitLabel?: string;
  pendingText?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          placeholder="e.g. Repaint a 3-bedroom house exterior"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-stone-700">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={initial?.category ?? ""}
          className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 focus:border-stone-500 focus:outline-none"
        >
          <option value="" disabled>
            Select a category
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-stone-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          defaultValue={initial?.description}
          placeholder="Describe exactly what you need, timelines, and any requirements."
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="zipCode" className="block text-sm font-medium text-stone-700">
          ZIP code
        </label>
        <input
          id="zipCode"
          name="zipCode"
          type="text"
          required
          defaultValue={initial?.zipCode}
          placeholder="e.g. 94103"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-stone-500">
          We use this to match you with businesses that actually serve your area.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="budgetMin" className="block text-sm font-medium text-stone-700">
            Min budget ($)
          </label>
          <input
            id="budgetMin"
            name="budgetMin"
            type="number"
            min={0}
            step="1"
            required
            defaultValue={initial?.budgetMin}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="budgetMax" className="block text-sm font-medium text-stone-700">
            Max budget ($)
          </label>
          <input
            id="budgetMax"
            name="budgetMax"
            type="number"
            min={0}
            step="1"
            required
            defaultValue={initial?.budgetMax}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
          />
        </div>
      </div>

      <SubmitButton pendingText={pendingText}>{submitLabel}</SubmitButton>
    </form>
  );
}

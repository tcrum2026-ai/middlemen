"use client";

import { useActionState } from "react";
import { enqueueImportAction } from "@/lib/actions/import";
import SubmitButton from "@/components/SubmitButton";
import { CATEGORIES } from "@/lib/validation";

export default function EnqueueImportForm() {
  const [state, formAction] = useActionState(enqueueImportAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-stone-700">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
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
        <label htmlFor="zipCodes" className="block text-sm font-medium text-stone-700">
          ZIP codes
        </label>
        <textarea
          id="zipCodes"
          name="zipCodes"
          required
          rows={4}
          placeholder="94103, 10001, 60601, 90001 ..."
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-sm focus:border-stone-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-stone-500">
          Separate with commas, spaces, or newlines. Each ZIP + category pair queues one search.
        </p>
      </div>

      <SubmitButton pendingText="Queuing...">Add to import queue</SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createRequestAction } from "@/lib/actions/requests";
import SubmitButton from "@/components/SubmitButton";
import { CATEGORIES } from "@/lib/validation";

export default function NewRequestForm() {
  const [state, formAction] = useActionState(createRequestAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g. Repaint a 3-bedroom house exterior"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none"
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
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          placeholder="Describe exactly what you need, timelines, and any requirements."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="budgetMin" className="block text-sm font-medium text-slate-700">
            Min budget ($)
          </label>
          <input
            id="budgetMin"
            name="budgetMin"
            type="number"
            min={0}
            step="1"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="budgetMax" className="block text-sm font-medium text-slate-700">
            Max budget ($)
          </label>
          <input
            id="budgetMax"
            name="budgetMax"
            type="number"
            min={0}
            step="1"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <SubmitButton pendingText="Posting...">Post request</SubmitButton>
    </form>
  );
}

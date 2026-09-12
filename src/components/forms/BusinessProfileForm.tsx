"use client";

import { useActionState } from "react";
import { saveBusinessProfileAction } from "@/lib/actions/business";
import SubmitButton from "@/components/SubmitButton";
import { CATEGORIES } from "@/lib/validation";

export default function BusinessProfileForm({
  initial,
}: {
  initial?: { companyName: string; category: string; description: string };
}) {
  const [state, formAction] = useActionState(saveBusinessProfileAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
          Company name
        </label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          required
          defaultValue={initial?.companyName}
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
          defaultValue={initial?.category ?? ""}
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
          rows={4}
          defaultValue={initial?.description}
          placeholder="What does your business offer? What makes you a great choice?"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <SubmitButton pendingText="Saving...">Save profile</SubmitButton>
    </form>
  );
}

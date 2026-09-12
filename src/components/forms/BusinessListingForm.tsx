"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import { CATEGORIES } from "@/lib/validation";

type Initial = {
  companyName?: string;
  category?: string;
  description?: string;
  phone?: string;
  website?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

export default function BusinessListingForm({
  action,
  initial,
  submitLabel = "Save",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Initial;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-stone-700">
          Company name
        </label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          required
          defaultValue={initial?.companyName}
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
          rows={3}
          defaultValue={initial?.description}
          placeholder="What does this business offer?"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-stone-700">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initial?.phone}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-stone-700">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="text"
            placeholder="example.com"
            defaultValue={initial?.website}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="addressLine" className="block text-sm font-medium text-stone-700">
          Street address
        </label>
        <input
          id="addressLine"
          name="addressLine"
          type="text"
          defaultValue={initial?.addressLine}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-stone-700">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={initial?.city}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-stone-700">
            State
          </label>
          <input
            id="state"
            name="state"
            type="text"
            defaultValue={initial?.state}
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
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
          />
        </div>
      </div>

      <SubmitButton pendingText="Saving...">{submitLabel}</SubmitButton>
    </form>
  );
}

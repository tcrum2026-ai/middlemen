"use client";

import type { Business } from "@/lib/types";

export function BusinessSwitcher({
  businesses,
  current,
  action,
}: {
  businesses: Pick<Business, "id" | "name">[];
  current: string;
  action: (data: FormData) => void;
}) {
  return (
    <form action={action}>
      <select
        name="business_id"
        defaultValue={current}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-sm text-mist-100"
        aria-label="Active workspace"
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name}
          </option>
        ))}
      </select>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";

export default function ImportBusinessesForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <textarea
        name="json"
        required
        rows={6}
        placeholder="[{ &quot;companyName&quot;: ... }]"
        className="w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-xs focus:border-stone-500 focus:outline-none"
      />
      <SubmitButton pendingText="Importing...">Import businesses</SubmitButton>
    </form>
  );
}

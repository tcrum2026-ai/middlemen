"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/account";
import SubmitButton from "@/components/SubmitButton";

export default function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.message && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p>
      )}
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-stone-700">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-stone-700">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
      </div>
      <SubmitButton pendingText="Updating...">Update password</SubmitButton>
    </form>
  );
}

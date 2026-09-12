"use client";

import { useActionState, useState } from "react";
import { signupAction } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";

export default function SignupForm({ defaultRole }: { defaultRole: "CUSTOMER" | "BUSINESS" }) {
  const [state, formAction] = useActionState(signupAction, undefined);
  const [role, setRole] = useState<"CUSTOMER" | "BUSINESS">(defaultRole);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <span className="block text-sm font-medium text-slate-700">I am a...</span>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(["CUSTOMER", "BUSINESS"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                role === r
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r === "CUSTOMER" ? "Customer" : "Business"}
            </button>
          ))}
        </div>
        <input type="hidden" name="role" value={role} />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Full name / Company contact
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <SubmitButton pendingText="Creating account...">Create account</SubmitButton>
    </form>
  );
}

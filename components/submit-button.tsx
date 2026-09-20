"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * A submit button that says what it's doing. Server actions can take a second
 * or two — without this, a click looks like nothing happened and people click
 * again.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
  formAction,
  name,
  value,
  form,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  formAction?: (data: FormData) => void;
  name?: string;
  value?: string;
  form?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      formAction={formAction}
      name={name}
      value={value}
      form={form}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

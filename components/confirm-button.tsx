"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Two-step submit for anything that destroys data: the first click arms the
 * button, the second sends it. It disarms itself after a few seconds so a live
 * delete never sits waiting under the cursor.
 */
export function ConfirmButton({
  children,
  confirmLabel = "Sure?",
  className = "",
  name,
  value,
  formAction,
  pendingLabel = "Removing…",
}: {
  children: ReactNode;
  confirmLabel?: string;
  className?: string;
  name?: string;
  value?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      onClick={(event) => {
        if (armed) return;
        event.preventDefault();
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), 4000);
      }}
      className={`${className} ${armed ? "!text-rose-alert" : ""} disabled:opacity-50`}
    >
      <span aria-live="polite">{pending ? pendingLabel : armed ? confirmLabel : children}</span>
    </button>
  );
}

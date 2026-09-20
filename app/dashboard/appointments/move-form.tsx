"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { moveAppointmentAction } from "../actions";

/**
 * A move can be refused — something else is booked, or the owner's own
 * calendar is busy. Refusing quietly looks like a broken button, so the
 * reason appears next to the control that was pressed.
 */
export function MoveForm({
  appointmentId,
  title,
  defaultValue,
}: {
  appointmentId: string;
  title: string;
  defaultValue: string;
}) {
  const [state, action] = useActionState(moveAppointmentAction, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <label className="sr-only" htmlFor={`move-${appointmentId}`}>
        New time for {title}
      </label>
      <input
        id={`move-${appointmentId}`}
        type="datetime-local"
        name="starts_at"
        defaultValue={defaultValue}
        className="field !w-auto !py-1.5 text-xs"
      />
      <SubmitButton className="btn btn-ghost px-2.5 py-1.5 text-xs" pendingLabel="Moving…">
        Move
      </SubmitButton>
      {state?.error ? (
        <p role="alert" className="w-full text-xs text-amber-glow">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

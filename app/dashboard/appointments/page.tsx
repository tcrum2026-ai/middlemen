import { Badge, Card, EmptyState, PageHeader, formatDateTime } from "@/components/ui";
import { setAppointmentStatusAction } from "../actions";
import { MoveForm } from "./move-form";
import { activeBusiness } from "@/lib/session";
import { getContact, listAppointments } from "@/lib/repo";

/** What a datetime-local field wants: the operator's own clock, no zone. */
function localInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_TONE = { scheduled: "jade", confirmed: "jade", completed: "slate", cancelled: "rose" } as const;

export default async function AppointmentsPage() {
  const business = await activeBusiness();
  const appointments = listAppointments(business.id);
  const upcoming = appointments.filter((a) => new Date(a.starts_at).getTime() >= Date.now() - 3_600_000);
  const past = appointments.filter((a) => new Date(a.starts_at).getTime() < Date.now() - 3_600_000).reverse();

  const groups = new Map<string, typeof upcoming>();
  for (const appointment of upcoming) {
    const key = new Date(appointment.starts_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    groups.set(key, [...(groups.get(key) ?? []), appointment]);
  }

  return (
    <div>
      <PageHeader
        title="Schedule"
        subtitle={`Booked straight from conversations, inside your working hours. ${business.assistant_name} never double-books.`}
      />

      {upcoming.length === 0 ? (
        <EmptyState title="Nothing on the books" body="Bookings made in chat, email or SMS show up here instantly." />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([day, items]) => (
            <div key={day}>
              <h2 className="mb-2 text-sm font-semibold text-mist-400">{day}</h2>
              <Card className="!p-0">
                <ul className="divide-y divide-ink-800">
                  {items.map((appointment) => {
                    const contact = appointment.contact_id ? getContact(appointment.contact_id) : null;
                    return (
                      <li key={appointment.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                        <div className="w-24 shrink-0">
                          <p className="font-mono text-sm">
                            {new Date(appointment.starts_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-xs text-mist-400">{appointment.duration_min} min</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{appointment.title}</p>
                          <p className="text-xs text-mist-400">
                            {appointment.location}
                            {contact?.phone ? ` · ${contact.phone}` : ""}
                          </p>
                          {appointment.notes ? (
                            <p className="mt-1 text-xs leading-relaxed text-mist-400">{appointment.notes}</p>
                          ) : null}
                        </div>
                        <Badge tone={STATUS_TONE[appointment.status]}>{appointment.status}</Badge>
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={setAppointmentStatusAction} className="flex gap-2">
                            <input type="hidden" name="appointment_id" value={appointment.id} />
                            <button name="status" value="confirmed" className="btn btn-ghost px-2.5 py-1.5 text-xs">
                              Confirm
                            </button>
                            <button name="status" value="cancelled" className="btn btn-ghost px-2.5 py-1.5 text-xs">
                              Cancel
                            </button>
                          </form>
                          {appointment.status !== "cancelled" && appointment.status !== "completed" ? (
                            <MoveForm
                              appointmentId={appointment.id}
                              title={appointment.title}
                              defaultValue={localInput(appointment.starts_at)}
                            />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-mist-400">Past</h2>
          <Card className="!p-0">
            <ul className="divide-y divide-ink-800">
              {past.map((appointment) => (
                <li key={appointment.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{appointment.title}</span>
                  <span className="text-xs text-mist-400">{formatDateTime(appointment.starts_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </div>
  );
}

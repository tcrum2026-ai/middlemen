import { ensureSeeded } from "@/lib/seed";
import { getBusinessByWidgetKey, getContact, listAppointments } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function icsTime(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** RFC 5545 asks for CRLF and lines folded at 75 octets. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

/**
 * A subscribable calendar feed. Nothing to connect: paste the URL into Google
 * Calendar, Apple Calendar or Outlook and booked work shows up there.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  ensureSeeded();
  const { key } = await params;
  const business = getBusinessByWidgetKey(key.replace(/\.ics$/, ""));
  if (!business) return new Response("Unknown calendar", { status: 404 });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lobby//Assistant//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(business.name)} — booked work`,
    "X-PUBLISHED-TTL:PT15M",
  ];

  for (const appointment of listAppointments(business.id)) {
    if (appointment.status === "cancelled") continue;
    const contact = appointment.contact_id ? getContact(appointment.contact_id) : null;
    const end = new Date(new Date(appointment.starts_at).getTime() + appointment.duration_min * 60_000);
    const description = [appointment.notes, contact?.phone && `Phone: ${contact.phone}`, contact?.email]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${appointment.id}@lobby`,
      `DTSTAMP:${icsTime(appointment.created_at)}`,
      `DTSTART:${icsTime(appointment.starts_at)}`,
      `DTEND:${icsTime(end.toISOString())}`,
      fold(`SUMMARY:${escapeText(appointment.title)}`),
      fold(`LOCATION:${escapeText(appointment.location)}`),
      ...(description ? [fold(`DESCRIPTION:${escapeText(description)}`)] : []),
      `STATUS:${appointment.status === "completed" ? "CONFIRMED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

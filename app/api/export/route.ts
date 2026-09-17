import { ensureSeeded } from "@/lib/seed";
import { activeBusiness } from "@/lib/session";
import {
  contactTimeline,
  listAppointments,
  listApprovals,
  listCallRequests,
  listContacts,
  listConversations,
  listFollowUps,
  listKb,
  listKbGaps,
  listLeads,
  listMessages,
  listQuotes,
} from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null | undefined>;

function csv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

function download(body: string, filename: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Backs the promise on the security page: everything in a workspace comes out
 * in a format you can open, in one request, without asking anyone.
 */
export async function GET(request: Request) {
  ensureSeeded();
  const business = await activeBusiness();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "all";
  const stamp = new Date().toISOString().slice(0, 10);
  const prefix = `${business.slug}-${stamp}`;

  switch (type) {
    case "contacts": {
      const rows: Row[] = listContacts(business.id).map((contact) => ({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        first_seen: contact.created_at,
        interactions: contactTimeline(business.id, contact.id).length,
      }));
      return download(csv(rows), `${prefix}-contacts.csv`, "text/csv; charset=utf-8");
    }

    case "leads": {
      const contacts = new Map(listContacts(business.id).map((c) => [c.id, c]));
      const rows: Row[] = listLeads(business.id).map((lead) => ({
        contact: lead.contact_id ? (contacts.get(lead.contact_id)?.name ?? "") : "",
        email: lead.contact_id ? (contacts.get(lead.contact_id)?.email ?? "") : "",
        intent: lead.intent,
        stage: lead.stage,
        score: lead.score,
        value_usd: (lead.value_cents / 100).toFixed(2),
        source: lead.source,
        created_at: lead.created_at,
      }));
      return download(csv(rows), `${prefix}-leads.csv`, "text/csv; charset=utf-8");
    }

    case "appointments": {
      const contacts = new Map(listContacts(business.id).map((c) => [c.id, c]));
      const rows: Row[] = listAppointments(business.id).map((appointment) => ({
        title: appointment.title,
        contact: appointment.contact_id ? (contacts.get(appointment.contact_id)?.name ?? "") : "",
        starts_at: appointment.starts_at,
        duration_min: appointment.duration_min,
        status: appointment.status,
        location: appointment.location,
        notes: appointment.notes,
      }));
      return download(csv(rows), `${prefix}-appointments.csv`, "text/csv; charset=utf-8");
    }

    case "conversations": {
      const contacts = new Map(listContacts(business.id).map((c) => [c.id, c]));
      const rows: Row[] = [];
      for (const conversation of listConversations(business.id)) {
        for (const message of listMessages(conversation.id)) {
          rows.push({
            thread: conversation.subject,
            channel: conversation.channel,
            contact: conversation.contact_id ? (contacts.get(conversation.contact_id)?.name ?? "") : "",
            author: message.role,
            body: message.body,
            tools_used: message.actions.map((action) => action.tool).join(" | "),
            sent_at: message.created_at,
          });
        }
      }
      return download(csv(rows), `${prefix}-conversations.csv`, "text/csv; charset=utf-8");
    }

    case "knowledge": {
      const rows: Row[] = listKb(business.id).map((article) => ({
        title: article.title,
        body: article.body,
        source: article.source,
        updated_at: article.updated_at,
      }));
      return download(csv(rows), `${prefix}-knowledge.csv`, "text/csv; charset=utf-8");
    }

    case "calls": {
      const contacts = new Map(listContacts(business.id).map((c) => [c.id, c]));
      const rows: Row[] = listCallRequests(business.id).map((call) => ({
        contact: call.contact_id ? (contacts.get(call.contact_id)?.name ?? "") : "",
        phone: call.contact_id ? (contacts.get(call.contact_id)?.phone ?? "") : "",
        reason: call.reason,
        urgency: call.urgency,
        status: call.status,
        brief: call.brief,
        outcome: call.outcome,
        queued_at: call.created_at,
      }));
      return download(csv(rows), `${prefix}-calls.csv`, "text/csv; charset=utf-8");
    }

    default: {
      const everything = {
        exported_at: new Date().toISOString(),
        business,
        knowledge: listKb(business.id),
        knowledge_gaps: listKbGaps(business.id),
        contacts: listContacts(business.id),
        conversations: listConversations(business.id).map((conversation) => ({
          ...conversation,
          messages: listMessages(conversation.id),
        })),
        appointments: listAppointments(business.id),
        leads: listLeads(business.id),
        quotes: listQuotes(business.id),
        approvals: listApprovals(business.id),
        call_requests: listCallRequests(business.id),
        follow_ups: listFollowUps(business.id),
      };
      return download(
        JSON.stringify(everything, null, 2),
        `${prefix}-workspace.json`,
        "application/json; charset=utf-8",
      );
    }
  }
}

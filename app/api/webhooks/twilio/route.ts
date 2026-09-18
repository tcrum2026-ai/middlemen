import { createHmac, timingSafeEqual } from "node:crypto";
import { ensureSeeded } from "@/lib/seed";
import { runAssistantTurn } from "@/lib/assistant";
import { credentials } from "@/lib/integrations";
import {
  addMessage,
  createConversation,
  listBusinesses,
  listConversations,
  listMessages,
  upsertContact,
  updateConversation,
} from "@/lib/repo";
import type { Business } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio signs each request with the full URL plus the sorted POST body.
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
function signatureValid(url: string, params: Record<string, string>, authToken: string, signature: string): boolean {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(Buffer.from(payload, "utf8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Finds the workspace whose Twilio number received the message. */
function businessForNumber(to: string): Business | null {
  for (const business of listBusinesses()) {
    const creds = credentials(business.id, "twilio");
    if (creds?.from_number && creds.from_number.replace(/\D/g, "") === to.replace(/\D/g, "")) {
      return business;
    }
  }
  return null;
}

function twiml(body: string): Response {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`,
    { headers: { "Content-Type": "text/xml; charset=utf-8" } },
  );
}

export async function POST(request: Request) {
  ensureSeeded();

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  const from = params.From ?? "";
  const to = params.To ?? "";
  const body = (params.Body ?? "").trim();
  if (!from || !to || !body) return new Response("Missing fields", { status: 400 });

  const business = businessForNumber(to);
  if (!business) return new Response("No workspace for that number", { status: 404 });

  const creds = credentials(business.id, "twilio");
  const signature = request.headers.get("x-twilio-signature");
  if (!creds?.auth_token) return new Response("Not configured", { status: 503 });
  if (!signature || !signatureValid(request.url, params, creds.auth_token, signature)) {
    return new Response("Bad signature", { status: 403 });
  }

  const contact = upsertContact(business.id, { name: from, phone: from });
  const existing = listConversations(business.id).find(
    (c) => c.channel === "sms" && c.contact_id === contact.id && c.status !== "closed",
  );
  const conversation =
    existing ??
    createConversation({
      business_id: business.id,
      contact_id: contact.id,
      channel: "sms",
      subject: body.slice(0, 60),
    });
  if (!existing) updateConversation(conversation.id, { contact_id: contact.id });

  addMessage({ conversation_id: conversation.id, role: "customer", body });

  const turn = await runAssistantTurn({
    business,
    conversation,
    history: listMessages(conversation.id),
  });
  addMessage({
    conversation_id: conversation.id,
    role: "assistant",
    body: turn.reply,
    actions: turn.actions,
  });

  return twiml(turn.reply);
}

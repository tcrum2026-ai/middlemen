import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeeded } from "@/lib/seed";
import { runAssistantTurn } from "@/lib/assistant";
import { sendEmail } from "@/lib/delivery";
import {
  addMessage,
  createConversation,
  listBusinesses,
  listConversations,
  listMessages,
  upsertContact,
} from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shapes vary by provider; these are the fields they all carry in some form. */
const Body = z.object({
  to: z.string().min(3),
  from: z.string().min(3),
  subject: z.string().default("(no subject)"),
  text: z.string().min(1).max(20_000),
});

function addressName(address: string): string {
  const match = /<([^>]+)>/.exec(address);
  const email = (match?.[1] ?? address).trim();
  const named = /^([^<]+)</.exec(address)?.[1]?.trim().replace(/^"|"$/g, "");
  return named || email.split("@")[0].replace(/[._]/g, " ");
}

function emailAddress(address: string): string {
  const match = /<([^>]+)>/.exec(address);
  return (match?.[1] ?? address).trim().toLowerCase();
}

/** Inbound mail is addressed to <slug>@inbound.<your domain>. */
function businessForRecipient(to: string): ReturnType<typeof listBusinesses>[number] | null {
  const local = emailAddress(to).split("@")[0];
  return listBusinesses().find((b) => b.slug === local) ?? null;
}

export async function POST(request: Request) {
  ensureSeeded();

  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && request.headers.get("x-inbound-secret") !== secret) {
    return NextResponse.json({ error: "Bad secret" }, { status: 403 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { to, from, subject, text } = parsed.data;

  const business = businessForRecipient(to);
  if (!business) return NextResponse.json({ error: "No workspace for that address" }, { status: 404 });

  const contact = upsertContact(business.id, { name: addressName(from), email: emailAddress(from) });
  const existing = listConversations(business.id).find(
    (c) => c.channel === "email" && c.contact_id === contact.id && c.status !== "closed",
  );
  const conversation =
    existing ??
    createConversation({
      business_id: business.id,
      contact_id: contact.id,
      channel: "email",
      subject: subject.slice(0, 80),
    });

  addMessage({ conversation_id: conversation.id, role: "customer", body: text });

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

  const delivery = await sendEmail({
    businessId: business.id,
    to: emailAddress(from),
    subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
    body: turn.reply,
  });

  return NextResponse.json({
    conversationId: conversation.id,
    replied: delivery.status === "sent",
    delivery: delivery.status,
    detail: delivery.detail,
  });
}

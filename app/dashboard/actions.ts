"use server";

import { revalidatePath } from "next/cache";
import { QUOTAS, rateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import {
  addKbArticle,
  belongsToBusiness,
  getContact,
  listFollowUps,
  getApproval,
  addMessage,
  addTeammate,
  listKb,
  removeTeammate,
  setFollowUpStatus,
  setKbGapStatus,
  syncFollowUps,
  updateAutomationRule,
  deleteKbArticle,
  listMessages,
  logEvent,
  resolveApproval,
  setAppointmentStatus,
  setIntegrationStatus,
  setLeadStage,
  getAppointment,
  getQuote,
  listAppointments,
  moveAppointment,
  setQuotePaymentUrl,
  setQuoteStatus,
  updateBusiness,
  updateCallRequest,
  updateConversation,
  getConversation,
} from "@/lib/repo";
import { runAssistantTurn } from "@/lib/assistant";
import {
  BUSINESS_COOKIE,
  businessOwnedBy,
  requireWritableBusiness,
  workspace,
} from "@/lib/session";
import { verificationAvailable } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/verify-mail";
import { getTemplate } from "@/lib/templates";
import { createPaymentLink, sendEmail, sendSms } from "@/lib/delivery";
import { disconnect, saveCredentials } from "@/lib/integrations";
import { busyFromFeed, forgetFeed } from "@/lib/calendar-feed";
import { overlapsBusy } from "@/lib/ical";
import { deliverFollowUp } from "@/lib/scheduler";
import type {
  Appointment,
  AssistantAction,
  Approval,
  AutomationKind,
  Business,
  CallRequest,
  Conversation,
  Lead,
  Quote,
} from "@/lib/types";

function str(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Every mutation goes through here. The public demo is browsable by anyone, so
 * "read-only" has to be enforced on the server, not just hidden in the UI.
 */
async function writableBusiness() {
  return requireWritableBusiness();
}

export async function switchBusinessAction(data: FormData) {
  const businessId = str(data, "business_id");
  if (!businessId) return;

  const { user } = await workspace();
  if (!user || !businessOwnedBy(businessId, user.id)) return;

  const store = await cookies();
  store.set(BUSINESS_COOKIE, businessId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 31_536_000 });
  revalidatePath("/dashboard", "layout");
}

/* ----------------------------------------------------------------- inbox */

/**
 * Puts a reply in front of the customer, wherever they wrote from.
 *
 * Adding a row to the messages table is not replying. A visitor on the
 * hosted chat page will see it, but someone who emailed or texted will not —
 * their reply has to go back out on the channel it came in on. Follow-ups
 * already worked this way; the inbox and the approval queue did not, so a
 * teammate could answer an email and the customer would never hear from them.
 *
 * Returns what happened, so the caller can log the truth rather than "sent".
 */
async function deliverReply(
  business: Business,
  conversation: Conversation,
  body: string,
  actions?: AssistantAction[],
): Promise<string> {
  addMessage({ conversation_id: conversation.id, role: "agent", body, actions });

  const contact = conversation.contact_id ? getContact(conversation.contact_id) : null;

  if (conversation.channel === "email" && contact?.email) {
    const result = await sendEmail({
      businessId: business.id,
      to: contact.email,
      subject: conversation.subject || `A reply from ${business.name}`,
      body,
    });
    return result.status === "sent" ? "emailed" : `not emailed (${result.detail})`;
  }

  if ((conversation.channel === "sms" || conversation.channel === "whatsapp") && contact?.phone) {
    const result = await sendSms({ businessId: business.id, to: contact.phone, body });
    return result.status === "sent" ? "texted" : `not texted (${result.detail})`;
  }

  if (conversation.channel === "web" || conversation.channel === "voice") {
    // Nothing to send out: the visitor reads it in the thread they are in.
    return "posted to the thread";
  }

  return "posted to the thread — no contact details to send it to";
}

export async function sendHumanReplyAction(data: FormData) {
  const conversationId = str(data, "conversation_id");
  const body = str(data, "body");
  if (!conversationId || !body) return;

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("conversation", conversationId, business.id)) return;
  const conversation = getConversation(conversationId);
  if (!conversation) return;

  const outcome = await deliverReply(business, conversation, body);
  updateConversation(conversationId, { handled_by: "human", status: "open" });
  logEvent({
    business_id: business.id,
    kind: "reply_sent",
    summary: `Teammate replied in the shared inbox — ${outcome}`,
    handled_by: "human",
  });
  revalidatePath(`/dashboard/inbox/${conversationId}`);
  revalidatePath("/dashboard/inbox");
}

/** Hands the thread back to the assistant, which replies using its tools. */
export async function aiReplyAction(data: FormData) {
  const conversationId = str(data, "conversation_id");
  if (!conversationId) return;

  const business = await writableBusiness();
  if (!business) return;
  const conversation = getConversation(conversationId);
  if (!conversation || conversation.business_id !== business.id) return;

  // Authenticated, but still a model call per click.
  if (!rateLimit(`aireply:${business.id}`, QUOTAS.playgroundPerWorkspace).ok) return;

  const turn = await runAssistantTurn({
    business,
    conversation,
    history: listMessages(conversationId),
  });
  addMessage({
    conversation_id: conversationId,
    role: "assistant",
    body: turn.reply,
    actions: turn.actions,
  });
  updateConversation(conversationId, { handled_by: "ai" });
  revalidatePath(`/dashboard/inbox/${conversationId}`);
  revalidatePath("/dashboard/inbox");
}

export async function setConversationStatusAction(data: FormData) {
  const conversationId = str(data, "conversation_id");
  const status = str(data, "status") as "open" | "waiting" | "closed";
  if (!conversationId || !status) return;

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("conversation", conversationId, business.id)) return;
  updateConversation(conversationId, { status });
  revalidatePath(`/dashboard/inbox/${conversationId}`);
  revalidatePath("/dashboard/inbox");
}

/* ------------------------------------------------------------- approvals */

export async function resolveApprovalAction(data: FormData) {
  const approvalId = str(data, "approval_id");
  const status = str(data, "status") as Approval["status"];
  if (!approvalId || (status !== "approved" && status !== "rejected")) return;

  const business = await writableBusiness();
  if (!business) return;
  if (!belongsToBusiness("approval", approvalId, business.id)) return;

  const approval = getApproval(approvalId);
  resolveApproval(approvalId, status);

  /**
   * The button says "Approve & send", so it has to send.
   *
   * It used to set a status and log a line, which meant the whole promise of
   * the review queue — "nothing goes out until someone says yes" — had no
   * second half: after they said yes, still nothing went out, and the
   * customer waited for a reply that had already been approved.
   *
   * A teammate can edit the draft before approving, so what is sent is
   * whatever is in the box, not what the assistant first wrote.
   */
  let outcome = "";
  const edited = str(data, "draft");
  const body = edited || approval?.draft || "";

  if (status === "approved" && body && approval?.conversation_id) {
    const conversation = getConversation(approval.conversation_id);
    if (conversation && conversation.business_id === business.id) {
      outcome = ` — ${await deliverReply(business, conversation, body, [
        {
          tool: "approval",
          label: edited && edited !== approval?.draft ? "Edited and approved by a teammate" : "Approved by a teammate",
          detail: approval?.title ?? "",
        },
      ])}`;
      updateConversation(conversation.id, { status: "open", handled_by: "human" });
      revalidatePath(`/dashboard/inbox/${conversation.id}`);
      revalidatePath("/dashboard/inbox");
    }
  }

  logEvent({
    business_id: business.id,
    kind: "approval_resolved",
    summary: `Teammate ${status} an assistant draft${outcome}`,
    handled_by: "human",
  });
  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard");
}

/* ----------------------------------------------------------------- calls */

export async function updateCallAction(data: FormData) {
  const callId = str(data, "call_id");
  const status = str(data, "status") as CallRequest["status"];
  const outcome = str(data, "outcome");
  if (!callId) return;

  const business = await writableBusiness();
  if (!business) return;
  if (!belongsToBusiness("call", callId, business.id)) return;
  updateCallRequest(callId, {
    status: status || undefined,
    outcome: outcome || undefined,
    assigned_to: str(data, "assigned_to") || undefined,
  });
  if (status === "done") {
    logEvent({
      business_id: business.id,
      kind: "call_handled",
      summary: outcome ? `Call completed: ${outcome.slice(0, 80)}` : "Call completed",
      handled_by: "human",
    });
  }
  revalidatePath("/dashboard/calls");
  revalidatePath("/dashboard");
}

/* ---------------------------------------------------- leads & appointments */

export async function setLeadStageAction(data: FormData) {
  const leadId = str(data, "lead_id");
  const stage = str(data, "stage") as Lead["stage"];
  if (!leadId || !stage) return;

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("lead", leadId, business.id)) return;
  setLeadStage(leadId, stage);
  revalidatePath("/dashboard/leads");
}

/**
 * Moves an appointment from the dashboard.
 *
 * The assistant can reschedule; until now a person could only confirm or
 * cancel, so the one party who can see the whole week had to cancel and
 * rebook to change a time. Clashes are refused for the same reason the
 * assistant refuses them — a move on top of another booking is a
 * double-booking that is harder to spot.
 */
export async function moveAppointmentAction(
  _prev: { error?: string } | null,
  data: FormData,
): Promise<{ error?: string }> {
  const appointmentId = str(data, "appointment_id");
  const startsAt = str(data, "starts_at");
  if (!appointmentId || !startsAt) return { error: "Pick a new time first." };

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("appointment", appointmentId, business.id)) {
    return { error: "You can't change that appointment." };
  }

  const appointment = getAppointment(appointmentId);
  if (!appointment) return { error: "That appointment no longer exists." };

  // A datetime-local field has no timezone; it is the operator's own clock.
  const when = new Date(startsAt).getTime();
  if (!Number.isFinite(when)) return { error: "That is not a valid date and time." };

  const minutes = appointment.duration_min;
  const conflict = listAppointments(business.id).find(
    (a) =>
      a.id !== appointmentId &&
      a.status !== "cancelled" &&
      a.status !== "completed" &&
      when < new Date(a.starts_at).getTime() + a.duration_min * 60_000 &&
      when + minutes * 60_000 > new Date(a.starts_at).getTime(),
  );
  // Refusing quietly would look like a broken button, and the operator would
  // try again rather than find out what is in the way.
  if (conflict) return { error: `"${conflict.title}" is already booked then.` };

  if (overlapsBusy(when, when + minutes * 60_000, await busyFromFeed(business.id))) {
    return { error: "Your own calendar is not free then." };
  }

  moveAppointment(appointmentId, new Date(when).toISOString());
  logEvent({
    business_id: business.id,
    kind: "appointment_booked",
    summary: `Moved ${appointment.title} to ${new Date(when).toISOString()}`,
    handled_by: "human",
  });
  revalidatePath("/dashboard/appointments");
  return {};
}

export async function setQuoteStatusAction(data: FormData) {
  const quoteId = str(data, "quote_id");
  const status = str(data, "status") as Quote["status"];
  if (!quoteId || !["draft", "sent", "accepted", "declined"].includes(status)) return;

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("quote", quoteId, business.id)) return;
  setQuoteStatus(quoteId, status);
  revalidatePath("/dashboard/leads");
}

/**
 * Turns a quote into a Stripe payment link.
 *
 * The link is made once and kept: a second click would mint a second link for
 * the same job, and a customer holding two of them can pay twice.
 */
export async function createQuotePaymentLinkAction(
  _prev: { error?: string } | null,
  data: FormData,
): Promise<{ error?: string }> {
  const quoteId = str(data, "quote_id");
  if (!quoteId) return { error: "No quote given." };

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("quote", quoteId, business.id)) {
    return { error: "You can't change that quote." };
  }

  // Minting a link is a call to Stripe; bound it like any other outbound work.
  if (!rateLimit(`paylink:${business.id}`, QUOTAS.signUpPerIp).ok) {
    return { error: "Too many links created just now. Try again shortly." };
  }

  const quote = getQuote(quoteId);
  if (!quote) return { error: "That quote no longer exists." };
  if (quote.payment_url) return {};
  if (quote.total_cents <= 0) return { error: "A quote has to total more than zero to be paid." };

  const link = await createPaymentLink({
    businessId: business.id,
    description: quote.title,
    amountCents: quote.total_cents,
  });
  if ("error" in link) {
    console.error(`Payment link failed for ${quoteId}:`, link.error);
    // Stripe's own wording is the useful part here — unlike the platform key,
    // this is the customer's own Stripe account and their own mistake to fix.
    return { error: `Stripe refused: ${link.error}` };
  }

  setQuotePaymentUrl(quoteId, link.url);
  logEvent({
    business_id: business.id,
    kind: "quote_drafted",
    summary: `Payment link created for ${quote.title} (${usdPlain(quote.total_cents)})`,
  });
  revalidatePath("/dashboard/leads");
  return {};
}

/** Dollars for a log line, without pulling a UI helper into a server action. */
function usdPlain(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function setAppointmentStatusAction(data: FormData) {
  const appointmentId = str(data, "appointment_id");
  const status = str(data, "status") as Appointment["status"];
  if (!appointmentId || !status) return;

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("appointment", appointmentId, business.id)) return;
  setAppointmentStatus(appointmentId, status);
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");
}

/* ------------------------------------------------------------- knowledge */

export async function addKbAction(data: FormData) {
  const title = str(data, "title");
  const body = str(data, "body");
  if (!title || !body) return;
  const business = await writableBusiness();
  if (!business) return;
  addKbArticle(business.id, title, body);
  revalidatePath("/dashboard/knowledge");
}

export async function deleteKbAction(data: FormData) {
  const articleId = str(data, "article_id");
  if (!articleId) return;

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("kb", articleId, business.id)) return;
  deleteKbArticle(articleId);
  revalidatePath("/dashboard/knowledge");
}

/* ---------------------------------------------------------- integrations */

/* ---------------------------------------------------------- verification */

/**
 * Sends a fresh confirmation link to the signed-in user's own address.
 *
 * Rate-limited per account rather than per address, because the address is
 * not the attacker-controlled part here — the session is. Always reports the
 * same thing, so this cannot be used to work out whether mail is landing.
 */
export async function resendVerificationAction(): Promise<{ sent: boolean; message: string }> {
  const { user } = await workspace();
  if (!user) return { sent: false, message: "Sign in first." };
  if (user.email_verified_at) return { sent: true, message: "That address is already confirmed." };
  if (!verificationAvailable()) {
    return { sent: false, message: "This deployment cannot send email, so there is nothing to confirm." };
  }

  if (!rateLimit(`verify:${user.id}`, QUOTAS.signUpPerIp).ok) {
    return { sent: false, message: "A link was sent recently. Check your spam folder before asking again." };
  }

  const result = await sendVerificationEmail(user);
  return result.sent
    ? { sent: true, message: `Sent to ${user.email}. The link works for two days.` }
    : { sent: false, message: "Could not send it just now. Try again in a few minutes." };
}

/* -------------------------------------------------------------- settings */

export async function updateSettingsAction(data: FormData) {
  const business = await writableBusiness();
  if (!business) return;
  const hours: Record<string, string> = {};
  for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
    hours[day] = str(data, `hours_${day}`) || "closed";
  }

  updateBusiness(business.id, {
    name: str(data, "name") || business.name,
    industry: str(data, "industry") || business.industry,
    website: str(data, "website"),
    email: str(data, "email"),
    phone: str(data, "phone"),
    timezone: str(data, "timezone") || business.timezone,
    assistant_name: str(data, "assistant_name") || business.assistant_name,
    tone: str(data, "tone") || business.tone,
    greeting: str(data, "greeting") || business.greeting,
    autonomy: (str(data, "autonomy") || business.autonomy) as typeof business.autonomy,
    call_handoff_number: str(data, "call_handoff_number"),
    auto_send_threshold: Number(str(data, "auto_send_threshold") || business.auto_send_threshold),
    effort: (str(data, "effort") || business.effort) as typeof business.effort,
    model: (str(data, "model") === "claude-opus-5" ? "claude-opus-5" : "claude-sonnet-5") as typeof business.model,
    voice_enabled: str(data, "voice_enabled") === "on" ? 1 : 0,
    // The disclosure can be reworded but not emptied: a caller is always told.
    voice_disclosure:
      str(data, "voice_disclosure").trim() ||
      "Just so you know, you are speaking with an AI assistant.",
    voice_name: str(data, "voice_name") || business.voice_name,
    voice_greeting: str(data, "voice_greeting"),
    services: str(data, "services")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    hours,
  });
  revalidatePath("/dashboard", "layout");
}

/* ------------------------------------------------------------ knowledge gaps */

export async function answerGapAction(data: FormData) {
  const gapId = str(data, "gap_id");
  const title = str(data, "title");
  const body = str(data, "body");
  if (!gapId || !title || !body) return;

  const business = await writableBusiness();
  if (!business) return;
  if (!belongsToBusiness("gap", gapId, business.id)) return;
  addKbArticle(business.id, title, body, "gap-closed");
  setKbGapStatus(gapId, "answered");
  logEvent({
    business_id: business.id,
    kind: "knowledge_added",
    summary: `Closed a knowledge gap: ${title}`,
    handled_by: "human",
  });
  revalidatePath("/dashboard/gaps");
  revalidatePath("/dashboard/knowledge");
}

export async function setGapStatusAction(data: FormData) {
  const gapId = str(data, "gap_id");
  const status = str(data, "status") as "open" | "answered" | "dismissed";
  if (!gapId || !status) return;

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("gap", gapId, business.id)) return;
  setKbGapStatus(gapId, status);
  revalidatePath("/dashboard/gaps");
}

/* --------------------------------------------------------------- templates */

export async function applyTemplateAction(data: FormData) {
  const slug = str(data, "template");
  const template = getTemplate(slug);
  if (!template) return;

  const business = await writableBusiness();
  if (!business) return;
  const existing = new Set(listKb(business.id).map((article) => article.title.toLowerCase()));
  for (const article of template.articles) {
    if (existing.has(article.title.toLowerCase())) continue;
    addKbArticle(business.id, article.title, article.body, `template:${template.slug}`);
  }
  revalidatePath("/dashboard/knowledge");
}

/* -------------------------------------------------------------- automations */

export async function updateAutomationAction(data: FormData) {
  const kind = str(data, "kind") as AutomationKind;
  if (!kind) return;
  const business = await writableBusiness();
  if (!business) return;
  const delay = Number(str(data, "delay_hours"));

  updateAutomationRule(business.id, kind, {
    enabled: str(data, "enabled") === "on",
    delay_hours: Number.isFinite(delay) && delay > 0 ? delay : undefined,
    channel: (str(data, "channel") || undefined) as "sms" | "email" | undefined,
    template: str(data, "template") || undefined,
  });
  syncFollowUps(business.id);
  revalidatePath("/dashboard/automations");
}

export async function syncFollowUpsAction() {
  const business = await writableBusiness();
  if (!business) return;
  syncFollowUps(business.id);
  revalidatePath("/dashboard/automations");
}

export async function setFollowUpStatusAction(data: FormData) {
  const followUpId = str(data, "follow_up_id");
  const status = str(data, "status") as "scheduled" | "sent" | "cancelled";
  if (!followUpId || !status) return;

  const business = await writableBusiness();
  if (!business) return;
  if (!belongsToBusiness("follow_up", followUpId, business.id)) return;

  if (status === "sent") {
    const followUp = listFollowUps(business.id).find((f) => f.id === followUpId);
    // Same delivery path the ticker uses, so pressing Send by hand and
    // letting it go on its own cannot behave differently.
    const delivery = followUp
      ? await deliverFollowUp(business, followUp)
      : { ok: false, detail: "that follow-up no longer exists" };

    logEvent({
      business_id: business.id,
      kind: "follow_up_sent",
      summary: delivery.ok ? `Follow-up ${delivery.detail}` : `Follow-up not delivered — ${delivery.detail}`,
      minutes_saved: delivery.ok ? 5 : 0,
    });
  }

  setFollowUpStatus(followUpId, status);
  revalidatePath("/dashboard/automations");
}

/* -------------------------------------------------------------- integrations */

export async function saveIntegrationAction(data: FormData) {
  const provider = str(data, "provider");
  if (!provider) return;

  const business = await writableBusiness();
  if (!business) return;

  const values: Record<string, string> = {};
  for (const [key, value] of data.entries()) {
    if (key === "provider" || typeof value !== "string") continue;
    values[key] = value;
  }
  saveCredentials(business.id, provider, values);
  // Otherwise a corrected URL keeps serving the old calendar for five
  // minutes, which on this integration means five more minutes of the
  // double-bookings someone just tried to stop.
  if (provider === "calendar-feed") forgetFeed(business.id);
  revalidatePath("/dashboard/integrations");
}

export async function disconnectIntegrationAction(data: FormData) {
  const provider = str(data, "provider");
  if (!provider) return;

  const business = await writableBusiness();
  if (!business) return;
  disconnect(business.id, provider);
  if (provider === "calendar-feed") forgetFeed(business.id);
  setIntegrationStatus(business.id, provider, "disconnected");
  revalidatePath("/dashboard/integrations");
}

/* ---------------------------------------------------------------- teammates */

export async function addTeammateAction(data: FormData) {
  const name = str(data, "name");
  const email = str(data, "email");
  if (!name || !email) return;
  const business = await writableBusiness();
  if (!business) return;
  addTeammate({
    business_id: business.id,
    name,
    email,
    role: (str(data, "role") || "agent") as "owner" | "agent",
    takes_calls: str(data, "takes_calls") === "on",
  });
  revalidatePath("/dashboard/team");
}

export async function removeTeammateAction(data: FormData) {
  const teammateId = str(data, "teammate_id");
  if (!teammateId) return;

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("teammate", teammateId, business.id)) return;
  removeTeammate(teammateId);
  revalidatePath("/dashboard/team");
}

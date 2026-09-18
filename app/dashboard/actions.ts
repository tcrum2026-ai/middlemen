"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  addKbArticle,
  belongsToBusiness,
  getContact,
  listFollowUps,
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
import { getTemplate } from "@/lib/templates";
import { sendEmail, sendSms } from "@/lib/delivery";
import { disconnect, saveCredentials } from "@/lib/integrations";
import type { Appointment, Approval, AutomationKind, CallRequest, Lead } from "@/lib/types";

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

export async function sendHumanReplyAction(data: FormData) {
  const conversationId = str(data, "conversation_id");
  const body = str(data, "body");
  if (!conversationId || !body) return;

  const business = await writableBusiness();
  if (!business || !belongsToBusiness("conversation", conversationId, business.id)) return;
  addMessage({ conversation_id: conversationId, role: "agent", body });
  updateConversation(conversationId, { handled_by: "human", status: "open" });
  logEvent({
    business_id: business.id,
    kind: "reply_sent",
    summary: "Teammate replied in the shared inbox",
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
  resolveApproval(approvalId, status);
  logEvent({
    business_id: business.id,
    kind: "approval_resolved",
    summary: `Teammate ${status} an assistant draft`,
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

export async function toggleIntegrationAction(data: FormData) {
  const provider = str(data, "provider");
  const next = str(data, "next") as "connected" | "disconnected";
  if (!provider || !next) return;
  const business = await writableBusiness();
  if (!business) return;
  setIntegrationStatus(business.id, provider, next);
  revalidatePath("/dashboard/integrations");
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
    const contact = followUp?.contact_id ? getContact(followUp.contact_id) : null;

    // Actually send it when a provider is connected; the delivery log records
    // the outcome either way, so "sent" never means "we hope so".
    const delivery =
      followUp?.channel === "email" && contact?.email
        ? await sendEmail({
            businessId: business.id,
            to: contact.email,
            subject: `A note from ${business.name}`,
            body: followUp.body,
          })
        : followUp?.channel === "sms" && contact?.phone
          ? await sendSms({ businessId: business.id, to: contact.phone, body: followUp.body })
          : null;

    logEvent({
      business_id: business.id,
      kind: "follow_up_sent",
      summary:
        delivery?.status === "sent"
          ? `Follow-up sent by ${followUp?.channel}`
          : `Follow-up marked sent (${delivery?.detail ?? "no contact details"})`,
      minutes_saved: 5,
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
  revalidatePath("/dashboard/integrations");
}

export async function disconnectIntegrationAction(data: FormData) {
  const provider = str(data, "provider");
  if (!provider) return;

  const business = await writableBusiness();
  if (!business) return;
  disconnect(business.id, provider);
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

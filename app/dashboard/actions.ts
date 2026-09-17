"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  addKbArticle,
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
import { activeBusiness, BUSINESS_COOKIE } from "@/lib/session";
import { getTemplate } from "@/lib/templates";
import type { Appointment, Approval, AutomationKind, CallRequest, Lead } from "@/lib/types";

function str(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function switchBusinessAction(data: FormData) {
  const businessId = str(data, "business_id");
  if (!businessId) return;
  const store = await cookies();
  store.set(BUSINESS_COOKIE, businessId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 31_536_000 });
  revalidatePath("/dashboard", "layout");
}

/* ----------------------------------------------------------------- inbox */

export async function sendHumanReplyAction(data: FormData) {
  const conversationId = str(data, "conversation_id");
  const body = str(data, "body");
  if (!conversationId || !body) return;

  const business = await activeBusiness();
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

  const business = await activeBusiness();
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
  updateConversation(conversationId, { status });
  revalidatePath(`/dashboard/inbox/${conversationId}`);
  revalidatePath("/dashboard/inbox");
}

/* ------------------------------------------------------------- approvals */

export async function resolveApprovalAction(data: FormData) {
  const approvalId = str(data, "approval_id");
  const status = str(data, "status") as Approval["status"];
  if (!approvalId || (status !== "approved" && status !== "rejected")) return;

  const business = await activeBusiness();
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

  const business = await activeBusiness();
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
  setLeadStage(leadId, stage);
  revalidatePath("/dashboard/leads");
}

export async function setAppointmentStatusAction(data: FormData) {
  const appointmentId = str(data, "appointment_id");
  const status = str(data, "status") as Appointment["status"];
  if (!appointmentId || !status) return;
  setAppointmentStatus(appointmentId, status);
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");
}

/* ------------------------------------------------------------- knowledge */

export async function addKbAction(data: FormData) {
  const title = str(data, "title");
  const body = str(data, "body");
  if (!title || !body) return;
  const business = await activeBusiness();
  addKbArticle(business.id, title, body);
  revalidatePath("/dashboard/knowledge");
}

export async function deleteKbAction(data: FormData) {
  const articleId = str(data, "article_id");
  if (!articleId) return;
  deleteKbArticle(articleId);
  revalidatePath("/dashboard/knowledge");
}

/* ---------------------------------------------------------- integrations */

export async function toggleIntegrationAction(data: FormData) {
  const provider = str(data, "provider");
  const next = str(data, "next") as "connected" | "disconnected";
  if (!provider || !next) return;
  const business = await activeBusiness();
  setIntegrationStatus(business.id, provider, next);
  revalidatePath("/dashboard/integrations");
}

/* -------------------------------------------------------------- settings */

export async function updateSettingsAction(data: FormData) {
  const business = await activeBusiness();
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

  const business = await activeBusiness();
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
  setKbGapStatus(gapId, status);
  revalidatePath("/dashboard/gaps");
}

/* --------------------------------------------------------------- templates */

export async function applyTemplateAction(data: FormData) {
  const slug = str(data, "template");
  const template = getTemplate(slug);
  if (!template) return;

  const business = await activeBusiness();
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
  const business = await activeBusiness();
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
  const business = await activeBusiness();
  syncFollowUps(business.id);
  revalidatePath("/dashboard/automations");
}

export async function setFollowUpStatusAction(data: FormData) {
  const followUpId = str(data, "follow_up_id");
  const status = str(data, "status") as "scheduled" | "sent" | "cancelled";
  if (!followUpId || !status) return;

  const business = await activeBusiness();
  setFollowUpStatus(followUpId, status);
  if (status === "sent") {
    logEvent({
      business_id: business.id,
      kind: "follow_up_sent",
      summary: "Follow-up sent",
      minutes_saved: 5,
    });
  }
  revalidatePath("/dashboard/automations");
}

/* ---------------------------------------------------------------- teammates */

export async function addTeammateAction(data: FormData) {
  const name = str(data, "name");
  const email = str(data, "email");
  if (!name || !email) return;
  const business = await activeBusiness();
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
  removeTeammate(teammateId);
  revalidatePath("/dashboard/team");
}

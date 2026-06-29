import { leadPayloadSchema, type LeadPayloadInput } from "../schemas";
import type { Activity, CRMState, Lead, NotificationItem } from "../types";
import { assignLeadAgent } from "./leadAssignmentService";
import { triggerBridgeCall } from "./callService";
import { makeId, nowIso } from "./helpers";

export interface WebhookResult {
  state: CRMState;
  lead: Lead;
  summary: string;
}

export function ingestLeadWebhook(state: CRMState, payload: unknown): WebhookResult {
  const parsed = leadPayloadSchema.parse(payload) as LeadPayloadInput;
  const assignment = assignLeadAgent(state);
  const timestamp = nowIso();
  const lead: Lead = {
    id: makeId("lead"),
    organizationId: state.organization.id,
    fullName: parsed.fullName,
    phone: parsed.phone,
    email: parsed.email || "",
    source: parsed.source,
    propertyType: parsed.propertyType,
    budgetMin: parsed.budgetMin,
    budgetMax: parsed.budgetMax,
    preferredLocation: parsed.preferredLocation,
    status: "New",
    temperature: "Warm",
    assignedAgentId: assignment.agentId ?? "",
    notes: parsed.notes || "",
    nextFollowupAt: null,
    createdAt: timestamp,
    lastContactedAt: null,
  };

  const callAttempt = triggerBridgeCall({
    state,
    lead,
    preferredAgentId: assignment.agentId,
  });

  lead.assignedAgentId = callAttempt.assignedAgentId ?? lead.assignedAgentId;
  if (!callAttempt.assignedAgentId) {
    lead.status = "Call Pending";
  }

  const activity: Activity = {
    id: makeId("act"),
    organizationId: state.organization.id,
    leadId: lead.id,
    actorId: lead.assignedAgentId || "system",
    type: "lead_created",
    content: `Webhook lead created from ${lead.source}. ${callAttempt.notificationMessage}`,
    createdAt: timestamp,
  };

  const manager = state.profiles.find((profile) => profile.role === "sales_manager");
  const agentNotification: NotificationItem = {
    id: makeId("not"),
    organizationId: state.organization.id,
    userId: lead.assignedAgentId || manager?.id || state.profiles[0].id,
    title: "New lead assigned",
    body: `${lead.fullName} from ${lead.source} is assigned to you`,
    read: false,
    createdAt: timestamp,
  };

  const nextState: CRMState = {
    ...state,
    roundRobinCursor: assignment.nextCursor,
    leads: [lead, ...state.leads],
    calls: [callAttempt.callLog, ...state.calls],
    activities: [activity, ...state.activities],
    notifications: [agentNotification, ...state.notifications],
  };

  return {
    state: nextState,
    lead,
    summary: callAttempt.notificationMessage,
  };
}

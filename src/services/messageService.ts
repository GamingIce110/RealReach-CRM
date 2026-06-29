import type { CRMState, Lead, MessageLog, Profile } from "../types";
import { makeId, nowIso } from "./helpers";

type Channel = "WhatsApp" | "SMS";

export function sendFollowupMessage(
  state: CRMState,
  lead: Lead,
  agent: Profile,
  channel: Channel,
  template: string
): MessageLog {
  const content = template
    .replace(/\{\{leadName\}\}/g, lead.fullName)
    .replace(/\{\{preferredLocation\}\}/g, lead.preferredLocation);

  return {
    id: makeId("msg"),
    organizationId: state.organization.id,
    leadId: lead.id,
    agentId: agent.id,
    channel,
    templateName: "followup_template",
    content,
    status: "sent",
    createdAt: nowIso(),
  };
}
